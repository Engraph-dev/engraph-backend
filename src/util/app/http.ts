import { DEV_COOKIE_OPTIONS, PROD_COOKIE_OPTIONS } from "../config/auth"
import db from "../db"
import type { IRequest } from "../http"

export type CookieOpts = {
	expires?: Date
}

export function cookieOptions(req: IRequest, opts?: CookieOpts) {
	const cookieEntries = Object.entries(
		req.protocol === "http" ? DEV_COOKIE_OPTIONS : PROD_COOKIE_OPTIONS,
	)

	const cookieEntriesWithExpiry = [
		...cookieEntries,
		["Expires", `${opts?.expires}`],
	] satisfies [string, string | undefined][]

	const finalEntries = opts?.expires ? cookieEntriesWithExpiry : cookieEntries

	const cookiePairs = finalEntries.map(([key, value]) => {
		if (value === undefined) {
			return key
		}
		return `${key}=${value}`
	})
	return cookiePairs.join(";")
}

export async function cleanupXSRFTokens() {
	return db.crossSiteToken.deleteMany({
		where: {
			tokenExpiryTimestamp: {
				lte: new Date(),
			},
		},
	})
}
