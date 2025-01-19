import { EventType } from "@prisma/client"

import { getEventData, logEvent } from "@/util/app/events"
import { getMiniUser } from "@/util/app/helpers/users"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type DeleteTeamParams,
	GetTeamParams,
	type GetTeamResponse,
	type UpdateTeamBody,
	type UpdateTeamParams,
	type UpdateTeamResponse,
} from "@/util/defs/engraph-backend/orgs/teams/[teamId]"
import { requestHandler } from "@/util/http/wrappers"

export const updateTeam = requestHandler<
	UpdateTeamParams,
	UpdateTeamBody,
	NoParams
>(async (req, res) => {
	const { teamId } = req.params
	const { teamName } = req.body

	const teamData = await db.team.update({
		where: {
			teamId: teamId,
			teamOrgId: req.currentSession!.orgId,
		},
		data: {
			teamName: teamName,
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
		eventType: EventType.TeamUpdate,
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

	return res.status(StatusCodes.OK).json<UpdateTeamResponse>({
		responseStatus: "SUCCESS",
		teamData: mappedTeamData,
	})
})

export const deleteTeam = requestHandler<DeleteTeamParams, NoParams, NoParams>(
	async (req, res) => {
		const { teamId } = req.params

		await db.team.delete({
			where: {
				teamId: teamId,
				teamOrgId: req.currentSession!.orgId,
			},
		})

		logEvent({
			...getEventData(req),
			eventType: EventType.TeamDelete,
			eventMetadata: {
				teamId: teamId,
			},
		})

		return res.status(StatusCodes.OK).json({
			responseStatus: "SUCCESS",
		})
	},
)

export const getTeam = requestHandler<GetTeamParams, NoParams, NoParams>(
	async (req, res) => {
		const { teamId } = req.params

		const teamData = await db.team.findFirstOrThrow({
			where: {
				teamId: teamId,
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

		return res.status(StatusCodes.OK).json<GetTeamResponse>({
			responseStatus: "SUCCESS",
			teamData: mappedTeamData,
		})
	},
)
