import { AccessLevel } from "@prisma/client"

import { getImplicitElevatedAccessLevels } from "@/util/app/helpers/orgs"
import { ProjectLimitMap } from "@/util/config/projects"
import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import { type ValidatorFunction, invalidParam } from "@/util/http/middleware"
import { EXPECT_TYPE } from "@/util/http/validators"

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

type ProjectEntityValidatorArgs = {
	allowSameOrgOnly?: boolean
}

export function ProjectEntityValidator(
	args: ProjectEntityValidatorArgs = {},
): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", async (projectId, req) => {
		const projectDoc = await db.project.findFirst({
			where: {
				projectId: projectId,
				projectOrgId: args.allowSameOrgOnly
					? req.currentSession!.orgId
					: undefined,
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
	})
}

type ProjectAccessValidatorArgs = {
	includeImplicit: boolean
}

function generateProjectAccessValidator(
	accessLevel: AccessLevel,
): (args: ProjectAccessValidatorArgs) => ValidatorFunction<string> {
	return function (args) {
		const targetRoles = args.includeImplicit
			? getImplicitElevatedAccessLevels(accessLevel)
			: [accessLevel]
		return EXPECT_TYPE<string>("string", async (projectId, req) => {
			const projectDoc = await db.project.findFirst({
				where: {
					projectId: projectId,
					projectOrgId: req.currentSession!.orgId,
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
