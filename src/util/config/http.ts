import { envVar } from "../env"

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
