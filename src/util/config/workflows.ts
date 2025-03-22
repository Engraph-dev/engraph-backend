import { OrgPlan } from "@prisma/client"

import { envVar } from "@/util/env"

export const MAX_WORKFLOW_COUNT_PER_PROJECT_PER_MONTH: Record<OrgPlan, number> =
	{
		[OrgPlan.None]: 0,
		[OrgPlan.Starter]: 5,
		[OrgPlan.Team]: 10,
		[OrgPlan.Professional]: 25,
		[OrgPlan.Enterprise]: 50,
	}

export const WORKFLOW_CREDENTIAL_SECRET = envVar("WORKFLOW_CREDENTIAL_SECRET")

export const WORKFLOW_CONTEXT_MESSAGE_COUNT = 5
// 5 messages of each type