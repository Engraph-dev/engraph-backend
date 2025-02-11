import { getQueryOffset } from "@/util/app/helpers"
import { getMiniUser } from "@/util/app/helpers/users"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	GetProjectUsersParams,
	type GetProjectUsersQuery,
	type GetProjectUsersResponse,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/users"
import { requestHandler } from "@/util/http/wrappers"

export const getProjectUsers = requestHandler<
	GetProjectUsersParams,
	NoParams,
	GetProjectUsersQuery
>(async (req, res) => {
	const { projectId } = req.params

	const projectUsers = await db.projectUserAccess.findMany({
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
			linkedUser: true,
		},
		...getQueryOffset(req.query),
	})

	const mappedUsers = projectUsers.map((projectUser) => {
		return {
			...projectUser,
			linkedUser: getMiniUser(projectUser.linkedUser),
		}
	})

	return res.status(StatusCodes.OK).json<GetProjectUsersResponse>({
		responseStatus: "SUCCESS",
		projectUsers: mappedUsers,
	})
})
