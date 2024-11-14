import { orgIdAuthRouter } from "./auth"
import { Router } from "express"

const orgIdRouter = Router({ mergeParams: true })

orgIdRouter.use("/auth", orgIdAuthRouter)

export { orgIdRouter }
