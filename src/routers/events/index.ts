import { EventType } from "@prisma/client"

import { recordEvent } from "@/controllers/events"

import { EventValidator } from "@/util/app/validators/events"
import { NoParams } from "@/util/defs/engraph-backend/common"
import { RecordEventBody } from "@/util/defs/engraph-backend/events"
import { restrictEndpoint, validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { IN_ENUM, NOVALIDATE } from "@/util/http/validators"

const eventRouter = Router()

eventRouter.post<"/", NoParams, NoParams, RecordEventBody, NoParams, NoParams>(
	"/",
	restrictEndpoint({
		allowAuthUsers: true,
		allowNonAuthUsers: true,
		requireVerified: false,
	}),
	validateParams({
		bodyParams: {
			eventType: IN_ENUM(EventType),
			eventMetadata: NOVALIDATE(),
		},
		batchValidators: {
			bodyParams: [EventValidator],
		},
	}),
	recordEvent,
)

export { eventRouter }
