import { featureFlag } from "@/util/config"
import { DEV_COOKIE_OPTIONS, PROD_COOKIE_OPTIONS } from "@/util/config/auth"
import db from "@/util/db"
import type { IRequest } from "@/util/http"

export type CookieOpts = {
	expires?: Date
}

export function cookieOptions(req: IRequest, opts?: CookieOpts) {
	const cookieOpts = featureFlag(DEV_COOKIE_OPTIONS, PROD_COOKIE_OPTIONS)

	const cookieEntries = Object.entries(cookieOpts)

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
