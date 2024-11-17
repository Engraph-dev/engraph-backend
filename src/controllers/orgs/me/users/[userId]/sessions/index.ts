import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type CloseUserSessionParams,
	type GetUserSessionsParams,
	GetUserSessionsResponse,
} from "@/util/defs/engraph-backend/orgs/me/users/[userId]/sessions"
import { requestHandler } from "@/util/http/wrappers"

/**
 * Get all active sessions for a user
 * Requires the user to be in the same org as the current session
 * Only returns sessions that have not ended yet
 */
export const getUserSessions = requestHandler<
	GetUserSessionsParams,
	NoParams,
	NoParams
>(async (req, res) => {
	const { userId } = req.params

	const userSessions = await db.session.findMany({
		where: {
			orgId: req.currentSession!.orgId,
			userId: userId,
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

	return res.status(StatusCodes.OK).json<GetUserSessionsResponse>({
		responseStatus: "SUCCESS",
		activeSessions: userSessions,
	})
})

/**
 * Close a user session
 * Requires the user to be in the same org as the current session
 * Only closes the session if it has not ended yet
 */
export const closeUserSession = requestHandler<
	CloseUserSessionParams,
	NoParams,
	NoParams
>(async (req, res) => {
	const { sessionId, userId } = req.params

	await db.session.update({
		where: {
			sessionId: sessionId,
			userId: userId,
			orgId: req.currentSession!.orgId,
			sessionEndTimestamp: {
				gt: new Date(),
			},
		},
		data: {
			sessionEndTimestamp: new Date(),
		},
	})

	return res.status(StatusCodes.OK).json({
		responseStatus: "SUCCESS",
	})
})
