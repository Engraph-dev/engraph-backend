import { orgRouter } from "./orgs"
import { orgIdRouter } from "./orgs/[orgId]"
import { heartbeatCheck, metricsCheck } from "@/controllers"
import { Router } from "express"

import { authParser } from "@/util/app/auth"

const indexRouter = Router({ mergeParams: true })

indexRouter.use(authParser)

indexRouter.get("/", heartbeatCheck)

indexRouter.get("/metrics", metricsCheck)

// indexRouter.use("/media", mediaRouter)

indexRouter.use("/orgs", orgRouter)

indexRouter.use("/orgs/:orgId", orgIdRouter)

export { indexRouter }
