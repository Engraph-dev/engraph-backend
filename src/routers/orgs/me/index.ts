import { myOrgSessionRouter } from "./sessions"
import { Router } from "express"

const myOrgRouter = Router()

myOrgRouter.use("/sessions", myOrgSessionRouter)

export { myOrgRouter }
