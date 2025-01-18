import { AccessLevel, ProjectSourceType, ProjectType } from "@prisma/client"

import { createProject, getProjects } from "@/controllers/orgs/me/projects"

import { myOrgProjectIdRouter } from "@/routers/orgs/me/projects/[projectId]"

import { WithPagedQueryValidator } from "@/util/app/validators/common"
import {
	OrgProjectLimit,
	ProjectEntityValidator,
} from "@/util/app/validators/projects"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	CreateProjectBody,
	GetProjectsQuery,
	ProjectId,
} from "@/util/defs/engraph-backend/orgs/me/projects"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import { ALL_OF, IN_ENUM, NULLISH, STR_NOT_EMPTY } from "@/util/http/validators"

const myOrgProjectsRouter = Router()

myOrgProjectsRouter.get<"/", NoParams, NoParams, NoParams, GetProjectsQuery>(
	"/",
	validateParams({
		queryParams: WithPagedQueryValidator<GetProjectsQuery>({
			accessLevel: NULLISH(IN_ENUM(AccessLevel)),
		}),
	}),
	getProjects,
)

myOrgProjectsRouter.post<
	"/",
	NoParams,
	NoParams,
	CreateProjectBody,
	NoParams,
	NoParams
>(
	"/",
	validateParams<NoParams, CreateProjectBody, NoParams>({
		bodyParams: {
			projectName: ALL_OF([STR_NOT_EMPTY(), OrgProjectLimit]),
			projectSourceType: IN_ENUM(ProjectSourceType),
			projectIdentifier: STR_NOT_EMPTY(),
			projectBranch: STR_NOT_EMPTY(),
			projectType: IN_ENUM(ProjectType),
			projectEntryPoint: STR_NOT_EMPTY(),
		},
	}),
	createProject,
)

myOrgProjectsRouter.use<
	"/:projectId",
	ProjectId,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>(
	"/:projectId",
	validateParams({
		urlParams: {
			projectId: ProjectEntityValidator({ allowSameOrgOnly: true }),
		},
	}),
	myOrgProjectIdRouter,
)

export { myOrgProjectsRouter }
