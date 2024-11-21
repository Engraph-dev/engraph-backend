import { type MetadataObject, validateMetadata } from "@/util/app/events"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type { RecordEventBody } from "@/util/defs/engraph-backend/events"
import { type BatchValidator, invalidParam } from "@/util/http/middleware"

export const EventValidator: BatchValidator<RecordEventBody> = {
	targetParams: ["eventType", "eventMetadata"],
	validatorFunction: ({ eventType, eventMetadata }) => {
		try {
			validateMetadata(eventType, eventMetadata as MetadataObject)
			return {
				validationPass: true,
			}
		} catch (e) {
			return invalidParam({
				errorCode: ErrorCodes.Unknown,
				errorArgs: {},
			})
		}
	},
}
