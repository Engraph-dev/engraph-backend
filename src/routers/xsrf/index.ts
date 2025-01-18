import { getXSRFToken } from "@/controllers/xsrf"

import type { NoParams } from "@/util/defs/engraph-backend/common"
import { Router } from "@/util/http/router"

const xsrfRouter = Router()

xsrfRouter.use<"/", NoParams, NoParams, NoParams, NoParams, NoParams>(
	"/",
	getXSRFToken,
)

export { xsrfRouter }
