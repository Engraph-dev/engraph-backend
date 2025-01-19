import { projectIdTeamsTeamIdRouter } from "./[teamId]"

import { getProjectTeams } from "@/controllers/orgs/me/projects/[projectId]/teams"

import { PagedQueryValidator } from "@/util/app/validators/common"
import { TeamEntityValidator } from "@/util/app/validators/teams"
import { NoParams } from "@/util/defs/engraph-backend/common"
import {
	GetProjectTeamsParams,
	GetProjectTeamsQuery,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/teams"
import { TeamId } from "@/util/defs/engraph-backend/orgs/me/teams"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"

const projectIdTeamsRouter = Router()

projectIdTeamsRouter.get<
	"/",
	GetProjectTeamsParams,
	NoParams,
	NoParams,
	GetProjectTeamsQuery,
	NoParams
>(
	"/",
	validateParams({
		queryParams: PagedQueryValidator,
	}),
	getProjectTeams,
)

projectIdTeamsRouter.use<TeamId>(
	"/:teamId",
	validateParams({
		urlParams: {
			teamId: TeamEntityValidator({ allowSameOrgOnly: true }),
		},
	}),
	projectIdTeamsTeamIdRouter,
)

export { projectIdTeamsRouter }
