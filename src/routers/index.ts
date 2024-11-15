import { mediaRouter } from "./media"
import { orgRouter } from "./orgs"
import { xsrfRouter } from "./xsrf"
import { heartbeatCheck, metricsCheck } from "@/controllers"
import { Router } from "express"

import { authParser } from "@/util/app/auth"

const indexRouter = Router({ mergeParams: true })

indexRouter.use(authParser)

indexRouter.use("/orgs", orgRouter)

indexRouter.use("/media", mediaRouter)

indexRouter.use("/xsrf", xsrfRouter)

indexRouter.get("/", heartbeatCheck)

indexRouter.get("/metrics", metricsCheck)

export { indexRouter }
