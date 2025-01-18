import { ProjectType } from "@prisma/client"

import {
	deleteProject,
	getProject,
	updateProject,
} from "@/controllers/orgs/me/projects/[projectId]"

import { OrgProjectLimit } from "@/util/app/validators/projects"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	DeleteProjectParams,
	GetProjectParams,
	UpdateProjectBody,
	UpdateProjectParams,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { ALL_OF, IN_ENUM, NULLISH, STR_NOT_EMPTY } from "@/util/http/validators"

const myOrgProjectIdRouter = Router()

myOrgProjectIdRouter.patch<
	"/",
	UpdateProjectParams,
	NoParams,
	UpdateProjectBody,
	NoParams,
	NoParams
>(
	"/",
	validateParams<UpdateProjectParams, UpdateProjectBody, NoParams>({
		bodyParams: {
			projectName: NULLISH(ALL_OF([STR_NOT_EMPTY(), OrgProjectLimit])),
			projectType: NULLISH(IN_ENUM(ProjectType)),
			projectEntryPoint: NULLISH(STR_NOT_EMPTY()),
		},
	}),
	updateProject,
)

myOrgProjectIdRouter.delete<
	"/",
	DeleteProjectParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>("/", deleteProject)

myOrgProjectIdRouter.get<
	"/",
	GetProjectParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>("/", getProject)

export { myOrgProjectIdRouter }
