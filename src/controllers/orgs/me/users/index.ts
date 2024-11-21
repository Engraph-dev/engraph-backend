import { EventType } from "@prisma/client"
import { hashSync } from "bcryptjs"

import { getEventData, logEvent } from "@/util/app/events"
import { getQueryOffset } from "@/util/app/helpers"
import { createAndSendVerificationToken } from "@/util/app/helpers/auth"
import { getMiniUser } from "@/util/app/helpers/users"
import { BCRYPT_SALT_ROUNDS, VERIFY_EMAIL } from "@/util/config/auth"
import db from "@/util/db"
import { NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type CreateUserBody,
	CreateUserResponse,
	type GetUsersQuery,
	type GetUsersResponse,
} from "@/util/defs/engraph-backend/orgs/me/users"
import { requestHandler } from "@/util/http/wrappers"

export const createUser = requestHandler<NoParams, CreateUserBody, NoParams>(
	async (req, res) => {
		const {
			userFirstName,
			userLastName,
			userMail,
			userPassword,
			userRole,
		} = req.body

		const userData = await db.user.create({
			data: {
				userFirstName: userFirstName,
				userLastName: userLastName,
				userMail: userMail,
				userPassword: hashSync(userPassword, BCRYPT_SALT_ROUNDS),
				userRole: userRole,
				userOrgId: req.currentSession!.orgId,
				userVerified: !VERIFY_EMAIL,
			},
		})

		createAndSendVerificationToken({
			mailAddress: userMail,
			orgId: req.currentSession!.orgId,
			userId: userData.userId,
		})

		logEvent({
			...getEventData(req),
			eventType: EventType.UserCreate,
			eventMetadata: {
				userId: userData.userId,
			},
		})

		return res.status(StatusCodes.OK).json<CreateUserResponse>({
			responseStatus: "SUCCESS",
			userData: getMiniUser(userData),
		})
	},
)

export const getUsers = requestHandler<NoParams, NoParams, GetUsersQuery>(
	async (req, res) => {
		const orgUsers = await db.user.findMany({
			where: {
				userOrgId: req.currentSession!.orgId,
			},
			...getQueryOffset(req.query),
		})

		const mappedUsers = orgUsers.map((orgUser) => {
			return getMiniUser(orgUser)
		})

		return res.status(StatusCodes.OK).json<GetUsersResponse>({
			responseStatus: "SUCCESS",
			orgUsers: mappedUsers,
		})
	},
)
