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
	const { projectName, projectSourceType, projectSourceUrl } = req.body

	const projectData = await db.project.create({
		data: {
			projectId: generateIdentifierFromString(
				projectName,
				IdentSuffixType.MiniCuid,
			),
			projectName: projectName,
			projectOrgId: req.currentSession!.orgId,
			projectSourceType: projectSourceType,
			projectSourceUrl: projectSourceUrl,
		},
	})

	logEvent({
		...getEventData(req),
		eventType: EventType.ProjectCreate,
		eventMetadata: {
			projectId: projectData.projectId,
		},
	})

	return res.status(StatusCodes.OK).json<ProjectResponse>({
		responseStatus: "SUCCESS",
		projectData: projectData,
	})
})
