import { orgIdAuthRouter } from "@/routers/orgs/[orgId]/auth"

import { Router } from "@/util/http/router"

const orgIdRouter = Router()

orgIdRouter.use("/auth", orgIdAuthRouter)

export { orgIdRouter }
