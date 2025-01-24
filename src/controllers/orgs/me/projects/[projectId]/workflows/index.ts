import { WorkflowStatus } from "@prisma/client"

import { getQueryOffset } from "@/util/app/helpers"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type GetProjectWorkflowsParams,
	type GetProjectWorkflowsQuery,
	GetProjectWorkflowsResponse,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/workflows"
import { requestHandler } from "@/util/http/wrappers"

export const getProjectWorkflows = requestHandler<
	GetProjectWorkflowsParams,
	NoParams,
	GetProjectWorkflowsQuery
>(async (req, res) => {
	const { projectId } = req.params
	const { workflowStatus } = req.query

	const resolvedWorkflowStatus = workflowStatus
		? [workflowStatus]
		: Object.values(WorkflowStatus)

	const projectWorkflows = await db.workflow.findMany({
		where: {
			workflowProjectId: projectId,
			workflowOrgId: req.currentSession!.orgId,
			workflowStatus: {
				in: resolvedWorkflowStatus,
			},
		},
		orderBy: {
			workflowStartTimestamp: "desc",
		},
		...getQueryOffset(req.query),
	})

	return res.status(StatusCodes.OK).json<GetProjectWorkflowsResponse>({
		responseStatus: "SUCCESS",
		projectWorkflows: projectWorkflows,
	})
})
