import { UserRole } from "@prisma/client"

import {
	deleteTeam,
	getTeam,
	updateTeam,
} from "@/controllers/orgs/me/teams/[teamId]"

import { myOrgTeamIdUsersRouter } from "@/routers/orgs/me/teams/[teamId]/users"

import { requireOrgRole } from "@/util/app/middleware/orgs"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	DeleteTeamParams,
	GetTeamParams,
	UpdateTeamBody,
	UpdateTeamParams,
} from "@/util/defs/engraph-backend/orgs/me/teams/[teamId]"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { NULLISH, STR_NOT_EMPTY } from "@/util/http/validators"

const myOrgTeamIdRouter = Router()

myOrgTeamIdRouter.get<"/", GetTeamParams>("/", getTeam)

myOrgTeamIdRouter.patch<
	"/",
	UpdateTeamParams,
	NoParams,
	UpdateTeamBody,
	NoParams,
	NoParams
>(
	"/",
	requireOrgRole({ userRole: UserRole.Admin, includeImplicit: true }),
	validateParams({
		bodyParams: {
			teamName: NULLISH(STR_NOT_EMPTY()),
		},
	}),
	updateTeam,
)

myOrgTeamIdRouter.delete<
	"/",
	DeleteTeamParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>(
	"/",
	requireOrgRole({ userRole: UserRole.Admin, includeImplicit: true }),
	deleteTeam,
)

myOrgTeamIdRouter.use(
	"/users",
	requireOrgRole({ userRole: UserRole.Admin, includeImplicit: true }),
	myOrgTeamIdUsersRouter,
)

export { myOrgTeamIdRouter }
