import { TeamLimitMap } from "@/util/config/teams"
import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import { type ValidatorFunction, invalidParam } from "@/util/http/middleware"
import { EXPECT_TYPE } from "@/util/http/validators"

export const OrgTeamLimit = EXPECT_TYPE<string>(
	"string",
	async (_ignoreNotNeeded, req) => {
		const teamCount = await db.team.count({
			where: {
				teamOrgId: req.currentSession!.orgId,
			},
		})

		const orgTeamLimit =
			TeamLimitMap[req.currentSession!.sessionOrg.orgPlan]

		if (teamCount >= orgTeamLimit) {
			return invalidParam({
				errorCode: ErrorCodes.TeamQuotaExceeded,
				errorArgs: {},
			})
		}

		return {
			validationPass: true,
		}
	},
)

export const TeamIdValidator = EXPECT_TYPE<string>(
	"string",
	async (teamId, req) => {
		const dbTeam = await db.team.findFirst({
			where: {
				teamId: teamId,
				teamOrgId: req.currentSession!.orgId,
			},
		})

		if (dbTeam) {
			return {
				validationPass: true,
			}
		}
		return invalidParam({
			errorCode: ErrorCodes.InvalidTeamId,
			errorArgs: {},
		})
	},
)

type TeamEntityValidatorArgs = {
	allowSameOrgOnly?: boolean
}

export function TeamEntityValidator(
	args: TeamEntityValidatorArgs = {},
): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", async (teamId, req) => {
		const teamDoc = await db.team.findFirst({
			where: {
				teamId: teamId,
				...(args.allowSameOrgOnly
					? { teamOrgId: req.currentSession!.orgId }
					: {}),
			},
		})

		if (teamDoc) {
			return {
				validationPass: true,
			}
		}

		return invalidParam({
			errorCode: ErrorCodes.InvalidTeamId,
			errorArgs: {},
		})
	})
}
