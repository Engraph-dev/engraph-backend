import { EventType } from "@prisma/client"
import { compare } from "bcryptjs"
import { sign } from "jsonwebtoken"

import { getEventData, logEvent } from "@/util/app/events"
import { createCuid } from "@/util/app/helpers"
import { createAndSendVerificationToken } from "@/util/app/helpers/auth"
import { cookieOptions } from "@/util/app/helpers/http"
import {
	AUTH_COOKIE_NAME,
	JWT_SECRET,
	SESSION_VALIDITY_SECONDS,
} from "@/util/config/auth"
import db from "@/util/db"
import { StatusCodes } from "@/util/defs/engraph-backend/common"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type {
	CredentialsResponse,
	LoginCredentialsBody,
	LoginCredentialsParams,
} from "@/util/defs/engraph-backend/orgs/[orgId]/auth"
import type {
	VerifyTokenBody,
	VerifyTokenParams,
} from "@/util/defs/engraph-backend/orgs/me/auth"
import type { SessionJwtContent } from "@/util/http"
import { requestHandler } from "@/util/http/wrappers"
import type { ErrorArgMapping } from "@/util/app/helpers/error-codes"

/**
 * This is the handler for the login endpoint.
 * It handles requests to authenticate a user and create a new session.
 * On request, it creates a new session in the database and returns a session token.
 * If a session already exists, it closes the existing session before creating a new one.
 */
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
					errorArgs: {} satisfies (typeof ErrorArgMapping)[typeof ErrorCodes.IdentityNotFound],
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
					errorArgs: {} satisfies (typeof ErrorArgMapping)[typeof ErrorCodes.PasswordMismatch],
				},
			],
		})
	}

	const sessionId = createCuid()

	const sessionToken = sign(
		{
			sessionId: sessionId,
		} satisfies SessionJwtContent,
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

/**
 * This is the handler for the verify-token endpoint.
 * It handles requests to verify a user's email address.
 * On request, it verifies the token and updates the user's verification status.
 * Token matching is done using both tokenId and tokenHash
 */
export const verifyToken = requestHandler<VerifyTokenParams, VerifyTokenBody>(
	async (req, res) => {
		const { orgId } = req.params
		const { tokenId, verificationToken } = req.body
		const { userId } = req.currentSession!

		const authDoc = await db.userVerificationToken.update({
			where: {
				tokenId: tokenId,
				verificationToken: verificationToken,
				userId: userId,
				targetUser: {
					userOrgId: orgId,
				},
			},
			data: {
				targetUser: {
					update: {
						userVerified: true,
					},
				},
			},
		})

		await db.userVerificationToken.deleteMany({
			where: {
				userId: authDoc.userId,
			},
		})

		logEvent({
			...getEventData(req),
			eventType: EventType.AuthVerify,
			eventMetadata: {
				tokenId: tokenId,
				verificationToken: verificationToken,
			},
		})

		res.status(StatusCodes.OK).json({
			responseStatus: "SUCCESS",
		})
	},
)

/**
 * This is the handler for the resend-verification-token endpoint.
 * It handles requests to resend a verification token to a user.
 * On request, it creates a new verification token and sends it to the user's email address.
 */
export const resendVerificationToken = requestHandler(async (req, res) => {
	const { userId } = req.currentSession!

	const userDoc = await db.user.findUniqueOrThrow({
		where: {
			userId: userId,
		},
	})

	createAndSendVerificationToken({
		userId: userId,
		orgId: userDoc.userOrgId,
		mailAddress: userDoc.userMail,
	})

	res.status(StatusCodes.OK).json({
		responseStatus: "SUCCESS",
	})
})
