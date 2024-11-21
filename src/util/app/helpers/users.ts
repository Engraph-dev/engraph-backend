import { AccessLevel } from "@prisma/client"

import type { MiniUser } from "@/util/defs/engraph-backend/common/users"

export function getMiniUser<UserData extends MiniUser = MiniUser>(
	userData: UserData,
): MiniUser {
	return {
		userId: userData.userId,
		userFirstName: userData.userFirstName,
		userLastName: userData.userLastName,
		userMail: userData.userMail,
		userRole: userData.userRole,
		userVerified: userData.userVerified,
	}
}

const accessLevelMap: Record<AccessLevel, AccessLevel[]> = {
	[AccessLevel.Admin]: [AccessLevel.Admin, AccessLevel.Write],
	[AccessLevel.Write]: [AccessLevel.Write],
	[AccessLevel.Read]: [],
}

export function getImplicitAccessLevels(
	accessLevel: AccessLevel,
): AccessLevel[] {
	return [accessLevel, ...accessLevelMap[accessLevel]]
}
