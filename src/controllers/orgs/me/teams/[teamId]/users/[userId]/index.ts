import { EventType } from "@prisma/client"

import { getEventData, logEvent } from "@/util/app/events"
import { getMiniUser } from "@/util/app/helpers/users"
import db from "@/util/db"
import { StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	AddTeamUserParams,
	type AddTeamUserResponse,
	DeleteTeamUserParams,
	type DeleteTeamUserResponse,
} from "@/util/defs/engraph-backend/orgs/me/teams/[teamId]/users/[userId]"
import { requestHandler } from "@/util/http/wrappers"

export const addTeamUser = requestHandler<AddTeamUserParams>(
	async (req, res) => {
		const { teamId, userId } = req.params

		const teamData = await db.team.update({
			where: {
				teamId: teamId,
				teamOrgId: req.currentSession!.orgId,
			},
			data: {
				teamUsers: {
					connectOrCreate: {
						where: {
							userId_teamId: {
								userId: userId,
								teamId: teamId,
							},
						},
						create: {
							userId: userId,
						},
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
			eventType: EventType.TeamUserAdd,
			eventMetadata: {
				teamId: teamData.teamId,
				userId: userId,
			},
		})

		const mappedTeamData = {
			...teamData,
			teamUsers: teamData.teamUsers.map((teamUser) => {
				return getMiniUser(teamUser.linkedUser)
			}),
		}

		return res.status(StatusCodes.OK).json<AddTeamUserResponse>({
			responseStatus: "SUCCESS",
			teamData: mappedTeamData,
		})
	},
)

export const deleteTeamUser = requestHandler<DeleteTeamUserParams>(
	async (req, res) => {
		const { teamId, userId } = req.params

		const teamData = await db.team.update({
			where: {
				teamId: teamId,
				teamOrgId: req.currentSession!.orgId,
			},
			data: {
				teamUsers: {
					delete: {
						userId_teamId: {
							userId: userId,
							teamId: teamId,
						},
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
			eventType: EventType.TeamUserDelete,
			eventMetadata: {
				teamId: teamData.teamId,
				userId: userId,
			},
		})

		const mappedTeamData = {
			...teamData,
			teamUsers: teamData.teamUsers.map((teamUser) => {
				return getMiniUser(teamUser.linkedUser)
			}),
		}

		return res.status(StatusCodes.OK).json<DeleteTeamUserResponse>({
			responseStatus: "SUCCESS",
			teamData: mappedTeamData,
		})
	},
)
