import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type { ValidatorFunction } from "@/util/http/middleware"
import { EXPECT_TYPE } from "@/util/http/validators"

type UnusedEmailArgs = {
	sameOrg?: boolean
}

export function UnusedEmail(
	args: UnusedEmailArgs = {},
): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", async (userMail, req) => {
		const userWithMail = await db.user.findFirst({
			where: {
				userMail: userMail,
				...(args.sameOrg
					? { userOrgId: req.currentSession!.orgId }
					: {}),
			},
		})

		if (userWithMail) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.IdentityInUse,
			}
		}

		return {
			validationPass: true,
		}
	})
}
