import { envVar } from "@/util/env"

export const CYPHER_LLM = envVar("CYPHER_LLM")
export const ANSWER_LLM = envVar("ANSWER_LLM")
export const OPENAI_API_KEY = envVar("OPENAI_API_KEY")

type LLMConfig = Partial<{
	temperature: number
	maxTokens: number
}>

export const CYPHER_LLM_CONFIG: LLMConfig = {
	temperature: 0.8,
}

export const ANSWER_LLM_CONFIG: LLMConfig = {
	temperature: 1.2,
}
