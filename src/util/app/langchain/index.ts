import {
	type FromLLMInput,
	GraphCypherQAChain,
} from "@langchain/community/chains/graph_qa/cypher"
import { MemgraphGraph } from "@langchain/community/graphs/memgraph_graph"
import { ChatOpenAI } from "@langchain/openai"
import { LLMChain } from "langchain/chains"
import "neo4j-driver"

import type { GraphDBCredentials } from "@/util/app/helpers/memgraph"
import {
	CYPHER_GENERATION_PROMPT,
	CYPHER_QA_PROMPT,
} from "@/util/app/langchain/prompts"
import { OPENAI_API_KEY } from "@/util/config/ai"
import { MEMGRAPH_URI } from "@/util/config/memgraph"
import { LogLevel, log } from "@/util/log"

export const workflowLLM = new ChatOpenAI({
	apiKey: OPENAI_API_KEY,
	model: "gpt-4o",
	temperature: 0.5,
})

export async function getLangchainGraphInstance(
	dbCredentials: GraphDBCredentials,
) {
	const chainGraph = new MemgraphGraph({
		url: MEMGRAPH_URI,
		password: dbCredentials.userPass,
		username: dbCredentials.userName,
		database: dbCredentials.dbName,
	})

	await chainGraph.refreshSchema()

	return chainGraph
}

type FromLLMArgs = FromLLMInput & {
	inputKey: string
}

/**
 * THE DEVELOPERS OF LANGCHAIN DIDN'T BOTHER CHECKING IF THE STUPID LLM WOULD REPLY WITH A CYPHER SPECIFIC CODEBLOCK
 * I LITERALLY HAVE TO PATCH THEIR SHITTY IMPLEMENTATION TO MAKE IT WORK
 * UNDERSTAND THE DIFFERENCE BETWEEN ```<code>``` and ```cypher<code>```
 */
// @ts-ignore
export class CustomChain extends GraphCypherQAChain {
	override extractCypher(text: string) {
		log("langchain.custom.extract", LogLevel.Debug, text)
		const pattern = /```(cypher)?((.|\n)*)```/m
		const matches = text.match(pattern)
		log("langchain.custom.extract", LogLevel.Debug, matches)
		return matches ? matches[2] : text
	}

	static override fromLLM(fromLLMArgs: FromLLMArgs) {
		const {
			graph,
			qaPrompt = CYPHER_QA_PROMPT,
			cypherPrompt = CYPHER_GENERATION_PROMPT,
			llm,
			cypherLLM,
			qaLLM,
			returnIntermediateSteps = false,
			returnDirect = false,
			inputKey,
		} = fromLLMArgs
		if (!cypherLLM && !llm) {
			throw new Error(
				"Either 'llm' or 'cypherLLM' parameters must be provided",
			)
		}
		if (!qaLLM && !llm) {
			throw new Error(
				"Either 'llm' or 'qaLLM' parameters must be provided",
			)
		}
		if (cypherLLM && qaLLM && llm) {
			throw new Error(
				"You can specify up to two of 'cypherLLM', 'qaLLM', and 'llm', but not all three simultaneously.",
			)
		}
		const qaChain = new LLMChain({
			llm: (qaLLM || llm)!,
			prompt: qaPrompt,
		})
		const cypherGenerationChain = new LLMChain({
			llm: (cypherLLM || llm)!,
			prompt: cypherPrompt,
		})
		return new CustomChain({
			cypherGenerationChain,
			qaChain,
			graph,
			returnIntermediateSteps,
			returnDirect,
			inputKey: inputKey,
		})
	}
}
