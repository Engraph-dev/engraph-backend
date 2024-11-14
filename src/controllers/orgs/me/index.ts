import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import { OrgResponse } from "@/util/defs/engraph-backend/orgs"
import type { UpdateOrgBody } from "@/util/defs/engraph-backend/orgs/me"
import { requestHandler } from "@/util/http/helpers"

export const getMyOrg = requestHandler<NoParams, NoParams, NoParams>(
	async (req, res) => {
		const orgId = req.currentSession!.sessionUser.userOrgId

		const orgData = await db.org.findFirstOrThrow({
			where: {
				orgId: orgId,
			},
		})

		return res.status(StatusCodes.OK).json<OrgResponse>({
			responseStatus: "SUCCESS",
			orgData: orgData,
		})
	},
)

export const updateOrg = requestHandler<NoParams, UpdateOrgBody, NoParams>(
	async (req, res) => {
		const { orgName } = req.body
		const orgData = await db.org.update({
			where: {
				orgId: req.currentSession!.orgId,
			},
			data: {
				orgName: orgName,
			},
		})

		return res.status(StatusCodes.OK).json<OrgResponse>({
			responseStatus: "SUCCESS",
			orgData: orgData,
		})
	},
)
