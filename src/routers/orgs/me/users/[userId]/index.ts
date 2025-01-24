import { UserRole } from "@prisma/client"

import {
	deleteUser,
	getUser,
	updateUser,
} from "@/controllers/orgs/me/users/[userId]"

import { userIdSessionsRouter } from "@/routers/orgs/me/users/[userId]/sessions"

import { requireOrgRole } from "@/util/app/middleware/orgs"
import { UserEntityValidator } from "@/util/app/validators/users"
import { PASSWORD_LENGTH } from "@/util/config/auth"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	DeleteUserParams,
	GetUserParams,
	UpdateUserBody,
	UpdateUserParams,
} from "@/util/defs/engraph-backend/orgs/me/users/[userId]"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import {
	IN_ENUM,
	NULLISH,
	STRLEN_MIN,
	STR_NOT_EMPTY,
} from "@/util/http/validators"

const userIdRouter = Router()

userIdRouter.patch<
	"/",
	UpdateUserParams,
	NoParams,
	UpdateUserBody,
	NoParams,
	NoParams
>(
	"/",
	validateParams({
		urlParams: {
			userId: UserEntityValidator({ allowSameUserAsRequest: false }),
		},
		bodyParams: {
			userFirstName: NULLISH(STR_NOT_EMPTY()),
			userLastName: NULLISH(STR_NOT_EMPTY()),
			userPassword: NULLISH(STRLEN_MIN(PASSWORD_LENGTH)),
			userRole: NULLISH(IN_ENUM(UserRole)),
		},
	}),
	updateUser,
)

userIdRouter.delete<
	"/",
	DeleteUserParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>("/", deleteUser)

userIdRouter.get<"/", GetUserParams, NoParams, NoParams, NoParams, NoParams>(
	"/",
	getUser,
)

userIdRouter.use(
	"/sessions",
	requireOrgRole({
		userRole: UserRole.Admin,
		includeImplicit: true,
	}),
	userIdSessionsRouter,
)

export { userIdRouter }
