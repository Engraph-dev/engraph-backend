import { WorkflowMessageSender } from "@prisma/client"

import { createCuid } from "@/util/app/helpers"
import { getCypherQuery, getQuestionResponse } from "@/util/app/helpers/ai"
import {
	ROOT_DB_CREDENTIALS,
	getGraphDb,
	queryGraphDb,
} from "@/util/app/helpers/memgraph"
import { getWorkflowPassword } from "@/util/app/helpers/workflows"
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

	const existingWorkflowMessage = await db.workflowMessage.findFirst({
		where: {
			messageContent: userQuery,
		},
	})

	if (existingWorkflowMessage) {
		const answerMessage = await db.workflowMessage.findFirst({
			where: {
				messageGroupId: existingWorkflowMessage.messageGroupId,
				messageWorkflowId: workflowId,
				messageSender: WorkflowMessageSender.AnswerAgent,
			},
		})

		if (answerMessage) {
			log(
				"workflow.query",
				LogLevel.Debug,
				`Returning cached answer ${answerMessage.messageId}`,
			)
			return res.status(StatusCodes.OK).json<QueryWorkflowResponse>({
				responseStatus: "SUCCESS",
				queryData: {
					queryResponse: "",
					queryContext: "",
					chatResponse: answerMessage.messageContent,
				},
			})
		}
	}

	const workflowPassword = getWorkflowPassword(workflowId)

	// const dbCredentials: GraphDBCredentials = {
	// 	dbName: workflowId,
	// 	userName: workflowId,
	// 	userPass: workflowPassword
	// }

	const dbCredentials = ROOT_DB_CREDENTIALS

	const [projectDoc, workflowMessages, graphDb] = await Promise.all([
		db.project.findFirstOrThrow({
			where: {
				projectId: projectId,
			},
		}),
		db.workflowMessage.findMany({
			where: {
				messageWorkflowId: workflowId,
			},
		}),
		getGraphDb(dbCredentials),
	])

	const cypherQuery = await getCypherQuery({
		projectData: projectDoc,
		workflowMessages: workflowMessages,
		dbCredentials: dbCredentials,
		graphDb: graphDb,
		userQuery: userQuery,
	})

	log("workflow.query", LogLevel.Debug, `Cypher query: ${cypherQuery}`)

	let queryResults: any

	if (cypherQuery === `""`) {
		queryResults = []
	} else {
		queryResults = await queryGraphDb(
			graphDb,
			cypherQuery,
			{},
			{ database: dbCredentials.dbName },
		)
	}

	log(
		"workflow.query",
		LogLevel.Debug,
		`Query results: ${JSON.stringify(queryResults)}`,
	)

	const answerResponse = await getQuestionResponse({
		projectData: projectDoc,
		workflowMessages: workflowMessages,
		queryResults: queryResults,
		userQuery: userQuery,
	})

	const groupId = createCuid()

	if (answerResponse) {
		await db.workflowMessage.createMany({
			data: [
				{
					messageGroupId: groupId,
					messageContent: userQuery,
					messageSender: WorkflowMessageSender.User,
					messageTimestamp: new Date(),
					messageUserId: req.currentSession!.userId,
					messageWorkflowId: workflowId,
				},
				{
					messageGroupId: groupId,
					messageContent: cypherQuery,
					messageSender: WorkflowMessageSender.QueryAgent,
					messageTimestamp: new Date(),
					messageUserId: req.currentSession!.userId,
					messageWorkflowId: workflowId,
				},
				{
					messageGroupId: groupId,
					messageContent: answerResponse,
					messageSender: WorkflowMessageSender.AnswerAgent,
					messageTimestamp: new Date(),
					messageUserId: req.currentSession!.userId,
					messageWorkflowId: workflowId,
				},
			],
		})

		return res.status(StatusCodes.OK).json<QueryWorkflowResponse>({
			responseStatus: "SUCCESS",
			queryData: {
				queryResponse: cypherQuery,
				queryContext: JSON.stringify(queryResults),
				chatResponse: answerResponse,
			},
		})
	}

	return res.status(StatusCodes.INTERNAL_ERROR).json({
		responseStatus: "ERR_INTERNAL_ERROR",
	})
})
