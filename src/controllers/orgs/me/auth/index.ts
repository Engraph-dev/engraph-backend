import { EventType } from "@prisma/client"
import { compare } from "bcryptjs"

import { createAndSendVerificationToken } from "@/util/app/auth"
import { getEventData, logEvent } from "@/util/app/events"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type {
	DangerZoneBody,
	VerifyTokenBody,
	VerifyTokenParams,
} from "@/util/defs/engraph-backend/orgs/me/auth"
import { requestHandler } from "@/util/http/helpers"

export const verifyToken = requestHandler<VerifyTokenParams, VerifyTokenBody>(
	async (req, res) => {
		const { orgId } = req.params
		const { tokenId, verificationToken } = req.body
		const { userId } = req.currentSession!

		const authDoc = await db.userVerificationToken.update({
			where: {
				tokenId: tokenId,
				verificationToken: verificationToken,
				userId: userId,
				targetUser: {
					userOrgId: orgId,
				},
			},
			data: {
				targetUser: {
					update: {
						userVerified: true,
					},
				},
			},
		})

		await db.userVerificationToken.deleteMany({
			where: {
				userId: authDoc.userId,
			},
		})

		logEvent({
			...getEventData(req),
			eventType: EventType.AuthVerify,
			eventMetadata: {
				tokenId: tokenId,
				verificationToken: verificationToken,
			},
		})

		res.status(StatusCodes.OK).json({
			responseStatus: "SUCCESS",
		})
	},
)

export const resendVerificationToken = requestHandler(async (req, res) => {
	const { userId } = req.currentSession!

	const userDoc = await db.user.findUniqueOrThrow({
		where: {
			userId: userId,
		},
	})

	createAndSendVerificationToken({
		userId: userId,
		orgId: userDoc.userOrgId,
		mailAddress: userDoc.userMail,
	})

	res.status(StatusCodes.OK).json({
		responseStatus: "SUCCESS",
	})
})

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
