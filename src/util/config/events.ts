import { NODE_ENV } from "."

export const LOG_DB_EVENTS = true
export const LOG_CONSOLE_EVENTS = NODE_ENV === "development"
