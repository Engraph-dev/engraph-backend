import { heartbeatCheck, metricsCheck } from "@/controllers"
import { Router } from "express"

import { authParser } from "@/util/app/auth"

const indexRouter = Router({ mergeParams: true })

indexRouter.use(authParser)

indexRouter.get("/", heartbeatCheck)

indexRouter.get("/metrics", metricsCheck)

// indexRouter.use("/media", mediaRouter)

export { indexRouter }
