import { UserRole } from "@prisma/client"
import { Router } from "express"

import { createUser, getUsers } from "@/controllers/orgs/me/users"

import { userIdRouter } from "@/routers/orgs/me/users/[userId]"

import { UnusedEmail } from "@/util/app/validators/auth"
import { PagedQueryValidator } from "@/util/app/validators/common"
import { UserEntityValidator } from "@/util/app/validators/users"
import { PASSWORD_LENGTH } from "@/util/config/auth"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	CreateUserBody,
	GetUsersQuery,
} from "@/util/defs/engraph-backend/orgs/me/users"
import type { UserId } from "@/util/defs/engraph-backend/orgs/me/users/[userId]"
import { validateParams, xsrfProtection } from "@/util/http/middleware"
import {
	IN_ENUM,
	NULLISH,
	STRLEN_MIN,
	STR_NOT_EMPTY,
} from "@/util/http/validators"

const usersRouter = Router({ mergeParams: true })

usersRouter.post<"/", NoParams, NoParams, CreateUserBody, NoParams, NoParams>(
	"/",
	validateParams({
		bodyParams: {
			userFirstName: STR_NOT_EMPTY(),
			userLastName: NULLISH(STR_NOT_EMPTY()),
			userMail: UnusedEmail({ sameOrg: true }),
			userPassword: STRLEN_MIN(PASSWORD_LENGTH),
			userRole: IN_ENUM(UserRole),
		},
	}),
	createUser,
)

usersRouter.get<"/", NoParams, NoParams, NoParams, GetUsersQuery, NoParams>(
	"/",
	xsrfProtection,
	validateParams({
		queryParams: PagedQueryValidator,
	}),
	getUsers,
)

usersRouter.use<"/:userId", UserId, NoParams, NoParams, NoParams, NoParams>(
	"/:userId",
	validateParams({
		urlParams: {
			userId: UserEntityValidator({
				allowSameOrgOnly: true,
				allowSameUserAsReq: false,
			}),
		},
	}),
	userIdRouter,
)

export { usersRouter }
