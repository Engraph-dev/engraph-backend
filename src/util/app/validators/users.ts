import { UserLimitMap } from "@/util/config/users"
import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import { type ValidatorFunction, invalidParam } from "@/util/http/middleware"
import { EXPECT_TYPE } from "@/util/http/validators"

export const OrgUserLimit = EXPECT_TYPE<string>(
	"string",
	async (_ignoreNotNeeded, req) => {
		const userCount = await db.user.count({
			where: {
				userOrgId: req.currentSession!.orgId,
			},
		})

		const orgUserLimit =
			UserLimitMap[req.currentSession!.sessionOrg.orgPlan]

		if (userCount >= orgUserLimit) {
			return invalidParam({
				errorCode: ErrorCodes.UserQuotaExceeded,
				errorArgs: {},
			})
		}

		return {
			validationPass: true,
		}
	},
)

export const UserIdValidator = EXPECT_TYPE<string>("string", async (userId) => {
	const dbUser = await db.user.findFirst({
		where: {
			userId: userId,
		},
	})

	if (dbUser) {
		return {
			validationPass: true,
		}
	}
	return invalidParam({
		errorCode: ErrorCodes.InvalidUserId,
		errorArgs: {},
	})
})

type UserEntityValidatorArgs = {
	allowSameOrgOnly?: boolean
	allowSameUserAsReq?: boolean
}

export function UserEntityValidator(
	args: UserEntityValidatorArgs = {},
): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", async (userId, req) => {
		if (userId === req.currentSession!.userId && !args.allowSameUserAsReq) {
			return invalidParam({
				errorCode: ErrorCodes.InvalidUserId,
				errorArgs: {},
			})
		}

		const userDoc = await db.user.findFirst({
			where: {
				userId: userId,
				...(args.allowSameOrgOnly
					? { userOrgId: req.currentSession!.orgId }
					: {}),
			},
		})

		if (userDoc) {
			return {
				validationPass: true,
			}
		}

		return invalidParam({
			errorCode: ErrorCodes.InvalidUserId,
			errorArgs: {},
		})
	})
}
