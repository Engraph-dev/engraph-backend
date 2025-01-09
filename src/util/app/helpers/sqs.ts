import {
	SQSClient,
	SendMessageCommand,
	type SendMessageCommandInput,
} from "@aws-sdk/client-sqs"
import type { Workflow } from "@prisma/client"

import { AWS_KEY_ID, AWS_KEY_SECRET, AWS_REGION } from "@/util/config/aws"
import { SQS_URL } from "@/util/config/sqs"
import { LogLevel, log } from "@/util/log"

export const sqsClient = new SQSClient({
	region: AWS_REGION,
	credentials: {
		accessKeyId: AWS_KEY_ID,
		secretAccessKey: AWS_KEY_SECRET,
	},
})

export async function queueWorkflowMessage(workflowData: Workflow) {
	const messageInput: SendMessageCommandInput = {
		QueueUrl: SQS_URL,
		MessageAttributes: {
			WorkflowId: {
				StringValue: workflowData.workflowId,
				DataType: "String",
			},
		},
		MessageBody: workflowData.workflowId,
		MessageDeduplicationId: workflowData.workflowId,
		// Group by projects
		MessageGroupId: workflowData.workflowProjectId,
	}

	log("sqs", LogLevel.Debug, messageInput)

	const messageToSend = new SendMessageCommand(messageInput)

	const { MessageId: sqsMessageId } = await sqsClient.send(messageToSend)

	log("sqs", LogLevel.Debug, { sqsMessageId: sqsMessageId })

	return sqsMessageId ?? null
}
