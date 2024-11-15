import { Router } from "express"

import {
	loginCredentials,
	resendVerificationToken,
	verifyToken,
} from "@/controllers/orgs/[orgId]/auth"

import { PASSWORD_LENGTH } from "@/util/config/auth"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	LoginCredentialsBody,
	LoginCredentialsParams,
} from "@/util/defs/engraph-backend/orgs/[orgId]/auth"
import type {
	VerifyTokenBody,
	VerifyTokenParams,
} from "@/util/defs/engraph-backend/orgs/me/auth"
import { validateParams } from "@/util/http/middleware"
import { IS_EMAIL, STRLEN_MIN, STR_NOT_EMPTY } from "@/util/http/validators"

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

orgIdAuthRouter.post<
	"/verify",
	VerifyTokenParams,
	NoParams,
	VerifyTokenBody,
	NoParams,
	NoParams
>(
	"/verify",
	validateParams({
		bodyParams: {
			tokenId: STR_NOT_EMPTY(),
			verificationToken: STR_NOT_EMPTY(),
		},
	}),
	verifyToken,
)

orgIdAuthRouter.get<
	"/verify",
	NoParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>("/verify", resendVerificationToken)

export { orgIdAuthRouter }
