import { AccessLevel, UserRole } from "@prisma/client"

const elevatedAccessLevelMap: Record<AccessLevel, AccessLevel[]> = {
	[AccessLevel.Admin]: [],
	[AccessLevel.Write]: [AccessLevel.Admin],
	[AccessLevel.Read]: [AccessLevel.Admin, AccessLevel.Write],
}

export function getImplicitElevatedAccessLevels(
	accessLevel: AccessLevel,
): AccessLevel[] {
	return [accessLevel, ...elevatedAccessLevelMap[accessLevel]]
}

const elevatedUserRoleMap: Record<UserRole, UserRole[]> = {
	Owner: [],
	Admin: [UserRole.Owner],
	Developer: [UserRole.Admin, UserRole.Owner],
	Viewer: [UserRole.Admin, UserRole.Developer, UserRole.Viewer],
}

export function getImplicitElevatedUserRoles(userRole: UserRole): UserRole[] {
	return [userRole, ...elevatedUserRoleMap[userRole]]
}
