import { Router } from "express"

import {
	endCurrentSession,
	endSessionById,
	getActiveSessions,
	getCurrentSession,
} from "@/controllers/orgs/me/sessions"

import { SessionEntityValidator } from "@/util/app/validators/session"
import { NoParams } from "@/util/defs/common"
import { EndSessionParams } from "@/util/defs/orgs/me/sessions"
import { restrictEndpoint, validateParams } from "@/util/http/middleware"

const sessionRouter = Router({ mergeParams: true })

sessionRouter.get<"/me", NoParams, NoParams, NoParams, NoParams, NoParams>(
	"/me",
	restrictEndpoint({
		allowNonAuthUsers: false,
		allowAuthUsers: true,
	}),
	getCurrentSession,
)

sessionRouter.get<"/all", NoParams, NoParams, NoParams, NoParams, NoParams>(
	"/all",
	restrictEndpoint({
		allowNonAuthUsers: false,
		allowAuthUsers: true,
	}),
	getActiveSessions,
)

sessionRouter.delete<"/me", NoParams, NoParams, NoParams, NoParams, NoParams>(
	"/me",
	restrictEndpoint({
		allowNonAuthUsers: false,
		allowAuthUsers: true,
	}),
	endCurrentSession,
)

sessionRouter.delete<"/:sessionId", EndSessionParams>(
	"/:sessionId",
	restrictEndpoint({
		allowNonAuthUsers: false,
		allowAuthUsers: true,
	}),
	validateParams({
		urlParams: {
			sessionId: SessionEntityValidator({ activeOnly: true }),
		},
		bodyParams: {},
		queryParams: {},
	}),
	endSessionById,
)

export { sessionRouter }
