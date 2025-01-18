import {
	addTeamUser,
	deleteTeamUser,
} from "@/controllers/teams/[teamId]/users/[userId]"

import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	AddTeamUserParams,
	DeleteTeamUserParams,
} from "@/util/defs/engraph-backend/orgs/teams/[teamId]/users/[userId]"
import { Router } from "@/util/http/router"

const myOrgsTeamsUsersUserIdRouter = Router()

myOrgsTeamsUsersUserIdRouter.post<
	"/",
	AddTeamUserParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>("/", addTeamUser)
myOrgsTeamsUsersUserIdRouter.delete<
	"/",
	DeleteTeamUserParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>("/", deleteTeamUser)

export { myOrgsTeamsUsersUserIdRouter }
