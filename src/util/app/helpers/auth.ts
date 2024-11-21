import { EventType, type User } from "@prisma/client"
import { createHash } from "node:crypto"

import { logEvent } from "@/util/app/events"
import { sendMail } from "@/util/app/helpers/mail"
import {
	BRAND_NAME,
	VERIFICATION_TOKEN_EXPIRATION_HOURS,
	VERIFY_EMAIL,
	WEB_ENDPOINTS,
	WEB_ORIGIN,
	WEB_PROTO,
} from "@/util/config/auth"
import db from "@/util/db"

type SendVerificationTokenArgs = {
	userId: string
	orgId: string
	mailAddress: User["userMail"]
}

export async function createAndSendVerificationToken(
	args: SendVerificationTokenArgs,
) {
	if (!VERIFY_EMAIL) {
		return
	}
	// Delete older tokens
	await db.userVerificationToken.deleteMany({
		where: {
			userId: args.userId,
		},
	})

	// Generate a new token
	const expirationTimestamp = new Date(
		Date.now() + VERIFICATION_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000,
	)

	const mixedIdentifier = `${args.userId}${expirationTimestamp.toISOString()}`
	const identHash = createHash("sha256")
		.update(mixedIdentifier)
		.digest("hex")
		.toString()

	const newToken = await db.userVerificationToken.create({
		data: {
			userId: args.userId,
			verificationToken: identHash,
			tokenExpirationTimestamp: expirationTimestamp,
		},
	})

	const tokenParams = new URLSearchParams()
	tokenParams.set("id", newToken.tokenId)
	tokenParams.set("token", identHash)
	tokenParams.set("orgId", args.orgId)

	const resolvedUrl = `${WEB_PROTO}://${args.orgId}.${WEB_ORIGIN}${WEB_ENDPOINTS.VERIFY_TOKEN}?${tokenParams.toString()}`

	if (args.mailAddress) {
		const mailResponse = await sendMail({
			to: args.mailAddress,
			subject: `Verify your ${BRAND_NAME} account`,
			contentTitle: "Verify your Account",
			contentBody: `
				<b>Click the button below to verify your ${BRAND_NAME} account</b>
				<div>
					<a href="${resolvedUrl}">
					<button style="padding: 1rem; background-color: black; color: white; border-radius: 8px; text-align: center;">
						Verify&nbsp;your&nbsp;Account
					</button>
				</a>
				</div>
				<p>If the button is not working, copy and paste this link into your browser</p>
				<a href="${resolvedUrl}">${resolvedUrl}</a>
			`,
		})

		if (mailResponse && mailResponse.data) {
			logEvent({
				userId: args.userId,
				sessionId: null,
				orgId: args.orgId,
				eventType: EventType.VerificationMailSend,
				eventMetadata: {
					mailId: mailResponse.data.id,
				},
			})
		}
	}
}
