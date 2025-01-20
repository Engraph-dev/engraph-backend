import { EventType } from "@prisma/client"

import { getEventData, logEvent } from "@/util/app/events"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	UpdateProjectUserBody,
	UpdateProjectUserParams,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/users/[userId]"
import { requestHandler } from "@/util/http/wrappers"

export const updateProjectUserAccess = requestHandler<
	UpdateProjectUserParams,
	UpdateProjectUserBody,
	NoParams
>(async (req, res) => {
	const { projectId, userId } = req.params
	const { accessLevel } = req.body

	if (accessLevel === null) {
		await db.projectUserAccess.delete({
			where: {
				projectId_userId: {
					projectId: projectId,
					userId: userId,
				},
			},
		})
	} else {
		await db.projectUserAccess.upsert({
			where: {
				projectId_userId: {
					projectId: projectId,
					userId: userId,
				},
			},
			update: {
				accessLevel: accessLevel,
			},
			create: {
				projectId: projectId,
				userId: userId,
				accessLevel: accessLevel,
			},
		})
	}

	logEvent({
		...getEventData(req),
		eventType: EventType.ProjectUserUpdate,
		eventMetadata: {
			accessLevel: accessLevel,
			projectId: projectId,
			userId: userId,
		},
	})

	return res.status(StatusCodes.OK).json({
		responseStatus: "SUCCESS",
	})
})
