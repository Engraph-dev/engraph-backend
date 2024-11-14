import { Router } from "express"

import {
	dangerZone,
	resendVerificationToken,
	verifyToken,
} from "@/controllers/orgs/me/auth"

import { PASSWORD_LENGTH } from "@/util/config/auth"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	DangerZoneBody,
	VerifyTokenBody,
	VerifyTokenParams,
} from "@/util/defs/engraph-backend/orgs/me/auth"
import { validateParams } from "@/util/http/middleware"
import { STRLEN_MIN, STR_NOT_EMPTY } from "@/util/http/validators"

const myOrgAuthRouter = Router()

myOrgAuthRouter.post<
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

myOrgAuthRouter.get<
	"/verify",
	NoParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>("/verify", resendVerificationToken)

myOrgAuthRouter.post<
	"/danger-zone",
	NoParams,
	NoParams,
	DangerZoneBody,
	NoParams,
	NoParams
>(
	"/danger-zone",
	validateParams({
		bodyParams: {
			userPassword: STRLEN_MIN(PASSWORD_LENGTH),
		},
	}),
	dangerZone,
)

export { myOrgAuthRouter }
