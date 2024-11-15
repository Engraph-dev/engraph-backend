import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type { ValidatorFunction } from "@/util/http/middleware"
import { EXPECT_TYPE } from "@/util/http/validators"

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
	return {
		validationPass: false,
		errorCode: ErrorCodes.InvalidUserId,
	}
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
			return {
				validationPass: false,
				errorCode: ErrorCodes.InvalidUserId,
			}
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

		return {
			validationPass: false,
			errorCode: ErrorCodes.InvalidUserId,
		}
	})
}
