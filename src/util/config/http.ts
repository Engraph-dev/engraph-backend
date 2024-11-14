import { envVar } from "../env"

export const DEFAULT_PAGINATION_SIZE = 10
export const NODE_ENV = envVar("NODE_ENV")

export const PORT = envVar("PORT")

export const API_VERSION = envVar("API_VERSION")
export const CACHE_SECONDS = 600
