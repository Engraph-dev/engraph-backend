import { UserRole } from "@prisma/client"
import { hashSync } from "bcryptjs"

import { createAndSendVerificationToken } from "@/util/app/auth"
import {
	IdentSuffixType,
	generateIdentifierFromString,
} from "@/util/app/data-handlers"
import { BCRYPT_SALT_ROUNDS } from "@/util/config/auth"
import db from "@/util/db"
import { NoParams, StatusCodes } from "@/util/defs/common"
import type { CreateOrgBody } from "@/util/defs/orgs"
import { requestHandler } from "@/util/http/helpers"

export const createOrg = requestHandler<NoParams, CreateOrgBody, NoParams>(
	async (req, res) => {
		const { orgName, userFirstName, userLastName, userMail, userPassword } =
			req.body

		const hashedPassword = hashSync(userPassword, BCRYPT_SALT_ROUNDS)

		const { orgId, orgUsers } = await db.org.create({
			data: {
				orgId: generateIdentifierFromString(
					orgName,
					IdentSuffixType.MiniCuid,
				),
				orgName: orgName,
				orgUsers: {
					create: {
						userFirstName: userFirstName,
						userLastName: userLastName,
						userMail: userMail,
						userRole: UserRole.Owner,
						userPassword: hashedPassword,
					},
				},
			},
			include: {
				orgUsers: {
					take: 1,
				},
			},
		})

		const ownerUser = orgUsers[0]
		createAndSendVerificationToken({
			mailAddress: ownerUser.userMail,
			orgId: orgId,
			userId: ownerUser.userId,
		})

		return res.status(StatusCodes.OK).json({
			responseStatus: "SUCCESS",
		})
	},
)

