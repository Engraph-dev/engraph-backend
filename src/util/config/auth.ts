import { envVar } from "../env"
import { NODE_ENV } from "./http"
import type { CorsOptions } from "cors"

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
	allowedHeaders: ["Content-Type", AUTH_HEADER_NAME, "Cache-Control"],
}

export const PROD_COOKIE_OPTIONS: Record<string, string | undefined> = {
	Path: "/",
	HttpOnly: undefined,
	Secure: undefined,
	SameSite: "None",
}
export const DEV_COOKIE_OPTIONS: Record<string, string | undefined> = {
	Path: "/",
	HttpOnly: undefined,
}

export const COOKIE_SILENT_FAIL = false
export const SESSION_ID_SILENT_FAIL = false
export const SESSION_EXPIRY_SILENT_FAIL = false
export const VERIFY_EMAIL = true
