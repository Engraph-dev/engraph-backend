import { getMyOrg } from "@/controllers/orgs/me"

import { myOrgAuthRouter } from "@/routers/orgs/me/auth"
import { myOrgProjectsRouter } from "@/routers/orgs/me/projects"
import { myOrgSessionRouter } from "@/routers/orgs/me/sessions"
import { myOrgTeamsRouter } from "@/routers/orgs/me/teams"
import { usersRouter } from "@/routers/orgs/me/users"

import { NoParams } from "@/util/defs/engraph-backend/common"
import { restrictEndpoint } from "@/util/http/middleware"
import { Router } from "@/util/http/router"

const myOrgRouter = Router()

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

myOrgRouter.use(
	"/teams",
	restrictEndpoint({
		allowAuthUsers: true,
		allowNonAuthUsers: false,
		requireVerified: true,
	}),
	myOrgTeamsRouter,
)

myOrgRouter.get<NoParams, NoParams, NoParams, NoParams, NoParams>("/", getMyOrg)

export { myOrgRouter }
