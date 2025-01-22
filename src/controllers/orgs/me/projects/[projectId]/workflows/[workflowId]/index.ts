import { WorkflowMessageSender } from "@prisma/client"

import {
	ROOT_DB_CREDENTIALS,
	getGraphDb,
	queryGraphDb,
} from "@/util/app/helpers/memgraph"
import { getWorkflowPassword } from "@/util/app/helpers/workflows"
import {
	CustomChain,
	getLangchainGraphInstance,
	workflowLLM,
} from "@/util/app/langchain"
import { LANGCHAIN_VERBOSE } from "@/util/config/langchain"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	GetWorkflowParams,
	GetWorkflowResponse,
	type QueryWorkflowBody,
	type QueryWorkflowParams,
	QueryWorkflowResponse,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]/workflows/[workflowId]"
import { requestHandler } from "@/util/http/wrappers"
import { LogLevel, log } from "@/util/log"

const INPUT_KEY = "userQuery" as const
const OUTPUT_KEY = "queryResponse" as const

export const getWorkflow = requestHandler<
	GetWorkflowParams,
	NoParams,
	NoParams
>(async (req, res) => {
	const { projectId, workflowId } = req.params

	// const graphCredentials: GraphDBCredentials = {
	// 	dbName: workflowId,
	// 	userName: workflowId,
	// 	userPass: getWorkflowPassword(workflowId),
	// }

	const graphCredentials = ROOT_DB_CREDENTIALS

	const graphDb = await getGraphDb(graphCredentials)

	const queryResults = await Promise.all([
		queryGraphDb(graphDb, `MATCH (n:Module) RETURN n`),
		queryGraphDb(graphDb, `MATCH (n:Symbol) RETURN n`),
		queryGraphDb(graphDb, `MATCH (n:ExternalModule) RETURN n`),
		queryGraphDb(graphDb, `MATCH (n:ExternalSymbol) RETURN n`),
		queryGraphDb(graphDb, `MATCH ()-[r]->() RETURN r`),
	])

	const mapNode = (graphNode: any) => {
		return graphNode._fields
	}

	const [
		moduleNodes,
		symbolNodes,
		externalModuleNodes,
		externalSymbolNodes,
		nodeLinks,
	] = await Promise.all(
		queryResults.map((queryResult) => {
			return queryResult.map(mapNode)
		}),
	)

	return res.status(StatusCodes.OK).json<GetWorkflowResponse>({
		responseStatus: "SUCCESS",
		workflowData: {
			moduleNodes: moduleNodes,
			symbolNodes: symbolNodes,
			externalModuleNodes: externalModuleNodes,
			externalSymbolNodes: externalSymbolNodes,
			nodeLinks: nodeLinks,
		},
	})
})

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

	const [projectDoc, chainGraph] = await Promise.all([
		db.project.findFirstOrThrow({
			where: {
				projectId: projectId,
			},
		}),
		getLangchainGraphInstance(dbCredentials),
	])

	// const mappedMessages = previousMessages.map((prevMessage) => {
	// 	const { messageSender, messageContent } = prevMessage
	// 	if (messageSender === WorkflowMessageSender.User) {
	// 		return new HumanMessage(messageContent)
	// 	} else if (messageSender === WorkflowMessageSender.Assistant) {
	// 		return new AIMessage(messageContent)
	// 	}
	// 	return undefined
	// })

	// const finalMessages = mappedMessages.filter((mappedMessage) => {
	// 	return mappedMessage !== undefined
	// })

	// finalMessages.push(new HumanMessage(userQuery))

	const langChain = CustomChain.fromLLM({
		graph: chainGraph,
		llm: workflowLLM,
		inputKey: INPUT_KEY,
		outputKey: OUTPUT_KEY,
	})

	langChain.verbose = LANGCHAIN_VERBOSE

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
		projectType: projectDoc.projectType,
	})) as any

	const responseText = responseContent[OUTPUT_KEY] as string

	log("workflow.query", LogLevel.Debug, responseText)

	res.status(StatusCodes.OK).json<QueryWorkflowResponse>({
		responseStatus: "SUCCESS",
		queryData: {
			chatResponse: responseText,
			execContext: responseContent.context,
			execQuery: responseContent.query,
		},
	})

	db.workflowMessage.create({
		data: {
			messageSender: WorkflowMessageSender.Assistant,
			messageContent: responseText,
			messageTimestamp: new Date(),
			messageWorkflowId: workflowId,
			messageUserId: req.currentSession!.userId,
		},
	})
})
