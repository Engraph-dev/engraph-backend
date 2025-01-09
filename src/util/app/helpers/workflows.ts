import { type Workflow, WorkflowStatus } from "@prisma/client"
import { createHash } from "crypto"

import { ROOT_DB_CREDENTIALS, createGraphDB } from "@/util/app/helpers/memgraph"
import { WORKFLOW_CREDENTIAL_SECRET } from "@/util/config/workflows"
import db from "@/util/db"
import type { GitHubWorkflowMetadata } from "@/util/defs/engraph-backend/common/workflows"
import { queueWorkflowMessage } from "@/util/app/helpers/sqs"

export function getWorkflowPassword(workflowId: string) {
	const passwordHash = createHash("sha256")
		.update(workflowId)
		.update(WORKFLOW_CREDENTIAL_SECRET)
		.digest("hex")

	return passwordHash
}

type CreateWorkflowArgs = {
	projectId: string
	orgId: string
}

type CreateGithubWorkflowArgs = CreateWorkflowArgs & GitHubWorkflowMetadata

export async function createGithubWorkflow(
	args: CreateGithubWorkflowArgs,
): Promise<Workflow> {
	const { commitHash, commitRef, installationId, orgId, projectId } = args

	const workflowDoc = await db.workflow.create({
		data: {
			workflowStatus: WorkflowStatus.Queued,
			workflowProjectId: projectId,
			workflowOrgId: orgId,
			workflowMetadata: {
				commitHash: commitHash,
				commitRef: commitRef,
				installationId: installationId,
			} satisfies GitHubWorkflowMetadata,
			workflowStartTimestamp: new Date(),
			workflowEndTimestamp: null,
		},
		include: {
			workflowOrg: true,
			workflowProject: true,
		},
	})

	await provisionWorkflowResources(workflowDoc)
	await queueWorkflowMessage(workflowDoc)
	return workflowDoc
}

type ProvisionWorkflowResourcesArgs = Workflow

export async function provisionWorkflowResources(
	workflowData: ProvisionWorkflowResourcesArgs,
) {
	const { workflowId } = workflowData
	const workflowPassword = getWorkflowPassword(workflowId)

	// const dbCredentials: GraphDBCredentials = {
	// 	dbName: workflowId,
	// 	userName: workflowId,
	// 	userPass: workflowPassword
	// }

	const dbCredentials = ROOT_DB_CREDENTIALS

	await createGraphDB(dbCredentials)
}
