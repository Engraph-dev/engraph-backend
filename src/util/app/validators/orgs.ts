import { UserRole } from "@prisma/client"

import db from "@/util/db"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import { EXPECT_TYPE } from "@/util/http/validators"

type OrgCheckArgs = {
	userRoles?: UserRole[]
}

export const OrgIdValidator = EXPECT_TYPE<string>("string", async (orgId) => {
	const orgExists = await db.org.findFirst({
		where: {
			orgId: orgId,
		},
	})

	if (orgExists) {
		return {
			validationPass: true,
		}
	}

	return {
		validationPass: false,
		errorCode: ErrorCodes.InvalidOrgId,
	}
})

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
