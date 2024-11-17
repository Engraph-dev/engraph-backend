import type { CorsOptions } from "cors"



import { NODE_ENV, USE_XSRF_PROTECTION, XSRF_HEADER_NAME } from "@/util/config/http";
import { envVar } from "@/util/env";


export const AUTH_COOKIE_NAME = envVar("AUTH_COOKIE_NAME")
export const AUTH_HEADER_NAME = envVar("AUTH_HEADER_NAME")

export const JWT_SECRET = envVar("JWT_SECRET")

export const BCRYPT_SALT_ROUNDS = Number.parseInt(envVar("BCRYPT_SALT_ROUNDS"))

export const RESEND_API_KEY = envVar("RESEND_API_KEY")
export const RESEND_SENDER_ADDRESS = envVar("RESEND_SENDER_ADDRESS")

export const VERIFICATION_TOKEN_EXPIRATION_HOURS = 1

export const WEB_ORIGIN = envVar("WEB_ORIGIN")
export const WEB_PROTO = envVar("WEB_PROTO")

export const WEB_ENDPOINTS = {
	VERIFY_TOKEN: "/auth/verify-token",
} as const

export const BRAND_NAME = "Engraph.dev"
export const JWT_EXPIRATION_HOURS = 24
export const PASSWORD_LENGTH = 10

export const DEV_ORIGINS = [`${WEB_PROTO}://${WEB_ORIGIN}`]

export const PROD_ORIGINS = [`${WEB_PROTO}://${WEB_ORIGIN}`]

export const CORS_CONFIG: CorsOptions = {
	credentials: true,
	origin: NODE_ENV === "development" ? DEV_ORIGINS : PROD_ORIGINS,
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

export const JWT_SECRET_EXPOSED_SILENT_FAIL = false
export const SESSION_ID_SILENT_FAIL = false
export const SESSION_EXPIRY_SILENT_FAIL = false
export const STRICT_SESSION_IP_UA_CHECK = false

export const VERIFY_EMAIL = true