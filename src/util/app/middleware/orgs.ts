import { UserRole } from "@prisma/client"

import { getImplicitElevatedUserRoles } from "@/util/app/helpers/orgs"
import { StatusCodes } from "@/util/defs/engraph-backend/common"
import { middlewareHandler } from "@/util/http/wrappers"

type RequireOrgAccessArgs = {
	userRole: UserRole
	includeImplicit?: boolean
}

/**
 * Defaults to UserRole.Viewer
 */
export function requireOrgAccess(
	args: RequireOrgAccessArgs = { userRole: UserRole.Viewer },
) {
	const { userRole, includeImplicit = true } = args
	const accessLevels = includeImplicit
		? getImplicitElevatedUserRoles(userRole)
		: [userRole]

	return middlewareHandler((req, res, next) => {
		const userRole = req.currentSession!.sessionUser.userRole
		const validRole = accessLevels.includes(userRole)
		if (validRole) {
			return next()
		}
		return res.status(StatusCodes.UNAUTHORIZED).json({
			responseStatus: "ERR_UNAUTHORIZED",
		})
	})
}
