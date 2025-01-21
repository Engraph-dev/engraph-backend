import { WorkflowStatus } from "@prisma/client"

import db from "@/util/db"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type { ProjectIdWorkflowId } from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/workflows"
import { type BatchValidator, invalidParam } from "@/util/http/middleware"

type ProjectWorkflowEntityBatchValidatorArgs = {
	workflowStatuses?: WorkflowStatus[]
}

export function ProjectWorkflowEntityBatchValidator(
	args: ProjectWorkflowEntityBatchValidatorArgs,
): BatchValidator<
	ProjectIdWorkflowId,
	ProjectIdWorkflowId,
	NoParams,
	NoParams
> {
	const { workflowStatuses = Object.values(WorkflowStatus) } = args

	return {
		targetParams: ["projectId", "workflowId"],
		validatorFunction: async ({ projectId, workflowId }, req) => {
			const workflowDoc = await db.workflow.findFirst({
				where: {
					workflowId: workflowId,
					workflowProjectId: projectId,
					workflowOrgId: req.currentSession!.orgId,
					workflowStatus: {
						in: workflowStatuses,
					},
				},
			})

			if (workflowDoc) {
				return {
					validationPass: true,
				}
			}

			return invalidParam({
				errorCode: ErrorCodes.WorkflowIdInvalid,
				errorArgs: {},
			})
		},
	}
}
