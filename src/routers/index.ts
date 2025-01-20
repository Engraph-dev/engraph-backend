import { heartbeatCheck, metricsCheck } from "@/controllers"

import { eventRouter } from "@/routers/events"
import { githubRouter } from "@/routers/github"
import { mediaRouter } from "@/routers/media"
import { orgRouter } from "@/routers/orgs"
import { xsrfRouter } from "@/routers/xsrf"

import { Router } from "@/util/http/router"

const indexRouter = Router()

indexRouter.use("/github", githubRouter)

indexRouter.use("/events", eventRouter)

indexRouter.use("/orgs", orgRouter)

indexRouter.use("/media", mediaRouter)

indexRouter.use("/xsrf", xsrfRouter)

indexRouter.get("/", heartbeatCheck)

indexRouter.get("/metrics", metricsCheck)

export { indexRouter }
