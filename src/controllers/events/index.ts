import { getEventData, logEvent } from "@/util/app/events"
import { NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import { RecordEventBody } from "@/util/defs/engraph-backend/events"
import { requestHandler } from "@/util/http/wrappers"

/**
 * This is the handler for the events endpoint.
 * It handles requests to record events.
 * While events are fired from within the backend itself, the frontend can also log events
 */
export const recordEvent = requestHandler<NoParams, RecordEventBody, NoParams>(
	async (req, res) => {
		const { eventType, eventMetadata } = req.body
		logEvent({
			...getEventData(req),
			eventType: eventType,
			eventMetadata: eventMetadata,
		})

		res.status(StatusCodes.OK).json({
			responseStatus: "SUCCESS",
		})
	},
)
