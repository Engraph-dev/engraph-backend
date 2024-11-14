import { EventType } from "@prisma/client"
import { compare } from "bcryptjs"
import { sign } from "jsonwebtoken"

import { cookieOptions, createCuid } from "@/util/app"
import { getEventData, logEvent } from "@/util/app/events"
import { AUTH_COOKIE_NAME, JWT_SECRET } from "@/util/config/auth"
import { SESSION_VALIDITY_SECONDS } from "@/util/config/s3"
import db from "@/util/db"
import { StatusCodes } from "@/util/defs/engraph-backend/common"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type {
	CredentialsResponse,
	LoginCredentialsBody,
	LoginCredentialsParams,
} from "@/util/defs/engraph-backend/orgs/[orgId]/auth"
import type { SessionCookieContent } from "@/util/http"
import { requestHandler } from "@/util/http/helpers"

export const loginCredentials = requestHandler<
	LoginCredentialsParams,
	LoginCredentialsBody
>(async (req, res) => {
	const { orgId } = req.params
	const { userMail, userPassword } = req.body

	if (req.currentSession) {
		const { sessionId } = req.currentSession

		logEvent({
			...getEventData(req),
			eventType: EventType.SessionClose,
			eventMetadata: {},
		})

		await db.session.update({
			where: {
				sessionId: sessionId,
			},
			data: {
				sessionEndTimestamp: new Date(),
			},
		})
	}

	const userDoc = await db.user.findFirst({
		where: {
			userMail,
		},
	})

	if (!userDoc) {
		return res.status(StatusCodes.BAD_REQUEST).json({
			responseStatus: "ERR_INVALID_PARAMS",
			invalidParams: [
				{
					paramType: "BODY",
					paramName: "userMail",
					errorCode: ErrorCodes.IdentityNotFound,
				},
			],
		})
	}

	const passwordMatch = await compare(userPassword, userDoc.userPassword)

	if (!passwordMatch) {
		return res.status(StatusCodes.BAD_REQUEST).json({
			responseStatus: "ERR_INVALID_PARAMS",
			invalidParams: [
				{
					paramType: "BODY",
					paramName: "userPassword",
					errorCode: ErrorCodes.PasswordMismatch,
				},
			],
		})
	}

	const sessionId = createCuid()

	const sessionToken = sign(
		{
			sessionId: sessionId,
		} satisfies SessionCookieContent,
		JWT_SECRET,
	)

	const nowTs = new Date()
	const endTs = new Date(nowTs.getTime() + SESSION_VALIDITY_SECONDS * 1000)

	const newSession = await db.session.create({
		data: {
			userId: userDoc.userId,
			orgId: userDoc.userOrgId,
			sessionIp: req.ip || "",
			sessionUA: req.headers["user-agent"] || "",
			sessionId: sessionId,
			sessionToken: sessionToken,
			sessionStartTimestamp: nowTs,
			sessionEndTimestamp: endTs,
		},
	})

	logEvent({
		...getEventData(req),
		eventType: EventType.AuthLogin,
		userId: userDoc.userId,
		orgId: userDoc.userOrgId,
		sessionId: newSession.sessionId,
		eventMetadata: {},
	})

	logEvent({
		...getEventData(req),
		eventType: EventType.SessionStart,
		sessionId: newSession.sessionId,
		userId: userDoc.userId,
		orgId: userDoc.userOrgId,
		eventMetadata: {},
	})

	res.setHeader(
		"Set-Cookie",
		`${AUTH_COOKIE_NAME}=${sessionToken}; ${cookieOptions(req, { expires: endTs })}`,
	)

	res.status(StatusCodes.OK).json<CredentialsResponse>({
		responseStatus: "SUCCESS",
		userData: {
			userId: userDoc.userId,
			userOrgId: userDoc.userOrgId,
			userRole: userDoc.userRole,
		},
		sessionData: {
			sessionId: newSession.sessionId,
			sessionToken: newSession.sessionToken,
		},
	})
})
