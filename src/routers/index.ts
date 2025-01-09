import { heartbeatCheck, metricsCheck } from "@/controllers"
import { Router } from "express"

import { eventRouter } from "@/routers/events"
import { githubRouter } from "@/routers/github"
import { mediaRouter } from "@/routers/media"
import { orgRouter } from "@/routers/orgs"
import { xsrfRouter } from "@/routers/xsrf"

const indexRouter = Router({ mergeParams: true })

indexRouter.use("/github", githubRouter)

indexRouter.use("/events", eventRouter)

indexRouter.use("/orgs", orgRouter)

indexRouter.use("/media", mediaRouter)

indexRouter.use("/xsrf", xsrfRouter)

indexRouter.get("/", heartbeatCheck)

indexRouter.get("/metrics", metricsCheck)

export { indexRouter }
