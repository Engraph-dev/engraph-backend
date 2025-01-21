import { AIMessage, HumanMessage } from "@langchain/core/messages"
import { WorkflowMessageSender } from "@prisma/client"

import { ROOT_DB_CREDENTIALS } from "@/util/app/helpers/memgraph"
import { getWorkflowPassword } from "@/util/app/helpers/workflows"
import {
	CustomChain,
	getLangchainGraphInstance,
	workflowLLM,
} from "@/util/app/langchain"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type QueryWorkflowBody,
	type QueryWorkflowParams,
	QueryWorkflowResponse,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/workflows/[workflowId]"
import { requestHandler } from "@/util/http/wrappers"
import { LogLevel, log } from "@/util/log"

const INPUT_KEY = "userQuery" as const

export const queryWorkflow = requestHandler<
	QueryWorkflowParams,
	QueryWorkflowBody,
	NoParams
>(async (req, res) => {
	const { projectId, workflowId } = req.params
	const { userQuery } = req.body

	const workflowPassword = getWorkflowPassword(workflowId)

	// const dbCredentials: GraphDBCredentials = {
	// 	dbName: workflowId,
	// 	userName: workflowId,
	// 	userPass: workflowPassword
	// }

	const dbCredentials = ROOT_DB_CREDENTIALS

	const [projectDoc, previousMessages, chainGraph] = await Promise.all([
		db.project.findFirstOrThrow({
			where: {
				projectId: projectId,
			},
		}),
		db.workflowMessage.findMany({
			where: {
				messageWorkflowId: workflowId,
				messageUserId: req.currentSession!.userId,
			},
			orderBy: {
				messageIndex: "asc",
			},
		}),
		getLangchainGraphInstance(dbCredentials),
	])

	const mappedMessages = previousMessages.map((prevMessage) => {
		const { messageSender, messageContent } = prevMessage
		if (messageSender === WorkflowMessageSender.User) {
			return new HumanMessage(messageContent)
		} else if (messageSender === WorkflowMessageSender.Assistant) {
			return new AIMessage(messageContent)
		}
		return undefined
	})

	const finalMessages = mappedMessages.filter((mappedMessage) => {
		return mappedMessage !== undefined
	})

	finalMessages.push(new HumanMessage(userQuery))

	const langChain = CustomChain.fromLLM({
		graph: chainGraph,
		llm: workflowLLM,
		inputKey: INPUT_KEY,
	})

	langChain.verbose = true

	db.workflowMessage.create({
		data: {
			messageSender: WorkflowMessageSender.User,
			messageContent: userQuery,
			messageTimestamp: new Date(),
			messageWorkflowId: workflowId,
			messageUserId: req.currentSession!.userId,
		},
	})

	const responseContent = (await langChain.invoke({
		[INPUT_KEY]: userQuery,
	})) as any

	log("workflow.query", LogLevel.Debug, responseContent)

	res.status(StatusCodes.OK).json<QueryWorkflowResponse>({
		responseStatus: "SUCCESS",
		queryResponse: responseContent,
	})

	db.workflowMessage.create({
		data: {
			messageSender: WorkflowMessageSender.Assistant,
			messageContent: responseContent,
			messageTimestamp: new Date(),
			messageWorkflowId: workflowId,
			messageUserId: req.currentSession!.userId,
		},
	})
})
