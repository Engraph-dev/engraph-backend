import cuid2 from "@paralleldrive/cuid2"

import { DEFAULT_PAGINATION_SIZE } from "@/util/config/http"
import { PagedQuery } from "@/util/defs/engraph-backend/common"

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
