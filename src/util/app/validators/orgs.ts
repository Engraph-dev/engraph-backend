import { UserRole } from "@prisma/client"

import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/errors"
import { EXPECT_TYPE } from "@/util/http/validators"

type OrgCheckArgs = {
	userRoles?: UserRole[]
}

export function OrgAccessCheck(args?: OrgCheckArgs) {
	const { userRoles = Object.values(UserRole) } = args || {}
	return EXPECT_TYPE<string>("string", async (orgId, req) => {
		const validOrg = await db.org.findFirst({
			where: {
				orgId: orgId,
				orgUsers: {
					some: {
						userId: req.currentSession!.userId,
						userRole: {
							in: userRoles,
						},
					},
				},
			},
		})

		if (validOrg) {
			return {
				validationPass: true,
			}
		}

		return {
			validationPass: false,
			errorCode: ErrorCodes.InvalidOrgId,
		}
	})
}
