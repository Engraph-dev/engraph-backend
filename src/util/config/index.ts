import { envVar } from "@/util/env"

export function featureFlag<T = boolean, P = T>(
	valueIfDev: T = true as T,
	valueIfProd: P = false as P,
) {
	return NODE_ENV === "development" ? valueIfDev : valueIfProd
}

export const THROW_ON_ENV = true

export const NODE_ENV = envVar("NODE_ENV")

export const PORT = envVar("PORT")

export const API_VERSION = envVar("API_VERSION")

export const DATABASE_URL = envVar("DATABASE_URL")
