import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/common"
import { GetOrgResponse } from "@/util/defs/orgs"
import { requestHandler } from "@/util/http/helpers"

export const getMyOrg = requestHandler<NoParams, NoParams, NoParams>(
	async (req, res) => {
		const orgId = req.currentSession!.sessionUser.userOrgId

		const orgData = await db.org.findFirstOrThrow({
			where: {
				orgId: orgId,
			},
		})

		return res.status(StatusCodes.OK).json<GetOrgResponse>({
			responseStatus: "SUCCESS",
			orgData: orgData,
		})
	},
)
