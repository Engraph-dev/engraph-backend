import { UserRole } from "@prisma/client"

import { createUser, getUsers, searchUsers } from "@/controllers/orgs/me/users"

import { userIdRouter } from "@/routers/orgs/me/users/[userId]"
import { myUserRouter } from "@/routers/orgs/me/users/me"

import { requireOrgRole } from "@/util/app/middleware/orgs"
import { UnusedEmail } from "@/util/app/validators/auth"
import {
	PagedQueryValidator,
	WithPagedQueryValidator,
} from "@/util/app/validators/common"
import { OrgUserLimit, UserEntityValidator } from "@/util/app/validators/users"
import { PASSWORD_LENGTH } from "@/util/config/auth"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	CreateUserBody,
	GetUsersQuery,
	SearchUsersQuery,
} from "@/util/defs/engraph-backend/orgs/me/users"
import type { UserId } from "@/util/defs/engraph-backend/orgs/me/users/[userId]"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import {
	ALL_OF,
	IN_ARRAY,
	NULLISH,
	STRING,
	STRLEN_MIN,
	STR_NOT_EMPTY,
} from "@/util/http/validators"

const usersRouter = Router()

usersRouter.post<"/", NoParams, NoParams, CreateUserBody, NoParams, NoParams>(
	"/",
	requireOrgRole({
		userRole: UserRole.Admin,
		includeImplicit: true,
	}),
	validateParams({
		bodyParams: {
			userFirstName: STR_NOT_EMPTY(),
			userLastName: NULLISH(STR_NOT_EMPTY()),
			userMail: ALL_OF([UnusedEmail({ sameOrg: true }), OrgUserLimit]),
			userPassword: STRLEN_MIN(PASSWORD_LENGTH),
			userRole: IN_ARRAY<UserRole>([
				UserRole.Admin,
				UserRole.Developer,
				UserRole.Viewer,
			]),
		},
	}),
	createUser,
)

usersRouter.get<"/", NoParams, NoParams, NoParams, GetUsersQuery, NoParams>(
	"/",
	validateParams({
		queryParams: PagedQueryValidator,
	}),
	getUsers,
)

usersRouter.get<
	"/search",
	NoParams,
	NoParams,
	NoParams,
	SearchUsersQuery,
	NoParams
>(
	"/search",
	validateParams({
		queryParams: WithPagedQueryValidator({
			searchQuery: NULLISH(STRING()),
		}),
	}),
	searchUsers,
)

usersRouter.use<"/me", NoParams, NoParams, NoParams, NoParams, NoParams>(
	"/me",
	myUserRouter,
)

usersRouter.use<"/:userId", UserId, NoParams, NoParams, NoParams, NoParams>(
	"/:userId",
	requireOrgRole({
		userRole: UserRole.Admin,
		includeImplicit: true,
	}),
	validateParams({
		urlParams: {
			userId: UserEntityValidator({
				allowSameOrgOnly: true,
				allowSameUserAsRequest: false,
			}),
		},
	}),
	userIdRouter,
)

export { usersRouter }
