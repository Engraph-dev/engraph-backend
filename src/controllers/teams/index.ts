import { getQueryOffset } from "@/util/app/helpers"
import { getMiniUser } from "@/util/app/helpers/users"
import db from "@/util/db"
import { NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type CreateTeamBody,
	type CreateTeamResponse,
	type GetTeamsQuery,
	type GetTeamsResponse,
} from "@/util/defs/engraph-backend/orgs/teams"
import { requestHandler } from "@/util/http/wrappers"

export const createTeam = requestHandler<NoParams, CreateTeamBody, NoParams>(
	async (req, res) => {
		const { teamName } = req.body

		const teamData = await db.team.create({
			data: {
				teamName: teamName,
				teamOrgId: req.currentSession!.orgId,
			},
			include: {
				teamUsers: {
					include: {
						linkedUser: true,
					},
				},
			},
		})

		const mappedTeamData = {
			...teamData,
			teamUsers: teamData.teamUsers.map((teamUser) => {
				return getMiniUser(teamUser.linkedUser)
			}),
		}

		return res.status(StatusCodes.OK).json<CreateTeamResponse>({
			responseStatus: "SUCCESS",
			teamData: mappedTeamData,
		})
	},
)

export const getTeams = requestHandler<NoParams, NoParams, GetTeamsQuery>(
	async (req, res) => {
		const orgTeams = await db.team.findMany({
			where: {
				teamOrgId: req.currentSession!.orgId,
			},
			include: {
				_count: {
					select: {
						teamUsers: true,
					},
				},
			},
			...getQueryOffset(req.query),
		})

		const mappedTeams = orgTeams.map((orgTeam) => {
			const {
				_count: { teamUsers },
				teamId,
				teamName,
				teamOrgId,
			} = orgTeam
			return {
				teamId: teamId,
				teamName: teamName,
				teamOrgId: teamOrgId,
				userCount: teamUsers,
			} satisfies GetTeamsResponse["orgTeams"][number]
		})

		return res.status(StatusCodes.OK).json<GetTeamsResponse>({
			responseStatus: "SUCCESS",
			orgTeams: mappedTeams,
		})
	},
)
