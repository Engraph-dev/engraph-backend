import { orgIdRouter } from "./[orgId]"
import { myOrgRouter } from "./me"
import { Router } from "express"

import { createOrg } from "@/controllers/orgs"

import { OrgIdValidator } from "@/util/app/validators/orgs"
import { PASSWORD_LENGTH } from "@/util/config/auth"
import { MIN_ORG_NAME_LENGTH } from "@/util/config/orgs"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type { CreateOrgBody } from "@/util/defs/engraph-backend/orgs"
import type { OrgIdParams } from "@/util/defs/engraph-backend/orgs/[orgId]"
import { restrictEndpoint, validateParams } from "@/util/http/middleware"
import {
	IS_EMAIL,
	NULLISH,
	STRLEN_MIN,
	STR_NOT_EMPTY,
} from "@/util/http/validators"

const orgRouter = Router({
	mergeParams: true,
})

orgRouter.post<"/", NoParams, NoParams, CreateOrgBody, NoParams, NoParams>(
	"/",
	restrictEndpoint({
		allowAuthUsers: false,
		allowNonAuthUsers: true,
	}),
	validateParams({
		bodyParams: {
			orgName: STRLEN_MIN(MIN_ORG_NAME_LENGTH),
			userFirstName: STR_NOT_EMPTY(),
			userLastName: NULLISH(STR_NOT_EMPTY()),
			userMail: IS_EMAIL(),
			userPassword: STRLEN_MIN(PASSWORD_LENGTH),
		},
	}),
	createOrg,
)

orgRouter.use(
	"/me",
	restrictEndpoint({
		allowAuthUsers: true,
		allowNonAuthUsers: false,
	}),
	myOrgRouter,
)

orgRouter.use<"/:orgId", OrgIdParams>(
	"/:orgId",
	validateParams({
		urlParams: {
			orgId: OrgIdValidator,
		},
	}),
	orgIdRouter,
)

export { orgRouter }
