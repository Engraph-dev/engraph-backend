import { AccessLevel } from "@prisma/client"

import { updateProjectUserAccess } from "@/controllers/orgs/me/projects/[projectId]/users/[userId]"

import { NoParams } from "@/util/defs/engraph-backend/common"
import {
	UpdateProjectUserBody,
	UpdateProjectUserParams,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/users/[userId]"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { IN_ENUM, NULLISH } from "@/util/http/validators"

const projectIdUsersUserIdRouter = Router()

projectIdUsersUserIdRouter.patch<
	"/",
	UpdateProjectUserParams,
	NoParams,
	UpdateProjectUserBody,
	NoParams,
	NoParams
>(
	"/",
	validateParams({
		bodyParams: {
			accessLevel: NULLISH(IN_ENUM(AccessLevel)),
		},
	}),
	updateProjectUserAccess,
)

export { projectIdUsersUserIdRouter }
