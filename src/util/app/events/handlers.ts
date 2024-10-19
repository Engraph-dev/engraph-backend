import type { Event } from "./index"
import type { EventType } from "@prisma/client"

import { db } from "@/util/db"

type EventHandler = (eventData: Event) => any | Promise<any>

export const dbLogger: EventHandler = (eventData) => {
	db.eventLog.create({
		data: {
			...eventData,
			eventMetadata: eventData.eventMetadata ?? {},
		},
	})
}

export const eventHandlers: Partial<Record<EventType, EventHandler[]>> = {}
