import { getQueryOffset } from "@/util/app/helpers"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	GetProjectTeamsParams,
	type GetProjectTeamsQuery,
	GetProjectTeamsResponse,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/teams"
import { requestHandler } from "@/util/http/wrappers"

export const getProjectTeams = requestHandler<
	GetProjectTeamsParams,
	NoParams,
	GetProjectTeamsQuery
>(async (req, res) => {
	const { projectId } = req.params

	const projectTeams = await db.projectTeamAccess.findMany({
		where: {
			projectId: projectId,
			linkedProject: {
				projectOrgId: req.currentSession!.orgId,
			},
		},
		orderBy: {
			accessLevel: "asc",
		},
		include: {
			linkedTeam: true,
		},
		...getQueryOffset(req.query),
	})

	return res.status(StatusCodes.OK).json<GetProjectTeamsResponse>({
		responseStatus: "SUCCESS",
		projectTeams: projectTeams,
	})
})
