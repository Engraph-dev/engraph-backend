import { Router } from "express"

import { myOrgAuthRouter } from "@/routers/orgs/me/auth"
import { myOrgProjectsRouter } from "@/routers/orgs/me/projects"
import { myOrgSessionRouter } from "@/routers/orgs/me/sessions"
import { usersRouter } from "@/routers/orgs/me/users"

import { restrictEndpoint } from "@/util/http/middleware"

const myOrgRouter = Router({ mergeParams: true })

myOrgRouter.use("/auth", myOrgAuthRouter)
myOrgRouter.use("/sessions", myOrgSessionRouter)
myOrgRouter.use("/users", usersRouter)

myOrgRouter.use(
	"/projects",
	restrictEndpoint({
		allowAuthUsers: true,
		allowNonAuthUsers: false,
		requireVerified: true,
	}),
	myOrgProjectsRouter,
)

export { myOrgRouter }
