import { Router } from "express"

import { dangerZone } from "@/controllers/orgs/me/auth"

import { PASSWORD_LENGTH } from "@/util/config/auth"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type { DangerZoneBody } from "@/util/defs/engraph-backend/orgs/me/auth"
import { validateParams } from "@/util/http/middleware"
import { STRLEN_MIN } from "@/util/http/validators"

const myOrgAuthRouter = Router({ mergeParams: true })

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
