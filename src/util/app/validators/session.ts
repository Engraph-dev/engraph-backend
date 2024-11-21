import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import { invalidParam } from "@/util/http/middleware"
import { EXPECT_TYPE } from "@/util/http/validators"

type SessionEntityValidatorArgs = {
	activeOnly?: boolean
}
export const SessionEntityValidator = (args: SessionEntityValidatorArgs) => {
	return EXPECT_TYPE<string>("string", async (sessionId) => {
		const dbSession = await db.session.findFirst({
			where: {
				sessionId: sessionId,
				...(args.activeOnly
					? { sessionEndTimestamp: { gt: new Date() } }
					: {}),
			},
		})
		if (dbSession) {
			return {
				validationPass: true,
			}
		}
		return invalidParam({
			errorCode: ErrorCodes.InvalidSessionId,
			errorArgs: {},
		})
	})
}
