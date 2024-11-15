import { Router } from "express"

import {
	endCurrentSession,
	endSessionById,
	getActiveSessions,
	getCurrentSession,
} from "@/controllers/orgs/me/sessions/me"

import { SessionEntityValidator } from "@/util/app/validators/session"
import { NoParams } from "@/util/defs/engraph-backend/common"
import { EndSessionParams } from "@/util/defs/engraph-backend/orgs/me/sessions/me"
import { restrictEndpoint, validateParams } from "@/util/http/middleware"

const myOrgSessionRouter = Router({ mergeParams: true })

myOrgSessionRouter.get<"/me", NoParams, NoParams, NoParams, NoParams, NoParams>(
	"/me",
	restrictEndpoint({
		allowNonAuthUsers: true,
		allowAuthUsers: true,
		requireVerified: false,
	}),
	getCurrentSession,
)

myOrgSessionRouter.get<
	"/all",
	NoParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>(
	"/all",
	restrictEndpoint({
		allowNonAuthUsers: false,
		allowAuthUsers: true,
		requireVerified: false,
	}),
	getActiveSessions,
)

myOrgSessionRouter.delete<
	"/me",
	NoParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>(
	"/me",
	restrictEndpoint({
		allowNonAuthUsers: false,
		allowAuthUsers: true,
		requireVerified: false,
	}),
	endCurrentSession,
)

myOrgSessionRouter.delete<"/:sessionId", EndSessionParams>(
	"/:sessionId",
	restrictEndpoint({
		allowNonAuthUsers: false,
		allowAuthUsers: true,
		requireVerified: false,
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

export { myOrgSessionRouter }
