import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
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
