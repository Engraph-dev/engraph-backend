import { UserRole } from "@prisma/client"

import { getImplicitElevatedUserRoles } from "@/util/app/helpers/orgs"
import { StatusCodes } from "@/util/defs/engraph-backend/common"
import { middlewareHandler } from "@/util/http/wrappers"

type RequireOrgAccessArgs = {
	userRole: UserRole
	includeImplicit?: boolean
}

/**
 * Middleware to require a minimum user role to access a resource
 * @param args.userRole The minimum user role required to access the resource
 * @param args.includeImplicit Whether to include implicit elevated roles in the check
 */
export function requireOrgRole(
	args: RequireOrgAccessArgs = {
		userRole: UserRole.Viewer,
		includeImplicit: true,
	},
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
