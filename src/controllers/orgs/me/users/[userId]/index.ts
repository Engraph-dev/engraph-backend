import { hashSync } from "bcryptjs"

import { getMiniUser } from "@/util/app/helpers/users"
import { BCRYPT_SALT_ROUNDS } from "@/util/config/auth"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type DeleteUserParams,
	type UpdateUserBody,
	UpdateUserParams,
	type UpdateUserResponse,
} from "@/util/defs/engraph-backend/orgs/me/users/[userId]"
import { requestHandler } from "@/util/http/wrappers"

export const updateUser = requestHandler<
	UpdateUserParams,
	UpdateUserBody,
	NoParams
>(async (req, res) => {
	const { userId } = req.params
	const { userFirstName, userLastName, userPassword, userRole } = req.body

	const userData = await db.user.update({
		where: {
			userId: userId,
			userOrgId: req.currentSession!.orgId,
		},
		data: {
			userFirstName: userFirstName,
			userLastName: userLastName,
			userPassword: userPassword
				? hashSync(userPassword, BCRYPT_SALT_ROUNDS)
				: undefined,
			userRole: userRole,
		},
	})

	return res.status(StatusCodes.OK).json<UpdateUserResponse>({
		responseStatus: "SUCCESS",
		userData: getMiniUser(userData),
	})
})

export const deleteUser = requestHandler<DeleteUserParams, NoParams, NoParams>(
	async (req, res) => {
		const { userId } = req.params

		await db.user.delete({
			where: {
				userId: userId,
				userOrgId: req.currentSession!.orgId,
			},
		})

		return res.status(StatusCodes.OK).json({
			responseStatus: "SUCCESS",
		})
	},
)
