import { ProjectType, UserRole } from "@prisma/client"

import {
	deleteProject,
	getProject,
	updateProject,
} from "@/controllers/orgs/me/projects/[projectId]"

import { projectIdTeamsRouter } from "@/routers/orgs/me/projects/[projectId]/teams"
import { projectIdUsersRouter } from "@/routers/orgs/me/projects/[projectId]/users"
import { projectWorkflowsRouter } from "@/routers/orgs/me/projects/[projectId]/workflows"

import { requireOrgRole } from "@/util/app/middleware/orgs"
import { ProjectAdminAccessValidator } from "@/util/app/validators/projects"
import type { NoParams } from "@/util/defs/engraph-backend/common"
import type { ProjectId } from "@/util/defs/engraph-backend/orgs/me/projects"
import type {
	DeleteProjectParams,
	GetProjectParams,
	UpdateProjectBody,
	UpdateProjectParams,
} from "@/util/defs/engraph-backend/orgs/me/projects/[projectId]"
import { validateParams } from "@/util/http/middleware"
import { Router } from "@/util/http/router"
import {
	EXPECT_TYPE,
	IN_ENUM,
	NOVALIDATE,
	NULLISH,
	STR_NOT_EMPTY,
} from "@/util/http/validators"

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
	requireOrgRole({
		userRole: UserRole.Admin,
		includeImplicit: true,
	}),
	validateParams({
		bodyParams: {
			projectName: NULLISH(STR_NOT_EMPTY()),
			projectType: NULLISH(IN_ENUM(ProjectType)),
			projectEntryPoint: NULLISH(
				EXPECT_TYPE<string>("string", NOVALIDATE()),
			),
			projectBranch: NULLISH(STR_NOT_EMPTY()),
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
>(
	"/",
	requireOrgRole({
		userRole: UserRole.Admin,
		includeImplicit: true,
	}),
	deleteProject,
)

myOrgProjectIdRouter.get<
	"/",
	GetProjectParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>("/", getProject)

myOrgProjectIdRouter.use<ProjectId>(
	"/users",
	validateParams({
		urlParams: {
			projectId: ProjectAdminAccessValidator({ includeImplicit: true }),
		},
	}),
	projectIdUsersRouter,
)

myOrgProjectIdRouter.use<ProjectId>(
	"/teams",
	validateParams({
		urlParams: {
			projectId: ProjectAdminAccessValidator({ includeImplicit: true }),
		},
	}),
	projectIdTeamsRouter,
)

myOrgProjectIdRouter.use<ProjectId>("/workflows", projectWorkflowsRouter)

export { myOrgProjectIdRouter }
