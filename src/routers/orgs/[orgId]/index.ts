import { Router } from "express"

import { checkOrgEmail, createOrg } from "@/controllers/orgs"
import { loginOrgUser } from "@/controllers/orgs/[orgId]/auth"
import {
	endCurrentSession,
	endSessionById,
	getActiveSessions,
	getCurrentSession,
} from "@/controllers/orgs/me/sessions"

import { EMAIL_REGEX } from "@/util/app/constants"
import { SessionEntityValidator } from "@/util/app/validators/session"
import { NoParams } from "@/util/defs/common"
import { CheckEmailBody, CreateOrgBody } from "@/util/defs/orgs"
import { OrgIdParams } from "@/util/defs/orgs/[orgId]"
import { LoginOrgUserBody } from "@/util/defs/orgs/[orgId]/auth"
import { EndSessionParams } from "@/util/defs/orgs/me/sessions"
import { restrictEndpoint, validateParams } from "@/util/http/middleware"
import { EXPECT_TYPE, MATCH_REGEX, NOVALIDATE } from "@/util/http/validators"

const orgIdRouter = Router({ mergeParams: true })

orgIdRouter.post<
	"/auth/credentials",
	OrgIdParams,
	NoParams,
	LoginOrgUserBody,
	NoParams,
	NoParams
>(
	"/auth/credentials",
	restrictEndpoint({
		allowNonAuthUsers: true,
		allowAuthUsers: false,
	}),
	validateParams({
		bodyParams: {
			userMail: MATCH_REGEX(EMAIL_REGEX),
			userPassword: EXPECT_TYPE<string>("string", NOVALIDATE()),
		},
		urlParams: {
			orgId: EXPECT_TYPE<string>("string", NOVALIDATE()),
		},
	}),
	loginOrgUser,
)

orgIdRouter.post<"/", NoParams, NoParams, CreateOrgBody, NoParams, NoParams>(
	"/",
	restrictEndpoint({
		allowNonAuthUsers: true,
		allowAuthUsers: false,
	}),
	createOrg,
)

orgIdRouter.post<
	"/auth/credentials",
	NoParams,
	NoParams,
	CreateOrgBody,
	NoParams,
	NoParams
>(
	"/auth/credentials",
	restrictEndpoint({
		allowNonAuthUsers: true,
		allowAuthUsers: false,
	}),
	createOrg,
)

orgIdRouter.delete<"/me", NoParams, NoParams, NoParams, NoParams, NoParams>(
	"/me",
	restrictEndpoint({
		allowNonAuthUsers: false,
		allowAuthUsers: true,
	}),
	endCurrentSession,
)

orgIdRouter.delete<"/:sessionId", EndSessionParams>(
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

export { orgIdRouter }
