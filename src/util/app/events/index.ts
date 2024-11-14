import { consoleLogger, dbLogger, eventHandlers } from "./handlers"
import { type EventLog, EventType } from "@prisma/client"
import { EventEmitter } from "node:events"

import type { IRequest } from "@/util/http"

const eventListener = new EventEmitter()

export type Event = Omit<EventLog, "eventId">

export const MetadataTypes = {
	String: "",
	Number: 0,
	Boolean: false,
	Object: {} as object,
}
export const metadataMapping = {
	[EventType.OrgCreate]: {},
	[EventType.OrgUpdate]: {},
	[EventType.UserCreate]: {},
	[EventType.UserUpdate]: {},
	[EventType.UserDelete]: {},
	[EventType.SessionStart]: {},
	[EventType.SessionClose]: {},
	[EventType.VerificationMailSend]: {},
	[EventType.ProjectCreate]: {},
	[EventType.ProjectUpdate]: {},
	[EventType.ProjectDelete]: {},
	[EventType.TeamCreate]: {},
	[EventType.TeamUpdate]: {},
	[EventType.TeamDelete]: {},
	[EventType.S3RequestCreate]: {},
	[EventType.S3ObjectCreate]: {},
	[EventType.S3ObjectDelete]: {},
	[EventType.S3RequestCallback]: {},
	[EventType.AuthLogin]: {},
	[EventType.AuthVerify]: {
		verificationToken: MetadataTypes.String,
		tokenId: MetadataTypes.String,
	},
} satisfies Record<
	EventType,
	Record<string, (typeof MetadataTypes)[keyof typeof MetadataTypes]>
>

export type MetadataMapping = typeof metadataMapping
export type MetadataObject = MetadataMapping[keyof MetadataMapping]

type DispatchEventArgs<EventT extends keyof MetadataMapping> = Omit<
	EventLog,
	"eventMetadata" | "eventTimestamp" | "eventId" | "eventType"
> & {
	eventType: EventT
	eventMetadata: MetadataMapping[EventT]
}

export function validateMetadata<EventT extends keyof MetadataMapping>(
	eventType: EventT,
	eventMetadata: MetadataMapping[EventT],
) {
	const targetType = metadataMapping[eventType] satisfies MetadataObject
	const expectedKeys = Object.keys(targetType)

	if (expectedKeys.length === 0) {
		return
	}

	const receivedKeys = Object.keys(eventMetadata)
	const missingKeys = expectedKeys.filter((key) => {
		return !receivedKeys.includes(key)
	})

	if (missingKeys.length > 0) {
		throw new Error(
			`Invalid metadata for event ${eventType}. Missing keys: ${missingKeys.join(
				", ",
			)}`,
		)
	}

	const typeErrors = expectedKeys.map((expKey) => {
		const expType = targetType[expKey as keyof MetadataObject]
		const recType = eventMetadata[expKey as keyof MetadataObject]
		if (typeof recType !== typeof expType) {
			return {
				key: expKey,
				expectedType: typeof expType,
				receivedType: typeof recType,
			}
		}
		return undefined
	})

	const filteredTypeErrors = typeErrors.filter((err) => err !== undefined)
	if (filteredTypeErrors.length > 0) {
		throw new Error(
			`Invalid metadata for event ${eventType}. Type mismatch: ${filteredTypeErrors
				.map(
					(err) =>
						`${err.key} expected ${err.expectedType}, received ${err.receivedType}`,
				)
				.join(", ")}`,
		)
	}
}

export function logEvent<EventT extends keyof MetadataMapping>(
	args: DispatchEventArgs<EventT>,
) {
	eventListener.emit(args.eventType, {
		...args,
		eventType: args.eventType as EventType,
		eventMetadata: args.eventMetadata ?? {},
		eventTimestamp: new Date(),
	} satisfies Event)
}

export function getEventData(
	req: IRequest,
): Omit<EventLog, "eventId" | "eventMetadata" | "eventType"> {
	return {
		eventTimestamp: new Date(),
		sessionId: req.currentSession?.sessionId ?? null,
		userId: req.currentSession?.userId ?? null,
		orgId: req.currentSession?.orgId ?? null,
	}
}

Object.values(EventType).forEach((eventType) => {
	const assocEvents = eventHandlers[eventType] || []
	const mergedHandlers = [dbLogger, consoleLogger, ...assocEvents]
	const eventHandler = async (eventData: Event) => {
		try {
			validateMetadata(
				eventType,
				eventData.eventMetadata as MetadataObject,
			)
			return Promise.all(
				mergedHandlers.map((evHandler) => {
					return evHandler(eventData)
				}),
			)
		} catch (e) {
			console.error(e)
		}
	}
	eventListener.on(eventType, eventHandler)
})

export default eventListener
