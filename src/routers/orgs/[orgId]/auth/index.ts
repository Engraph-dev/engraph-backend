import { Router } from "express"

import { loginCredentials } from "@/controllers/orgs/[orgId]/auth"

import { PASSWORD_LENGTH } from "@/util/config/auth"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	LoginCredentialsBody,
	LoginCredentialsParams,
} from "@/util/defs/engraph-backend/orgs/[orgId]/auth"
import { validateParams } from "@/util/http/middleware"
import { IS_EMAIL, STRLEN_MIN } from "@/util/http/validators"

const orgIdAuthRouter = Router({
	mergeParams: true,
})

orgIdAuthRouter.post<
	"/credentials",
	LoginCredentialsParams,
	NoParams,
	LoginCredentialsBody,
	NoParams,
	NoParams
>(
	"/credentials",
	validateParams({
		bodyParams: {
			userMail: IS_EMAIL(),
			userPassword: STRLEN_MIN(PASSWORD_LENGTH),
		},
	}),
	loginCredentials,
)

export { orgIdAuthRouter }
