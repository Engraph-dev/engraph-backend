import { AccessLevel, EventType } from "@prisma/client"

import { getEventData, logEvent } from "@/util/app/events"
import { getQueryOffset } from "@/util/app/helpers"
import {
	IdentSuffixType,
	generateIdentifierFromString,
} from "@/util/app/helpers/data-handlers"
import db from "@/util/db"
import { NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type CreateProjectBody,
	type GetProjectsQuery,
	GetProjectsResponse,
	ProjectResponse,
} from "@/util/defs/engraph-backend/orgs/me/projects"
import { requestHandler } from "@/util/http/wrappers"

export const getProjects = requestHandler<NoParams, NoParams, GetProjectsQuery>(
	async (req, res) => {
		const accessLevel = req.query.accessLevel
			? [req.query.accessLevel]
			: Object.values(AccessLevel)

		const orgProjects = await db.project.findMany({
			where: {
				projectOrgId: req.currentSession!.orgId,
				OR: [
					{
						projectUsers: {
							some: {
								accessLevel: {
									in: accessLevel,
								},
								userId: req.currentSession!.userId,
							},
						},
					},
					{
						projectTeams: {
							some: {
								accessLevel: {
									in: accessLevel,
								},
								linkedTeam: {
									teamUsers: {
										some: {
											userId: req.currentSession!.userId,
										},
									},
								},
							},
						},
					},
				],
			},
			...getQueryOffset(req.query),
		})

		return res.status(StatusCodes.OK).json<GetProjectsResponse>({
			responseStatus: "SUCCESS",
			orgProjects: orgProjects,
		})
	},
)

export const createProject = requestHandler<
	NoParams,
	CreateProjectBody,
	NoParams
>(async (req, res) => {
	const { projectName, projectSourceType, projectIdentifier, projectType } =
		req.body

	const projectData = await db.project.create({
		data: {
			projectId: generateIdentifierFromString(
				projectName,
				IdentSuffixType.MiniCuid,
			),
			projectName: projectName,
			projectOrgId: req.currentSession!.orgId,
			projectSourceType: projectSourceType,
			projectIdentifier: projectIdentifier,
			projectType: projectType,
		},
	})

	logEvent({
		...getEventData(req),
		eventType: EventType.ProjectCreate,
		eventMetadata: {
			projectId: projectData.projectId,
		},
	})

	await db.projectUserAccess.create({
		data: {
			projectId: projectData.projectId,
			userId: req.currentSession!.userId,
			accessLevel: AccessLevel.Admin,
		},
	})

	return res.status(StatusCodes.OK).json<ProjectResponse>({
		responseStatus: "SUCCESS",
		projectData: projectData,
	})
})
