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
	model: "gpt-4o-mini",
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
	outputKey: string
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
			outputKey,
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
			outputKey: outputKey,
		})
	}

	override async _call(values: any, runManager: any) {
		const callbacks = runManager?.getChild()
		// @ts-expect-error
		const question = values[this.inputKey]
		const intermediateSteps = []
		// @ts-expect-error
		const generatedCypher = await this.cypherGenerationChain.call(
			{
				question: question,
				// @ts-expect-error
				schema: this.graph.getSchema(),
				projectType: values.projectType,
			},
			callbacks,
		)
		const extractedCypher = this.extractCypher(generatedCypher.text)
		intermediateSteps.push({ query: extractedCypher })
		let chainResult
		// @ts-expect-error
		const context = await this.graph.query(extractedCypher, {
			// @ts-expect-error
			topK: this.topK,
		})
		intermediateSteps.push({ context })
		// @ts-expect-error
		const result = await this.qaChain.call(
			{ question, context: JSON.stringify(context) },
			callbacks,
		)
		chainResult = {
			query: extractedCypher,
			context: context,
			// @ts-expect-error
			[this.outputKey]: result[this.qaChain.outputKey],
		}
		// @ts-expect-error
		if (this.returnIntermediateSteps) {
			chainResult[exports.INTERMEDIATE_STEPS_KEY] = intermediateSteps
		}
		return chainResult
	}
}
