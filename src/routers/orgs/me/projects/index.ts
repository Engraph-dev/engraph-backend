import {
	AccessLevel,
	ProjectSourceType,
	ProjectType,
	UserRole,
} from "@prisma/client"

import { createProject, getProjects } from "@/controllers/orgs/me/projects"

import { myOrgProjectIdRouter } from "@/routers/orgs/me/projects/[projectId]"

import { requireOrgRole } from "@/util/app/middleware/orgs"
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
import {
	ALL_OF,
	EXPECT_TYPE,
	IN_ENUM,
	NOVALIDATE,
	NULLISH,
	STR_NOT_EMPTY,
} from "@/util/http/validators"

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
	requireOrgRole({
		userRole: UserRole.Admin,
		includeImplicit: true,
	}),
	validateParams<NoParams, CreateProjectBody, NoParams>({
		bodyParams: {
			projectName: ALL_OF([STR_NOT_EMPTY(), OrgProjectLimit]),
			projectSourceType: IN_ENUM(ProjectSourceType),
			projectIdentifier: STR_NOT_EMPTY(),
			projectBranch: STR_NOT_EMPTY(),
			projectType: IN_ENUM(ProjectType),
			projectEntryPoint: EXPECT_TYPE<string>("string", NOVALIDATE()),
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
