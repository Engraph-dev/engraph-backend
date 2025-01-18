import { myOrgsTeamsUsersUserIdRouter } from "@/routers/orgs/me/teams/[teamId]/users/[userId]"

import { UserEntityValidator } from "@/util/app/validators/users"
import { UserId } from "@/util/defs/engraph-backend/orgs/me/users/[userId]"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"

const myOrgTeamIdUsersRouter = Router()

myOrgTeamIdUsersRouter.use<UserId>(
	"/:userId",
	validateParams({
		urlParams: {
			userId: UserEntityValidator({
				allowSameOrgOnly: true,
				allowSameUserAsRequest: true,
			}),
		},
	}),
	myOrgsTeamsUsersUserIdRouter,
)

export { myOrgTeamIdUsersRouter }
