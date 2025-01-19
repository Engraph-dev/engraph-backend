import { EventType } from "@prisma/client"

import { getEventData, logEvent } from "@/util/app/events"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type UpdateProjectTeamBody,
	UpdateProjectTeamParams,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/teams/[teamId]"
import { requestHandler } from "@/util/http/wrappers"

export const updateTeamProjectAccess = requestHandler<
	UpdateProjectTeamParams,
	UpdateProjectTeamBody,
	NoParams
>(async (req, res) => {
	const { projectId, teamId } = req.params
	const { accessLevel } = req.body
	if (accessLevel === null) {
		await db.projectTeamAccess.delete({
			where: {
				projectId_teamId: {
					projectId: projectId,
					teamId: teamId,
				},
			},
		})
	} else {
		await db.projectTeamAccess.upsert({
			where: {
				projectId_teamId: {
					projectId: projectId,
					teamId: teamId,
				},
			},
			create: {
				accessLevel: accessLevel,
				projectId: projectId,
				teamId: teamId,
			},
			update: {
				accessLevel: accessLevel,
			},
		})
	}

	logEvent({
		...getEventData(req),
		eventType: EventType.ProjectTeamUpdate,
		eventMetadata: {
			accessLevel: accessLevel,
			projectId: projectId,
			teamId: teamId,
		},
	})

	return res.status(StatusCodes.OK).json({
		responseStatus: "SUCCESS",
	})
})
