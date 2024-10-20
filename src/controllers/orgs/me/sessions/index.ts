import { EventType } from "@prisma/client"

import { cookieOptions } from "@/util/app"
import { getEventData, logEvent } from "@/util/app/events"
import { AUTH_COOKIE_NAME } from "@/util/config/auth"
import db from "@/util/db"
import { StatusCodes } from "@/util/defs/common"
import {
	EndSessionParams,
	GetActiveSessionsResponse,
	GetSessionResponse,
} from "@/util/defs/orgs/me/sessions"
import { requestHandler } from "@/util/http/helpers"

export const getCurrentSession = requestHandler(async (req, res) => {
	const sessionInfo = await db.session.findFirst({
		where: {
			sessionId: req.currentSession?.sessionId,
		},
		select: {
			sessionId: true,
			sessionIp: false,
			sessionUA: false,
			sessionStartTimestamp: true,
			sessionEndTimestamp: true,
			userId: true,
			sessionUser: true,
			orgId: true,
			sessionOrg: true,
		},
	})

	return res.status(StatusCodes.OK).json<GetSessionResponse>({
		responseStatus: "SUCCESS",
		sessionData: sessionInfo,
	})
})

export const getActiveSessions = requestHandler(async (req, res) => {
	const activeSessions = await db.session.findMany({
		where: {
			userId: req.currentSession?.userId,
			sessionEndTimestamp: {
				gt: new Date(),
			},
		},
		select: {
			sessionId: true,
			sessionIp: true,
			sessionUA: true,
			sessionStartTimestamp: true,
		},
	})

	return res.status(StatusCodes.OK).json<GetActiveSessionsResponse>({
		responseStatus: "SUCCESS",
		activeSessions: activeSessions,
	})
})

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
		eventMetadata: {
			sessionId: req.currentSession!.sessionId,
		},
	})

	res.setHeader(
		"Set-Cookie",
		`${AUTH_COOKIE_NAME}=; ${cookieOptions(req, { expires: new Date(0) })}`,
	)

	return res.status(StatusCodes.OK).json({
		responseStatus: "SUCCESS",
	})
})
export const endSessionById = requestHandler<EndSessionParams>(
	async (req, res) => {
		const { sessionId } = req.params

		await db.session.update({
			where: {
				sessionId: sessionId,
			},
			data: {
				sessionEndTimestamp: new Date(),
			},
		})

		logEvent({
			...getEventData(req),
			eventType: EventType.SessionClose,
			eventMetadata: {
				sessionId: sessionId,
			},
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
