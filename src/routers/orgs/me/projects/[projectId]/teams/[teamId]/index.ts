import { AccessLevel } from "@prisma/client"

import { updateTeamProjectAccess } from "@/controllers/orgs/me/projects/[projectId]/teams/[teamId]"

import { NoParams } from "@/util/defs/engraph-backend/common"
import {
	UpdateProjectTeamBody,
	UpdateProjectTeamParams,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/teams/[teamId]"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { IN_ENUM, NULLISH } from "@/util/http/validators"

const projectIdTeamsTeamIdRouter = Router()

projectIdTeamsTeamIdRouter.patch<
	"/",
	UpdateProjectTeamParams,
	NoParams,
	UpdateProjectTeamBody,
	NoParams,
	NoParams
>(
	"/",
	validateParams({
		bodyParams: {
			accessLevel: NULLISH(IN_ENUM(AccessLevel)),
		},
	}),
	updateTeamProjectAccess,
)

export { projectIdTeamsTeamIdRouter }
