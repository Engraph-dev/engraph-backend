import { myOrgAuthRouter } from "./auth"
import { myOrgSessionRouter } from "./sessions"
import { usersRouter } from "./users"
import { Router } from "express"

const myOrgRouter = Router()

myOrgRouter.use("/auth", myOrgAuthRouter)
myOrgRouter.use("/sessions", myOrgSessionRouter)
myOrgRouter.use("/users", usersRouter)

export { myOrgRouter }
