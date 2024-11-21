import { EventType, OrgPlan, UserRole } from "@prisma/client"
import { hashSync } from "bcryptjs"

import { getEventData, logEvent } from "@/util/app/events"
import { createCuid } from "@/util/app/helpers"
import { createAndSendVerificationToken } from "@/util/app/helpers/auth"
import {
	IdentSuffixType,
	generateIdentifierFromString,
} from "@/util/app/helpers/data-handlers"
import { BCRYPT_SALT_ROUNDS, VERIFY_EMAIL } from "@/util/config/auth"
import db from "@/util/db"
import { NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	type CreateOrgBody,
	OrgResponse,
} from "@/util/defs/engraph-backend/orgs"
import { requestHandler } from "@/util/http/wrappers"

/**
 * This is the handler for the orgs endpoint.
 * It handles requests to create a new organization.
 * On request, it creates a new organization and a user with the role of owner.
 * It sends a verification token to the user's email address.
 * It also logs an event for the creation of the organization.
 */
export const createOrg = requestHandler<NoParams, CreateOrgBody, NoParams>(
	async (req, res) => {
		const { orgName, userFirstName, userLastName, userMail, userPassword } =
			req.body

		const hashedPassword = hashSync(userPassword, BCRYPT_SALT_ROUNDS)

		const userId = createCuid()

		const orgData = await db.org.create({
			data: {
				orgId: generateIdentifierFromString(
					orgName,
					IdentSuffixType.MiniCuid,
				),
				orgName: orgName,
				orgPlan: OrgPlan.None,
				orgUsers: {
					create: {
						userId: userId,
						userFirstName: userFirstName,
						userLastName: userLastName,
						userMail: userMail,
						userRole: UserRole.Owner,
						userPassword: hashedPassword,
						userVerified: !VERIFY_EMAIL,
					},
				},
			},
		})

		const { orgId } = orgData

		logEvent({
			...getEventData(req),
			eventType: EventType.OrgCreate,
			orgId: orgId,
			eventMetadata: {},
		})

		createAndSendVerificationToken({
			mailAddress: userMail,
			orgId: orgId,
			userId: userId,
		})

		return res.status(StatusCodes.OK).json<OrgResponse>({
			responseStatus: "SUCCESS",
			orgData: orgData,
		})
	},
)
