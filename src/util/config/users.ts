import type { OrgPlan } from "@prisma/client"

export const UserLimitMap: Record<OrgPlan, number> = {
	None: 1,
	Starter: 10,
	Team: 50,
	Professional: 200,
	Enterprise: 500,
}
