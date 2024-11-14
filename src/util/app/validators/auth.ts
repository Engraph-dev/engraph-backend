import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import { EXPECT_TYPE } from "@/util/http/validators"

export const UnusedEmail = EXPECT_TYPE<string>("string", async (userMail) => {
	const userWithMail = await db.user.findFirst({
		where: {
			userMail: userMail,
		},
	})

	if (userMail) {
		return {
			validationPass: false,
			errorCode: ErrorCodes.IdentityInUse,
		}
	}

	return {
		validationPass: true,
	}
})
