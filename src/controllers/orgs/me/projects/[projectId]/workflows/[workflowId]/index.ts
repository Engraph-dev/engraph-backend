import type { NoParams } from "@/util/defs/engraph-backend/common"
import type { QueryWorkflowParams } from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/workflows/[workflowId]"
import { requestHandler } from "@/util/http/wrappers"

export const queryWorkflow = requestHandler<
	QueryWorkflowParams,
	NoParams,
	NoParams
>(async (req, res) => {
	const { projectId, workflowId } = req.params

	
})
