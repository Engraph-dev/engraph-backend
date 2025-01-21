import { EventType } from "@prisma/client"

import { getEventData, logEvent } from "@/util/app/events"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import { ProjectResponse } from "@/util/defs/engraph-backend/orgs/me/projects"
import type {
	DeleteProjectParams,
	GetProjectParams,
	UpdateProjectBody,
	UpdateProjectParams,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]"
import { requestHandler } from "@/util/http/wrappers"

export const updateProject = requestHandler<
	UpdateProjectParams,
	UpdateProjectBody,
	NoParams
>(async (req, res) => {
	const { projectId } = req.params
	const { projectName, projectType, projectEntryPoint } = req.body

	const projectData = await db.project.update({
		where: {
			projectId: projectId,
			projectOrgId: req.currentSession!.orgId,
		},
		data: {
			projectName: projectName,
			projectType: projectType,
			projectEntryPoint: projectEntryPoint,
		},
	})

	logEvent({
		...getEventData(req),
		eventType: EventType.ProjectUpdate,
		eventMetadata: {
			projectId: projectId,
		},
	})

	return res.status(StatusCodes.OK).json<ProjectResponse>({
		responseStatus: "SUCCESS",
		projectData: projectData,
	})
})

export const deleteProject = requestHandler<
	DeleteProjectParams,
	NoParams,
	NoParams
>(async (req, res) => {
	const { projectId } = req.params

	await db.project.delete({
		where: {
			projectId: projectId,
			projectOrgId: req.currentSession!.orgId,
		},
	})

	logEvent({
		...getEventData(req),
		eventType: EventType.ProjectDelete,
		eventMetadata: {
			projectId: projectId,
		},
	})

	return res.status(StatusCodes.OK).json({
		responseStatus: "SUCCESS",
	})
})

export const getProject = requestHandler<GetProjectParams, NoParams, NoParams>(
	async (req, res) => {
		const { projectId } = req.params

		const projectData = await db.project.findFirstOrThrow({
			where: {
				projectId: projectId,
				projectOrgId: req.currentSession!.orgId,
			},
		})

		return res.status(StatusCodes.OK).json<ProjectResponse>({
			responseStatus: "SUCCESS",
			projectData: projectData,
		})
	},
)
