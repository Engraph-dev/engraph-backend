import { EventType } from "@prisma/client"

import { getEventData, logEvent } from "@/util/app/events"
import { cookieOptions } from "@/util/app/http"
import { AUTH_COOKIE_NAME } from "@/util/config/auth"
import db from "@/util/db"
import { StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	EndSessionParams,
	GetActiveSessionsResponse,
	GetSessionResponse,
} from "@/util/defs/engraph-backend/orgs/me/sessions/me"
import { requestHandler } from "@/util/http/wrappers"

/**
 * This is the handler for the session endpoint.
 * It handles requests to get the current session.
 * Requires authentication
 */
export const getCurrentSession = requestHandler(async (req, res) => {
	const sessionInfo = await db.session.findFirstOrThrow({
		where: {
			sessionId: req.currentSession!.sessionId,
		},
		select: {
			sessionId: true,
			sessionIp: false,
			sessionUA: false,
			sessionStartTimestamp: true,
			sessionEndTimestamp: true,
			userId: true,
			sessionUser: {
				select: {
					userId: true,
					userPassword: false,
					userFirstName: true,
					userLastName: true,
					userMail: true,
					userRole: true,
					userVerified: true,
					userOrgId: true,
				},
			},
			orgId: true,
			sessionOrg: true,
		},
	})

	return res.status(StatusCodes.OK).json<GetSessionResponse>({
		responseStatus: "SUCCESS",
		sessionData: sessionInfo,
	})
})

/**
 * This is the handler for the active sessions endpoint.
 * It handles requests to get all active sessions for the current user.
 * Requires authentication
 */
export const getActiveSessions = requestHandler(async (req, res) => {
	const activeSessions = await db.session.findMany({
		where: {
			userId: req.currentSession!.userId,
			sessionEndTimestamp: {
				gt: new Date(),
			},
		},
		select: {
			sessionId: true,
			sessionIp: true,
			sessionUA: true,
			sessionStartTimestamp: true,
			sessionEndTimestamp: true,
		},
	})

	const mappedActiveSessions = activeSessions.map((activeSession) => {
		return {
			...activeSession,
			currentSession:
				activeSession.sessionId === req.currentSession?.sessionId,
		}
	})

	return res.status(StatusCodes.OK).json<GetActiveSessionsResponse>({
		responseStatus: "SUCCESS",
		activeSessions: mappedActiveSessions,
	})
})

/**
 * This is the handler for the end-session endpoint.
 * It handles requests to end the current session.
 * Requires authentication
 */
export const endCurrentSession = requestHandler(async (req, res) => {
	await db.session.update({
		where: {
			sessionId: req.currentSession!.sessionId,
		},
		data: {
			sessionEndTimestamp: new Date(),
		},
	})

	logEvent({
		...getEventData(req),
		eventType: EventType.SessionClose,
		eventMetadata: {},
	})

	res.setHeader(
		"Set-Cookie",
		`${AUTH_COOKIE_NAME}=; ${cookieOptions(req, { expires: new Date(0) })}`,
	)

	return res.status(StatusCodes.OK).json({
		responseStatus: "SUCCESS",
	})
})

/**
 * This is the handler for the end-session-by-id endpoint.
 * It handles requests to end a session by its ID.
 * Requires authentication
 */
export const endSessionById = requestHandler<EndSessionParams>(
	async (req, res) => {
		const { sessionId } = req.params

		await db.session.update({
			where: {
				sessionId: sessionId,
				userId: req.currentSession!.userId,
				sessionEndTimestamp: {
					gt: new Date(),
				},
			},
			data: {
				sessionEndTimestamp: new Date(),
			},
		})

		logEvent({
			...getEventData(req),
			eventType: EventType.SessionClose,
			eventMetadata: {},
		})

		if (sessionId === req.currentSession?.sessionId) {
			res.setHeader(
				"Set-Cookie",
				`${AUTH_COOKIE_NAME}=; ${cookieOptions(req, { expires: new Date(0) })}`,
			)
		}

		return res.status(StatusCodes.OK).json({
			responseStatus: "SUCCESS",
		})
	},
)
