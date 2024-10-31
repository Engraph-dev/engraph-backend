import { compareSync } from "bcryptjs"

import db from "@/util/db"
import { NoParams, StatusCodes } from "@/util/defs/common"
import { OrgIdParams } from "@/util/defs/orgs/[orgId]"
import { LoginOrgUserBody } from "@/util/defs/orgs/[orgId]/auth"
import { requestHandler } from "@/util/http/helpers"

export const loginOrgUser = requestHandler<
	OrgIdParams,
	LoginOrgUserBody,
	NoParams
>(async (req, res) => {
	const { userMail, userPassword } = req.body
	const { orgId } = req.params

	const user = await db.user.findFirstOrThrow({
		where: {
			userMail,
			userOrgId: orgId,
		},
	})

	if (!user) {
		return res.status(StatusCodes.NOT_FOUND).json({
			responseStatus: "ERR_NOT_FOUND",
		})
	}

	const passwordMatch = compareSync(userPassword, user.userPassword)

	if (!passwordMatch) {
		return res.status(StatusCodes.UNAUTHORIZED).json({
			responseStatus: "ERR_UNAUTHORIZED",
		})
	}

	return res.status(StatusCodes.OK).json({
		responseStatus: "SUCCESS",
	})
})
