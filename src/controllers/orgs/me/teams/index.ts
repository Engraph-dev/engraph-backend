import { EventType } from "@prisma/client"

import { getEventData, logEvent } from "@/util/app/events"
import { getQueryOffset } from "@/util/app/helpers"
import {
	IdentSuffixType,
	generateIdentifierFromString,
} from "@/util/app/helpers/data-handlers"
import { getMiniUser } from "@/util/app/helpers/users"
import db from "@/util/db"
import { NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type CreateTeamBody,
	type CreateTeamResponse,
	type GetTeamsQuery,
	type SearchTeamsQuery,
	type TeamsResponse,
} from "@/util/defs/engraph-backend/orgs/me/teams"
import { requestHandler } from "@/util/http/wrappers"

export const createTeam = requestHandler<NoParams, CreateTeamBody, NoParams>(
	async (req, res) => {
		const { teamName } = req.body

		const teamData = await db.team.create({
			data: {
				teamId: generateIdentifierFromString(
					teamName,
					IdentSuffixType.MiniCuid,
				),
				teamName: teamName,
				teamOrgId: req.currentSession!.orgId,
				teamUsers: {
					create: {
						userId: req.currentSession!.userId,
					},
				},
			},
			include: {
				teamUsers: {
					include: {
						linkedUser: true,
					},
				},
			},
		})

		logEvent({
			...getEventData(req),
			eventType: EventType.TeamCreate,
			eventMetadata: {
				teamId: teamData.teamId,
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
						teamProjects: true,
					},
				},
			},
			...getQueryOffset(req.query),
		})

		const mappedTeams = orgTeams.map((orgTeam) => {
			const {
				_count: { teamUsers, teamProjects },
				teamId,
				teamName,
				teamOrgId,
			} = orgTeam
			return {
				teamId: teamId,
				teamName: teamName,
				teamOrgId: teamOrgId,
				userCount: teamUsers,
				projectCount: teamProjects,
			} satisfies TeamsResponse["orgTeams"][number]
		})

		return res.status(StatusCodes.OK).json<TeamsResponse>({
			responseStatus: "SUCCESS",
			orgTeams: mappedTeams,
		})
	},
)

export const searchTeams = requestHandler<NoParams, NoParams, SearchTeamsQuery>(
	async (req, res) => {
		const { searchQuery } = req.query

		const orgTeams = await db.team.findMany({
			where: {
				teamOrgId: req.currentSession!.orgId,
				teamName: {
					contains: searchQuery,
				},
			},
			include: {
				_count: {
					select: {
						teamUsers: true,
						teamProjects: true,
					},
				},
			},
			...getQueryOffset(req.query),
		})

		const mappedTeams = orgTeams.map((orgTeam) => {
			const {
				_count: { teamUsers, teamProjects },
				teamId,
				teamName,
				teamOrgId,
			} = orgTeam
			return {
				teamId: teamId,
				teamName: teamName,
				teamOrgId: teamOrgId,
				userCount: teamUsers,
				projectCount: teamProjects,
			} satisfies TeamsResponse["orgTeams"][number]
		})

		return res.status(StatusCodes.OK).json<TeamsResponse>({
			responseStatus: "SUCCESS",
			orgTeams: mappedTeams,
		})
	},
)
