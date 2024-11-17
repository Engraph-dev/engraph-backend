import { Router } from "express"

import { orgIdAuthRouter } from "@/routers/orgs/[orgId]/auth"

const orgIdRouter = Router({ mergeParams: true })

orgIdRouter.use("/auth", orgIdAuthRouter)

export { orgIdRouter }
