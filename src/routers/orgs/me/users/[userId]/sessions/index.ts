import { Router } from "express"

import {
	closeUserSession,
	getUserSessions,
} from "@/controllers/orgs/me/users/[userId]/sessions"

import { SessionEntityValidator } from "@/util/app/validators/session"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	CloseUserSessionParams,
	GetUserSessionsParams,
} from "@/util/defs/engraph-backend/orgs/me/users/[userId]/sessions"
import { validateParams } from "@/util/http/middleware"

const userIdSessionsRouter = Router({ mergeParams: true })

userIdSessionsRouter.get<
	"/",
	GetUserSessionsParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>("/", getUserSessions)

userIdSessionsRouter.delete<
	"/:sessionId",
	CloseUserSessionParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>(
	"/:sessionId",
	validateParams({
		urlParams: {
			sessionId: SessionEntityValidator({ activeOnly: true }),
		},
	}),
	closeUserSession,
)

export { userIdSessionsRouter }
