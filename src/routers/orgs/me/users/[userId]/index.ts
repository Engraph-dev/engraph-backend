import { UserRole } from "@prisma/client"
import { Router } from "express"

import { deleteUser, updateUser } from "@/controllers/orgs/me/users/[userId]"

import { userIdSessionsRouter } from "@/routers/orgs/me/users/[userId]/sessions"

import { UserEntityValidator } from "@/util/app/validators/users"
import { PASSWORD_LENGTH } from "@/util/config/auth"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	DeleteUserParams,
	UpdateUserBody,
	UpdateUserParams,
} from "@/util/defs/engraph-backend/orgs/me/users/[userId]"
import { validateParams } from "@/util/http/middleware"
import {
	IN_ENUM,
	NULLISH,
	STRLEN_MIN,
	STR_NOT_EMPTY,
} from "@/util/http/validators"

const userIdRouter = Router({ mergeParams: true })

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
			userId: UserEntityValidator({ allowSameUserAsReq: false }),
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

userIdRouter.use("/sessions", userIdSessionsRouter)

export { userIdRouter }
