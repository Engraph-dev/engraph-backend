import { UserRole } from "@prisma/client"

import { createTeam, getTeams, searchTeams } from "@/controllers/orgs/me/teams"

import { myOrgTeamIdRouter } from "@/routers/orgs/me/teams/[teamId]"

import { requireOrgRole } from "@/util/app/middleware/orgs"
import {
	PagedQueryValidator,
	WithPagedQueryValidator,
} from "@/util/app/validators/common"
import { OrgTeamLimit, TeamEntityValidator } from "@/util/app/validators/teams"
import { NoParams } from "@/util/defs/engraph-backend/common"
import {
	CreateTeamBody,
	type GetTeamsQuery,
	type SearchTeamsQuery,
	type TeamId,
} from "@/util/defs/engraph-backend/orgs/me/teams"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { ALL_OF, NULLISH, STRING, STR_NOT_EMPTY } from "@/util/http/validators"

const myOrgTeamsRouter = Router()

myOrgTeamsRouter.post<
	"/",
	NoParams,
	NoParams,
	CreateTeamBody,
	NoParams,
	NoParams
>(
	"/",
	requireOrgRole({ userRole: UserRole.Admin, includeImplicit: true }),
	validateParams({
		bodyParams: {
			teamName: ALL_OF([STR_NOT_EMPTY(), OrgTeamLimit]),
		},
	}),
	createTeam,
)

myOrgTeamsRouter.get<
	"/",
	NoParams,
	NoParams,
	NoParams,
	GetTeamsQuery,
	NoParams
>(
	"/",
	validateParams({
		queryParams: PagedQueryValidator,
	}),
	getTeams,
)
myOrgTeamsRouter.get<
	"/search",
	NoParams,
	NoParams,
	NoParams,
	SearchTeamsQuery,
	NoParams
>(
	"/search",
	validateParams({
		queryParams: WithPagedQueryValidator({
			searchQuery: NULLISH(STRING()),
		}),
	}),
	searchTeams,
)

myOrgTeamsRouter.use<TeamId, NoParams, NoParams, NoParams, NoParams>(
	"/:teamId",
	validateParams({
		urlParams: {
			teamId: TeamEntityValidator({
				allowSameOrgOnly: true,
			}),
		},
	}),
	myOrgTeamIdRouter,
)

export { myOrgTeamsRouter }
