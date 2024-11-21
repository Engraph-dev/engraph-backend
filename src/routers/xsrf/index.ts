import { Router } from "express"

import { getXSRFToken } from "@/controllers/xsrf"

import type { NoParams } from "@/util/defs/engraph-backend/common"

const xsrfRouter = Router({ mergeParams: true })

xsrfRouter.use<"/", NoParams, NoParams, NoParams, NoParams, NoParams>(
	"/",
	getXSRFToken,
)

export { xsrfRouter }
