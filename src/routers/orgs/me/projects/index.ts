import { AccessLevel, ProjectSourceType } from "@prisma/client"
import { Router } from "express"

import { createProject, getProjects } from "@/controllers/orgs/me/projects"

import { myOrgProjectIdRouter } from "@/routers/orgs/me/projects/[projectId]"

import { WithPagedQueryValidator } from "@/util/app/validators/common"
import {
	OrgProjectLimit,
	ProjectIdSameOrgValidator,
	ProjectSourceValidator,
} from "@/util/app/validators/projects"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type {
	CreateProjectBody,
	GetProjectsQuery,
	ProjectId,
} from "@/util/defs/engraph-backend/orgs/me/projects"
import { validateParams } from "@/util/http/middleware"
import {
	ALL_OF,
	IN_ENUM,
	IS_URL,
	NULLISH,
	STR_NOT_EMPTY,
} from "@/util/http/validators"

const myOrgProjectsRouter = Router({ mergeParams: true })

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
			projectSourceUrl: IS_URL(),
		},
		batchValidators: {
			bodyParams: [ProjectSourceValidator],
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
			projectId: ProjectIdSameOrgValidator,
		},
	}),
	myOrgProjectIdRouter,
)

export { myOrgProjectsRouter }
