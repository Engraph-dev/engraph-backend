import cuid2 from "@paralleldrive/cuid2"

import { DEV_COOKIE_OPTIONS, PROD_COOKIE_OPTIONS } from "@/util/config/auth"
import { DEFAULT_PAGINATION_SIZE } from "@/util/config/http"
import { PagedQuery } from "@/util/defs/engraph-backend/common"
import { IRequest } from "@/util/http"

type CookieOpts = {
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

// Prisma uses cuids of length 25
export const createCuid = cuid2.init({
	length: 25,
})

// Generates CUIDs of length 8
export const createMiniCuid = cuid2.init({
	length: 8,
})

export function getQueryOffset(query: PagedQuery) {
	const searchPage = Number.parseInt(`${query.searchPage ?? 1}`)
	const pageSize = Number.parseInt(
		`${query.pageSize ?? DEFAULT_PAGINATION_SIZE}`,
	)
	return {
		skip: (searchPage - 1) * pageSize,
		take: pageSize,
	}
}
