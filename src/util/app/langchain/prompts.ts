import { PromptTemplate } from "@langchain/core/prompts"

const CYPHER_GENERATION_TEMPLATE = `Generate Cypher statement to query a graph database.
The graph database contains modules, which are files in a project. A module contains the moduleSourceCode and modulePath
The graph database contains symbols, which are functions, classes, types, variables and more in source code. A symbol contains the symbolSourceCode, symbolIdentifier and symbolPath
The relationship is defined like DEPENDS_ON, which means that a symbol or module depends on a symbol or module.
The relationship is defined like EXPORTS, which means that a symbol is exported by a module.
It is not necessary to have a relationship in the query, you may only select nodes as well.
Always select the full source code of any module or file. Include the dependencies of a node in your query as well.

The full schema is:
{schema}

The question is:
{question}

RESPOND WITH A CORRECT CYPHER QUERY ONLY:`

export const CYPHER_GENERATION_PROMPT = new PromptTemplate({
	template: CYPHER_GENERATION_TEMPLATE,
	inputVariables: ["schema", "question"],
})

const CYPHER_QA_TEMPLATE =
	`You are an expert at documenting and explaining source code of a project. Assume framework and language. ` +
	`When answering, include references to documentation where necessary. DO NOT include your own opinions. ` +
	`Give SHORT EXAMPLES ONLY IF APPLICABLE. You will be given SYMBOLS with a specific symbolName, symbolSourceCode and the symbolFilePath. ` +
	`You will be given MODULES with modulePath and moduleSourceCode. ` +
	`Do not guess, always answer authoritatively. ` +
	`If the provided information is empty, say that you don't know the answer.
	
	Information:
	{context}
	
	Question: 
	{question}
	Respond with a technical answer:`

export const CYPHER_QA_PROMPT = new PromptTemplate({
	template: CYPHER_QA_TEMPLATE,
	inputVariables: ["context", "question"],
})
