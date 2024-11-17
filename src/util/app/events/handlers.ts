import type { Event } from "./index"
import type { EventType } from "@prisma/client"

import { LOG_DB_EVENTS } from "@/util/config/events"
import { db } from "@/util/db"
import { LogLevel, log } from "@/util/log"

type EventHandler = (eventData: Event) => any | Promise<any>

export const dbLogger: EventHandler = async (eventData) => {
	if (LOG_DB_EVENTS) {
		return db.eventLog.create({
			data: {
				...eventData,
				eventMetadata: eventData.eventMetadata ?? {},
			},
		})
	}
}

export const consoleLogger: EventHandler = (eventData) => {
	log(
		"event",
		LogLevel.Debug,
		eventData.eventType,
		JSON.stringify(eventData, null, 4),
	)
}

export const eventHandlers: Partial<Record<EventType, EventHandler[]>> = {}
