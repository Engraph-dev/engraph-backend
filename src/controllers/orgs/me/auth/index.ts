import { compare } from "bcryptjs"

import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type { DangerZoneBody } from "@/util/defs/engraph-backend/orgs/me/auth"
import { requestHandler } from "@/util/http/wrappers"

/**
 * Danger Zone: Verify user password
 * Use this endpoint to verify the user's password before performing any dangerous operations.
 */
export const dangerZone = requestHandler<NoParams, DangerZoneBody, NoParams>(
	async (req, res) => {
		const { userId } = req.currentSession!
		const authDoc = await db.user.findFirstOrThrow({
			where: {
				userId: userId,
			},
		})

		const { userPassword } = authDoc

		const isPasswordMatch = await compare(
			req.body.userPassword,
			userPassword,
		)
		if (isPasswordMatch) {
			return res.status(StatusCodes.OK).json({
				responseStatus: "SUCCESS",
			})
		}

		return res.status(StatusCodes.BAD_REQUEST).json({
			responseStatus: "ERR_INVALID_PARAMS",
			invalidParams: [
				{
					paramType: "BODY",
					paramName: "userPassword",
					errorCode: ErrorCodes.PasswordMismatch,
				},
			],
		})
	},
)
