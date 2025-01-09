import { ProjectType } from "@prisma/client"
import { Router } from "express"

import {
	deleteProject,
	updateProject,
} from "@/controllers/orgs/me/projects/[projectId]"

import { OrgProjectLimit } from "@/util/app/validators/projects"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	DeleteProjectParams,
	UpdateProjectBody,
	UpdateProjectParams,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]"
import { validateParams } from "@/util/http/middleware"
import { ALL_OF, IN_ENUM, NULLISH, STR_NOT_EMPTY } from "@/util/http/validators"

const myOrgProjectIdRouter = Router({ mergeParams: true })

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

export { myOrgProjectIdRouter }
