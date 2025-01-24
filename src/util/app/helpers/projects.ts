import { AccessLevel } from "@prisma/client"

const projectAccessHierarchy: Record<AccessLevel, number> = {
	[AccessLevel.Read]: 1,
	[AccessLevel.Write]: 2,
	[AccessLevel.Admin]: 3,
}

export function getMaxProjectAccessLevel(accessLevels: AccessLevel[]) {
	if (accessLevels.length === 0) {
		return null
	}

	const accessEntries = Object.entries(projectAccessHierarchy) as [
		AccessLevel,
		number,
	][]

	const mappedIndices = accessLevels.map((accessLevel) => {
		return projectAccessHierarchy[accessLevel]
	})

	const maxAccessLevel = Math.max(...mappedIndices)

	const inverseLookup = accessEntries.find((accessEntry) => {
		const [accessLevel, accessIndex] = accessEntry
		return accessIndex === maxAccessLevel
	})

	return inverseLookup ? inverseLookup[0] : null
}
