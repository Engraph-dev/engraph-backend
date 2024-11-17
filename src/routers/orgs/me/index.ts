import { myOrgAuthRouter } from "@/routers/orgs/me/auth"
import { myOrgSessionRouter } from "@/routers/orgs/me/sessions"
import { usersRouter } from "@/routers/orgs/me/users"
import { Router } from "express"

const myOrgRouter = Router()

myOrgRouter.use("/auth", myOrgAuthRouter)
myOrgRouter.use("/sessions", myOrgSessionRouter)
myOrgRouter.use("/users", usersRouter)

export { myOrgRouter }
