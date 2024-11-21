import { AccessLevel, ProjectSourceType } from "@prisma/client"

import { getImplicitAccessLevels } from "@/util/app/helpers/users"
import { ProjectLimitMap } from "@/util/config/projects"
import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type { CreateProjectBody } from "@/util/defs/engraph-backend/orgs/me/projects"
import {
	type BatchValidator,
	type ValidatorFunction,
	invalidParam,
} from "@/util/http/middleware"
import { EXPECT_TYPE, IN_ENUM, MATCH_URL } from "@/util/http/validators"

type ProjectSource = {
	origin: string
	protocol: string
}

const projectSourceMap: Record<ProjectSourceType, ProjectSource> = {
	[ProjectSourceType.GitHub]: {
		origin: "github.com",
		protocol: "https",
	},
}

export const ProjectSourceValidator: BatchValidator<
	Pick<CreateProjectBody, "projectSourceType" | "projectSourceUrl">
> = {
	targetParams: ["projectSourceType", "projectSourceUrl"],
	validatorFunction: async ({ projectSourceType, projectSourceUrl }, req) => {
		const targetProjectSource = projectSourceMap[projectSourceType]

		if (!targetProjectSource) {
			const enumValidator = IN_ENUM(ProjectSourceType)
			return enumValidator(projectSourceType, req)
		}

		const url = new URL(projectSourceUrl)

		const urlValidator = MATCH_URL({
			origin: targetProjectSource.origin,
			protocol: targetProjectSource.protocol,
		})

		return urlValidator(projectSourceUrl, req)
	},
}

export const OrgProjectLimit = EXPECT_TYPE<string>(
	"string",
	async (_ignoreNotNeeded, req) => {
		const projectCount = await db.project.count({
			where: {
				projectOrgId: req.currentSession!.orgId,
			},
		})

		const currentOrgPlan = req.currentSession!.sessionOrg.orgPlan

		const maxProjectCount = ProjectLimitMap[currentOrgPlan]

		if (projectCount >= maxProjectCount) {
			return invalidParam({
				errorCode: ErrorCodes.ProjectQuotaExceeded,
				errorArgs: {},
			})
		}

		return {
			validationPass: true,
		}
	},
)

export const ProjectIdSameOrgValidator = EXPECT_TYPE<string>(
	"string",
	async (projectId, req) => {
		const projectDoc = await db.project.findFirst({
			where: {
				projectId: projectId,
				projectOrgId: req.currentSession!.orgId,
			},
		})

		if (projectDoc) {
			return {
				validationPass: true,
			}
		}

		return invalidParam({
			errorCode: ErrorCodes.ProjectIdInvalid,
			errorArgs: {},
		})
	},
)

type ProjectAccessValidatorArgs = {
	includeImplicit: boolean
}

function generateProjectAccessValidator(
	accessLevel: AccessLevel,
): (args: ProjectAccessValidatorArgs) => ValidatorFunction<string> {
	return function (args) {
		const targetRoles = args.includeImplicit
			? getImplicitAccessLevels(accessLevel)
			: [accessLevel]
		return EXPECT_TYPE<string>("string", async (projectId, req) => {
			const projectDoc = await db.project.findFirst({
				where: {
					projectId: projectId,
					OR: [
						{
							projectTeams: {
								some: {
									accessLevel: {
										in: targetRoles,
									},
									linkedTeam: {
										teamUsers: {
											some: {
												userId: req.currentSession!
													.userId,
											},
										},
									},
								},
							},
						},
						{
							projectUsers: {
								some: {
									accessLevel: { in: targetRoles },
									userId: req.currentSession!.userId,
								},
							},
						},
					],
				},
			})

			if (projectDoc) {
				return {
					validationPass: true,
				}
			}

			return invalidParam({
				errorCode: ErrorCodes.ProjectAccessMissing,
				errorArgs: {},
			})
		})
	}
}

export const ProjectReadAccessValidator = generateProjectAccessValidator(
	AccessLevel.Read,
)
export const ProjectWriteAccessValidator = generateProjectAccessValidator(
	AccessLevel.Write,
)
export const ProjectAdminAccessValidator = generateProjectAccessValidator(
	AccessLevel.Admin,
)
// Generat
