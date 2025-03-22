import {
	type Project,
	type WorkflowMessage,
	WorkflowMessageSender,
} from "@prisma/client"
import type { Driver } from "neo4j-driver"
import { OpenAI } from "openai"

import {
	type GraphDBCredentials,
	queryGraphDb,
} from "@/util/app/helpers/memgraph"
import {
	ANSWER_LLM,
	ANSWER_LLM_CONFIG,
	CYPHER_LLM,
	CYPHER_LLM_CONFIG,
	OPENAI_API_KEY,
} from "@/util/config/ai"

export const OpenAIClient = new OpenAI({
	apiKey: OPENAI_API_KEY,
})

const SCHEMA_QUERY = `
CALL llm_util.schema("raw")
YIELD *
RETURN *
`

let dbSchema: string | undefined = undefined

type GetSchemaArgs = {
	graphDb: Driver
	dbCredentials: GraphDBCredentials
}

export async function getSchema(args: GetSchemaArgs) {
	const { dbCredentials, graphDb } = args
	if (dbSchema !== undefined) {
		return dbSchema
	}

	const queryResults = await queryGraphDb(
		graphDb,
		SCHEMA_QUERY,
		{},
		{
			database: dbCredentials.dbName,
		},
	)

	console.log(queryResults)
}

type GetCypherQueryPromptArgs = {
	projectData: Project
	graphDb: Driver
	dbCredentials: GraphDBCredentials
}

export function getCypherQueryPrompt(args: GetCypherQueryPromptArgs) {
	const { dbCredentials, graphDb, projectData } = args
	const { projectType } = projectData

	return `
	Your task is to generate a graph cypher query to a specific user question. 
	The graph database contains information about the project's ${projectType} files and symbols.
	Reply only with a cypher query, and nothing else.

	The graph database nodes are as follows
	Module: This is a ${projectType} file with the following properties
		- moduleSourceCode: The content of the file
		- modulePath: The full path of the file
	ExternalModule: This is a file, module or package outside the project.
	Symbol: A symbol is a class, function, variable, etc. with the following properties
		- symbolSourceCode: The code of the symbol
		- symbolIdentifier: The name of the symbol
		- symbolPath: The file where the symbol is declared

	The graph database edges are as follows.
	DEPENDS_ON: A module or symbol depends on another module or symbol.
	EXPORTS: A module exports a symbol for use to other modules or symbols,
	
	Always try to query dependencies or dependents of a node for additional data.`
}

type GetAnswerPromptArgs = {
	projectData: Project
}

export function getAnswerPrompt(args: GetAnswerPromptArgs) {
	const {
		projectData: { projectType },
	} = args
	return `
	Your task is to explain and document source code. 
	Include documentation links to relevant sources wherever applicable.
	Give examples with explanations if possible. 
	DO NOT ADD YOUR OWN OPINION about the implementation or safety of the program.
	Always answer in a authoritative manner.
	If you cannot answer with the given data, return an empty string "".

	The data may be shaped as follows
	Module: This is a ${projectType} file with the following properties
		- moduleSourceCode: The content of the file
		- modulePath: The full path of the file
	ExternalModule: This is a file, module or package outside the project.
	Symbol: A symbol is a class, function, variable, etc. with the following properties
		- symbolSourceCode: The code of the symbol
		- symbolIdentifier: The name of the symbol
		- symbolPath: The file where the symbol is declared
	`
}

type GetCypherQueryArgs = {
	userQuery: string
	projectData: Project
	workflowMessages: WorkflowMessage[]
	graphDb: Driver
	dbCredentials: GraphDBCredentials
}

export async function getCypherQuery(args: GetCypherQueryArgs) {
	const { dbCredentials, graphDb, projectData, workflowMessages, userQuery } =
		args
	const cypherPrompt = await getCypherQueryPrompt({
		projectData: projectData,
		graphDb: graphDb,
		dbCredentials: dbCredentials,
	})

	const filteredMessages = workflowMessages.filter((workflowMessage) => {
		// Do not add answer messages in the query
		if (
			workflowMessage.messageSender ===
				WorkflowMessageSender.AnswerAgent ||
			workflowMessage.messageSender === WorkflowMessageSender.ContextAgent
		) {
			return false
		}
		return true
	})

	const mappedMessages = filteredMessages.map((workflowMessage) => {
		if (workflowMessage.messageSender === WorkflowMessageSender.User) {
			return {
				role: "user" as const,
				content: workflowMessage.messageContent,
			}
		} else {
			return {
				role: "assistant" as const,
				content: workflowMessage.messageContent,
			}
		}
	})

	mappedMessages.push({
		role: "user",
		content: userQuery,
	})

	const messagesWithDevPrompt = [
		{
			role: "developer" as const,
			content: cypherPrompt,
		},
		...mappedMessages,
	]

	const completionResponse = await OpenAIClient.chat.completions.create({
		messages: messagesWithDevPrompt,
		model: CYPHER_LLM,
		temperature: CYPHER_LLM_CONFIG.temperature,
	})

	if (completionResponse.choices.length) {
		const completionChoice = completionResponse.choices[0]
		return completionChoice.message.content ?? ""
	}

	// Return an empty query in case of no completion
	return ""
}

type GetQuestionResponseArgs = {
	projectData: Project
	userQuery: string
	queryResults: any
	workflowMessages: WorkflowMessage[]
}

export async function getQuestionResponseStream(args: GetQuestionResponseArgs) {
	const { userQuery, queryResults, workflowMessages, projectData } = args

	const answerPrompt = getAnswerPrompt({
		projectData: projectData,
	})

	const filteredMessages = workflowMessages.filter((workflowMessage) => {
		// Do not add query messages in the query
		if (
			workflowMessage.messageSender === WorkflowMessageSender.QueryAgent
		) {
			return false
		}
		return true
	})

	const mappedMessages = filteredMessages.map((workflowMessage) => {
		if (
			workflowMessage.messageSender === WorkflowMessageSender.User ||
			workflowMessage.messageSender === WorkflowMessageSender.ContextAgent
		) {
			return {
				role: "user" as const,
				content: workflowMessage.messageContent,
			}
		} else {
			return {
				role: "assistant" as const,
				content: workflowMessage.messageContent,
			}
		}
	})

	mappedMessages.push(
		{
			role: "user",
			content: `\`\`\`\n${JSON.stringify(queryResults)}\n\`\`\``,
		},
		{
			role: "user",
			content: userQuery,
		},
	)

	const messagesWithDevPrompt = [
		{
			role: "developer" as const,
			content: answerPrompt,
		},
		...mappedMessages,
	]

	const completionResponseStream = await OpenAIClient.chat.completions.create(
		{
			messages: messagesWithDevPrompt,
			model: ANSWER_LLM,
			temperature: ANSWER_LLM_CONFIG.temperature,
			stream: true,
		},
	)

	return completionResponseStream
}
