import { queryWorkflow } from "@/controllers/orgs/me/projects/[projectId]/workflows/[workflowId]"

import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	QueryWorkflowBody,
	QueryWorkflowParams,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/workflows/[workflowId]"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { STR_NOT_EMPTY } from "@/util/http/validators"

const workflowIdRouter = Router()

workflowIdRouter.post<
	"/",
	QueryWorkflowParams,
	NoParams,
	QueryWorkflowBody,
	NoParams,
	NoParams
>(
	"/",
	validateParams({
		bodyParams: {
			userQuery: STR_NOT_EMPTY(),
		},
	}),
	queryWorkflow,
)

export { workflowIdRouter }
