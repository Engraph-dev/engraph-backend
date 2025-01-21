import { WorkflowStatus } from "@prisma/client"

import { getProjectWorkflows } from "@/controllers/orgs/me/projects/[projectId]/workflows"

import { workflowIdRouter } from "@/routers/orgs/me/projects/[projectId]/workflows/[workflowId]"

import { WithPagedQueryValidator } from "@/util/app/validators/common"
import { ProjectWorkflowEntityBatchValidator } from "@/util/app/validators/workflow"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	GetProjectWorkflowsParams,
	GetProjectWorkflowsQuery,
	ProjectIdWorkflowId,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/workflows"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { IN_ENUM, NULLISH } from "@/util/http/validators"

const projectWorkflowsRouter = Router()

projectWorkflowsRouter.get<
	"/",
	GetProjectWorkflowsParams,
	NoParams,
	NoParams,
	GetProjectWorkflowsQuery,
	NoParams
>(
	"/",
	validateParams({
		queryParams: WithPagedQueryValidator<GetProjectWorkflowsQuery>({
			workflowStatus: NULLISH(IN_ENUM(WorkflowStatus)),
		}),
	}),
	getProjectWorkflows,
)

projectWorkflowsRouter.use(
	"/:workflowId",
	validateParams<ProjectIdWorkflowId>({
		batchValidators: {
			urlParams: [
				ProjectWorkflowEntityBatchValidator({
					workflowStatuses: [WorkflowStatus.WorkflowCompleted],
				}),
			],
		},
	}),
	workflowIdRouter,
)

export { projectWorkflowsRouter }
