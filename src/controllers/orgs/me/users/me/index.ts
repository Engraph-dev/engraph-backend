import { hashSync } from "bcryptjs"

import { BCRYPT_SALT_ROUNDS } from "@/util/config/auth"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import type {
	MyUserResponse,
	UpdateMyUserBody,
} from "@/util/defs/engraph-backend/orgs/me/users/me"
import { requestHandler } from "@/util/http/wrappers"

export const getMyUser = requestHandler(async (req, res) => {
	const userData = await db.user.findFirstOrThrow({
		where: {
			userId: req.currentSession!.userId,
		},
	})

	// @ts-ignore
	delete userData["userPassword"]

	return res.status(StatusCodes.OK).json<MyUserResponse>({
		responseStatus: "SUCCESS",
		userData: userData,
	})
})

export const updateMyUser = requestHandler<
	NoParams,
	UpdateMyUserBody,
	NoParams
>(async (req, res) => {
	const { userFirstName, userLastName, userPassword } = req.body

	const updatedPassword =
		userPassword === undefined
			? undefined
			: hashSync(userPassword, BCRYPT_SALT_ROUNDS)

	const userData = await db.user.update({
		where: {
			userId: req.currentSession!.userId,
		},
		data: {
			userFirstName: userFirstName,
			userLastName: userLastName,
			userPassword: updatedPassword,
		},
	})

	// @ts-ignore
	delete userData["userPassword"]

	return res.status(StatusCodes.OK).json<MyUserResponse>({
		responseStatus: "SUCCESS",
		userData: userData,
	})
})
