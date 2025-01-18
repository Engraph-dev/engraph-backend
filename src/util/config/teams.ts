import type { OrgPlan } from "@prisma/client"

export const TeamLimitMap: Record<OrgPlan, number> = {
	None: 1,
	Starter: 5,
	Team: 10,
	Professional: 20,
	Enterprise: 50,
}
