import type { Event } from "./index"
import type { EventType } from "@prisma/client"

import { NODE_ENV } from "@/util/config"
import { LOG_CONSOLE_EVENTS, LOG_DB_EVENTS } from "@/util/config/events"
import { db } from "@/util/db"

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
	if (NODE_ENV === "development" || LOG_CONSOLE_EVENTS) {
		console.log(eventData.eventType, JSON.stringify(eventData, null, 4))
	}
}

export const eventHandlers: Partial<Record<EventType, EventHandler[]>> = {}
