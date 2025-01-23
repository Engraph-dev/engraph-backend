import { getMyUser, updateMyUser } from "@/controllers/orgs/me/users/me"

import { PASSWORD_LENGTH } from "@/util/config/auth"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type { UpdateMyUserBody } from "@/util/defs/engraph-backend/orgs/me/users/me"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { NULLISH, STRLEN_MIN, STR_NOT_EMPTY } from "@/util/http/validators"

const myUserRouter = Router()

myUserRouter.get<"/", NoParams, NoParams, NoParams, NoParams, NoParams>(
	"/",
	getMyUser,
)

myUserRouter.patch<
	"/",
	NoParams,
	NoParams,
	UpdateMyUserBody,
	NoParams,
	NoParams
>(
	"/",
	validateParams({
		bodyParams: {
			userFirstName: NULLISH(STR_NOT_EMPTY()),
			userLastName: NULLISH(STR_NOT_EMPTY()),
			userPassword: NULLISH(STRLEN_MIN(PASSWORD_LENGTH)),
		},
	}),
	updateMyUser,
)

export { myUserRouter }
