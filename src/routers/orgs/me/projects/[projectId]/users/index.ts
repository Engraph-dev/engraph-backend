import { projectIdUsersUserIdRouter } from "./[userId]"

import { getProjectUsers } from "@/controllers/orgs/me/projects/[projectId]/users"

import { PagedQueryValidator } from "@/util/app/validators/common"
import { UserEntityValidator } from "@/util/app/validators/users"
import { NoParams } from "@/util/defs/engraph-backend/common"
import {
	GetProjectUsersParams,
	GetProjectUsersQuery,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/users"
import { UserId } from "@/util/defs/engraph-backend/orgs/me/users/[userId]"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"

const projectIdUsersRouter = Router()

projectIdUsersRouter.get<
	"/",
	GetProjectUsersParams,
	NoParams,
	NoParams,
	GetProjectUsersQuery,
	NoParams
>(
	"/",
	validateParams({
		queryParams: PagedQueryValidator,
	}),
	getProjectUsers,
)

projectIdUsersRouter.use<UserId>(
	"/:userId",
	validateParams({
		urlParams: {
			userId: UserEntityValidator({
				allowSameOrgOnly: true,
				allowSameUserAsRequest: false,
			}),
		},
	}),
	projectIdUsersUserIdRouter,
)

export { projectIdUsersRouter }
