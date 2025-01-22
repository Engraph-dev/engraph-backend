import {
	getWorkflow,
	queryWorkflow,
} from "@/controllers/orgs/me/projects/[projectId]/workflows/[workflowId]"

import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	GetWorkflowParams,
	QueryWorkflowBody,
	QueryWorkflowParams,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/workflows/[workflowId]"
import { cacheEndpoint, validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { STR_NOT_EMPTY } from "@/util/http/validators"

const workflowIdRouter = Router()

workflowIdRouter.get<
	"/",
	GetWorkflowParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>("/", cacheEndpoint(), getWorkflow)

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
