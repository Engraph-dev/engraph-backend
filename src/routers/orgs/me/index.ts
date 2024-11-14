import { myOrgAuthRouter } from "./auth"
import { myOrgSessionRouter } from "./sessions"
import { Router } from "express"

const myOrgRouter = Router()

myOrgRouter.use("/auth", myOrgAuthRouter)
myOrgRouter.use("/sessions", myOrgSessionRouter)

export { myOrgRouter }
