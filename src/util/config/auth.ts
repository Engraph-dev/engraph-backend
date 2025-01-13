import type { CorsOptions } from "cors"

import { featureFlag } from "@/util/config"
import { USE_XSRF_PROTECTION, XSRF_HEADER_NAME } from "@/util/config/http"
import { envVar } from "@/util/env"

export const AUTH_COOKIE_NAME = envVar("AUTH_COOKIE_NAME")
export const AUTH_HEADER_NAME = envVar("AUTH_HEADER_NAME")

export const JWT_SECRET = envVar("JWT_SECRET")

export const BCRYPT_SALT_ROUNDS = Number.parseInt(envVar("BCRYPT_SALT_ROUNDS"))

export const RESEND_API_KEY = envVar("RESEND_API_KEY")
export const RESEND_SENDER_ADDRESS = envVar("RESEND_SENDER_ADDRESS")

export const VERIFICATION_TOKEN_EXPIRATION_HOURS = 1

export const WEB_ORIGINS = envVar("WEB_ORIGIN").split(",")
export const WEB_PROTOS = envVar("WEB_PROTO").split(",")

export const WEB_ENDPOINTS = {
	VERIFY_TOKEN: "/auth/verify-token",
} as const

export const BRAND_NAME = "engraph.dev"
export const JWT_EXPIRATION_HOURS = 24
export const PASSWORD_LENGTH = 10

export const DEV_ORIGINS = WEB_ORIGINS.map((webOrigin, originIdx) => {
	const webProto = WEB_PROTOS[originIdx]
	return `${webProto}://${webOrigin}`
})

export const PROD_ORIGINS = WEB_ORIGINS.map((webOrigin, originIdx) => {
	const webProto = WEB_PROTOS[originIdx]
	return `${webProto}://${webOrigin}`
})

export const CORS_CONFIG: CorsOptions = {
	credentials: true,
	origin: featureFlag(DEV_ORIGINS, PROD_ORIGINS),
	allowedHeaders: USE_XSRF_PROTECTION
		? ["Content-Type", AUTH_HEADER_NAME, XSRF_HEADER_NAME, "Cache-Control"]
		: ["Content-Type", AUTH_HEADER_NAME, "Cache-Control"],
}

type CookieOptions = Record<string, string | undefined>

export const PROD_COOKIE_OPTIONS: CookieOptions = {
	Path: "/",
	HttpOnly: undefined,
	Secure: undefined,
	SameSite: "None",
}
export const DEV_COOKIE_OPTIONS: CookieOptions = {
	Path: "/",
	HttpOnly: undefined,
}

export const SESSION_VALIDITY_SECONDS = 7 /*d*/ * 24 /*h*/ * 60 /*m*/ * 60 /*s*/

export const ALLOW_MALFORMED_JWT = false
export const ALLOW_NON_DB_SESSION_ID = false
export const ALLOW_EXPIRED_SESSIONS = false
export const STRICT_CHECK_SESSION_IP_UA = false

export const VERIFY_EMAIL = true
