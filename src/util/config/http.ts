import { createCuid } from "../app"
import { envVar } from "../env"
import type { IRequest, IResponse } from "../http"
import type { Options as RateLimitOptions } from "express-rate-limit"

import type { ResJSON } from "@/util/defs/engraph-backend/common"

export const DEFAULT_PAGINATION_SIZE = 10
export const NODE_ENV = envVar("NODE_ENV")

export const PORT = envVar("PORT")

export const API_VERSION = envVar("API_VERSION")
export const CACHE_SECONDS = 600

export const USE_XSRF_PROTECTION = true
export const XSRF_HEADER_NAME = USE_XSRF_PROTECTION
	? envVar("XSRF_HEADER_NAME")
	: ""
export const XSRF_TIMEOUT_SECONDS = 60

export const USE_RATE_LIMIT = true
export const RATE_LIMIT_WINDOW_SECONDS = 300
export const GET_RATE_LIMIT_WINDOW = 100
export const NON_GET_RATE_LIMIT_WINDOW = 25

const COMMON_RATE_LIMIT_CONFIG: Partial<RateLimitOptions> = {
	windowMs: RATE_LIMIT_WINDOW_SECONDS * 1000,
	standardHeaders: true,
	legacyHeaders: false,
	statusCode: 429,
	message: {
		responseStatus: "ERR_RATE_LIMIT",
	} satisfies ResJSON,
	keyGenerator: (req: IRequest, res: IResponse) => {
		if (req.currentSession) {
			const { sessionId } = req.currentSession
			return sessionId
		} else {
			return req.ip || req.headers["user-agent"] || createCuid()
		}
	},
}

// Rate limiter for non-GET requests
export const ACTION_RATE_LIMIT_CONFIG: Partial<RateLimitOptions> = {
	...COMMON_RATE_LIMIT_CONFIG,
	max: NON_GET_RATE_LIMIT_WINDOW, // non-GET requests per session / IP
	skip: (req: IRequest, res: IResponse) => {
		if (!USE_RATE_LIMIT) {
			return true
		}
		if (req.method === "OPTIONS") {
			return true
		}
		if (req.method === "GET") {
			return true
		} else {
			return false
		}
	},
}

// Rate limiter for GET requests
export const GET_RATE_LIMIT_CONFIG: Partial<RateLimitOptions> = {
	...COMMON_RATE_LIMIT_CONFIG,
	max: GET_RATE_LIMIT_WINDOW, // GET requests per session / IP
	skip: (req: IRequest, res: IResponse) => {
		if (!USE_RATE_LIMIT) {
			return true
		}
		if (req.method === "OPTIONS") {
			return true
		}
		if (req.method !== "GET") {
			return true
		} else {
			return false
		}
	},
}
