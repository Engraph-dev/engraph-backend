import { PagedQuery } from "@/util/defs/common"
import { ValidatorArgs } from "@/util/http/middleware"
import { NULLISH, POSITIVE } from "@/util/http/validators"

export const PagedQueryValidator: ValidatorArgs<PagedQuery> = {
	pageSize: NULLISH(POSITIVE()),
	searchPage: NULLISH(POSITIVE()),
}
