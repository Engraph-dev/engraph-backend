import type { OrgPlan } from "@prisma/client"

export const ProjectLimitMap: Record<OrgPlan, number> = {
	None: 0,
	Starter: 1,
	Team: 5,
	Professional: 20,
	Enterprise: 50,
}
