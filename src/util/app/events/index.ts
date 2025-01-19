import { type EventLog, EventType } from "@prisma/client"
import { EventEmitter } from "node:events"

import {
	consoleLogger,
	dbLogger,
	eventHandlers,
} from "@/util/app/events/handlers"
import {
	MetavalTypes,
	createConditionalObjectValidator,
} from "@/util/app/helpers/metaval"
import type { IRequest } from "@/util/http"
import { LogLevel, log } from "@/util/log"

const eventListener = new EventEmitter()

export type Event = Omit<EventLog, "eventId">

/**
 * Mapping of event types to their metadata object.
 * This is used to validate the metadata object before logging the event.
 * The metadata object is expected to have the same keys as the mapping object.
 * The values of the mapping object are the expected types of the metadata object.
 */
export const metadataMapping = {
	[EventType.OrgCreate]: {},
	[EventType.OrgUpdate]: {},
	[EventType.UserCreate]: { userId: MetavalTypes.String },
	[EventType.UserUpdate]: { userId: MetavalTypes.String },
	[EventType.UserDelete]: { userId: MetavalTypes.String },
	[EventType.SessionStart]: {},
	[EventType.SessionClose]: {},
	[EventType.VerificationMailSend]: { mailId: MetavalTypes.String },
	[EventType.ProjectCreate]: { projectId: MetavalTypes.String },
	[EventType.ProjectUpdate]: { projectId: MetavalTypes.String },
	[EventType.ProjectDelete]: { projectId: MetavalTypes.String },
	[EventType.TeamCreate]: { teamId: MetavalTypes.String },
	[EventType.TeamUpdate]: { teamId: MetavalTypes.String },
	[EventType.TeamDelete]: { teamId: MetavalTypes.String },
	[EventType.TeamUserAdd]: {
		userId: MetavalTypes.String,
		teamId: MetavalTypes.String,
	},
	[EventType.TeamUserDelete]: {
		userId: MetavalTypes.String,
		teamId: MetavalTypes.String,
	},
	[EventType.S3RequestCreate]: {
		requestId: MetavalTypes.String,
	},
	[EventType.S3RequestCallback]: {
		requestId: MetavalTypes.String,
	},
	[EventType.S3ObjectCreate]: {
		objectKey: MetavalTypes.String,
	},
	[EventType.S3ObjectDelete]: {
		objectKey: MetavalTypes.String,
	},
	[EventType.AuthLogin]: {},
	[EventType.AuthVerify]: {
		verificationToken: MetavalTypes.String,
		tokenId: MetavalTypes.String,
	},
} satisfies Record<
	EventType,
	Record<string, (typeof MetavalTypes)[keyof typeof MetavalTypes]>
>

export type MetadataMapping = typeof metadataMapping
export type MetadataObject = MetadataMapping[keyof MetadataMapping]

export const validateMetadata = createConditionalObjectValidator(
	metadataMapping,
	MetavalTypes,
)

type DispatchEventArgs<EventT extends keyof MetadataMapping> = Omit<
	EventLog,
	"eventMetadata" | "eventTimestamp" | "eventId" | "eventType"
> & {
	eventType: EventT
	eventMetadata: MetadataMapping[EventT]
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
		const { objectValid, missingKeys, typeErrors } = validateMetadata(
			eventType,
			eventData.eventMetadata as MetadataObject,
		)
		if (objectValid) {
			return Promise.all(
				mergedHandlers.map((evHandler) => {
					return evHandler(eventData)
				}),
			)
		}

		const missingKeyErrors = (missingKeys as string[]).map((missingKey) => {
			return `Missing metadata key: ${missingKey} for event type: ${eventType}`
		})

		const typeErrorsStr = typeErrors.map((typeError) => {
			return `Metadata key: ${typeError.errorArgKey} expected type: ${typeError.expectedType}, received type: ${typeError.receivedType}`
		})

		const errorMessages = [...missingKeyErrors, ...typeErrorsStr]
		log("event", LogLevel.Error, errorMessages.join("\n"))
	}
	eventListener.on(eventType, eventHandler)
})

export default eventListener

/* LEGACY CODE */
/* Most of this has been replaced with a generic function `createConditionalObjectValidator` */
// type MetaTypeError<EventT extends keyof MetadataMapping> = {
// 	metadataKey: keyof MetadataMapping[EventT]
// 	expectedType: string
// 	receivedType: string
// }

// type ValidateMetadataResult<EventT extends keyof MetadataMapping> =
// 	| {
// 			metadataValid: true
// 			missingKeys: never[]
// 			typeErrors: never[]
// 	  }
// 	| {
// 			metadataValid: false
// 			missingKeys: keyof MetadataMapping[EventT][] | never[]
// 			typeErrors: MetaTypeError<EventT>[] | never[]
// 	  }

// export function validateMetadata<EventT extends keyof MetadataMapping>(
// 	eventType: EventT,
// 	eventMetadata: MetadataMapping[EventT],
// ): ValidateMetadataResult<EventT> {
// 	const targetType = metadataMapping[eventType] satisfies MetadataObject
// 	const expectedKeys = Object.keys(targetType)

// 	if (expectedKeys.length === 0) {
// 		return {
// 			metadataValid: true,
// 			missingKeys: [],
// 			typeErrors: [],
// 		}
// 	}

// 	const receivedKeys = Object.keys(eventMetadata)
// 	const missingKeys = expectedKeys.filter((key) => {
// 		return !receivedKeys.includes(key)
// 	})

// 	if (missingKeys.length > 0) {
// 		return {
// 			metadataValid: false,
// 			missingKeys:
// 				missingKeys as unknown as keyof MetadataMapping[EventT][],
// 			typeErrors: [],
// 		}
// 	}

// 	const typeErrors = expectedKeys.map((expKey) => {
// 		const expType = targetType[expKey as keyof MetadataObject]
// 		const recType = eventMetadata[expKey as keyof MetadataObject]
// 		if (typeof recType !== typeof expType) {
// 			return {
// 				metadataKey: expKey,
// 				expectedType: typeof expType,
// 				receivedType: typeof recType,
// 			}
// 		}
// 		return undefined
// 	})

// 	const filteredTypeErrors = typeErrors.filter(
// 		(typeError) => typeError !== undefined,
// 	)
// 	if (filteredTypeErrors.length > 0) {
// 		return {
// 			metadataValid: false,
// 			missingKeys: [],
// 			typeErrors: filteredTypeErrors as MetaTypeError<EventT>[],
// 		}
// 	}

// 	return {
// 		metadataValid: true,
// 		missingKeys: [],
// 		typeErrors: [],
// 	}
// }
/* END OF LEGACY */
