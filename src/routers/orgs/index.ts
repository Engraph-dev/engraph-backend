import { Router } from "express"

import { checkOrgEmail, createOrg } from "@/controllers/orgs"

import { EMAIL_REGEX } from "@/util/app/constants"
import { NoParams } from "@/util/defs/common"
import { CheckEmailBody, CreateOrgBody } from "@/util/defs/orgs"
import { restrictEndpoint, validateParams } from "@/util/http/middleware"
import { EXPECT_TYPE, MATCH_REGEX, NOVALIDATE } from "@/util/http/validators"

const orgRouter = Router({ mergeParams: true })

orgRouter.post<
	"/check",
	NoParams,
	NoParams,
	CheckEmailBody,
	NoParams,
	NoParams
>(
	"/check",
	restrictEndpoint({
		allowNonAuthUsers: true,
		allowAuthUsers: false,
	}),
	validateParams({
		bodyParams: {
			userMail: EXPECT_TYPE<string>("string", NOVALIDATE()),
		},
	}),
	checkOrgEmail,
)

orgRouter.post<"/", NoParams, NoParams, CreateOrgBody, NoParams, NoParams>(
	"/",
	restrictEndpoint({
		allowNonAuthUsers: true,
		allowAuthUsers: false,
	}),
	validateParams({
		bodyParams: {
			orgName: EXPECT_TYPE<string>("string", NOVALIDATE()),
			userFirstName: EXPECT_TYPE<string>("string", NOVALIDATE()),
			userLastName: EXPECT_TYPE<string>("string", NOVALIDATE()),
			userMail: MATCH_REGEX(EMAIL_REGEX),
			userPassword: EXPECT_TYPE<string>("string", NOVALIDATE()),
		},
	}),
	createOrg,
)

export { orgRouter }
