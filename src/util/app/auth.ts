import { EventType, type User } from "@prisma/client"
import { verify } from "jsonwebtoken"
import { createHash } from "node:crypto"

import { logEvent } from "@/util/app/events"
import { sendMail } from "@/util/app/mail"
import {
	AUTH_COOKIE_NAME,
	AUTH_HEADER_NAME,
	BRAND_NAME,
	COOKIE_SILENT_FAIL,
	JWT_SECRET,
	SESSION_EXPIRY_SILENT_FAIL,
	SESSION_ID_SILENT_FAIL,
	VERIFICATION_TOKEN_EXPIRATION_HOURS,
	WEB_ENDPOINTS,
	WEB_ORIGIN,
	WEB_PROTO,
} from "@/util/config/auth"
import db from "@/util/db"
import { SessionCookieContent } from "@/util/http"
import { middlewareHandler } from "@/util/http/helpers"

export const authParser = middlewareHandler(async (req, res, next) => {
	let authCookie: string | string[] | undefined = undefined
	let altHeaderMode = false
	if (req.cookies[AUTH_COOKIE_NAME]) {
		authCookie = req.cookies[AUTH_COOKIE_NAME]
	}
	if (!authCookie && req.headers[AUTH_HEADER_NAME.toLowerCase()]) {
		authCookie = req.headers[AUTH_HEADER_NAME.toLowerCase()]
		altHeaderMode = true
	}
	if (authCookie && typeof authCookie === "string" && authCookie.length > 0) {
		const parsedCookie = verify(
			authCookie,
			JWT_SECRET,
		) as SessionCookieContent
		if (!parsedCookie.sessionId) {
			if (!COOKIE_SILENT_FAIL) {
				throw new Error(
					"Session ID was not found in the cookie! The environment secrets may have been leaked!",
				)
			}
		} else {
			const dbSession = await db.session.findFirst({
				where: {
					sessionId: parsedCookie.sessionId,
					sessionToken: authCookie,
				},
				include: {
					sessionUser: true,
					sessionOrg: true,
				},
			})
			if (!dbSession) {
				if (!SESSION_ID_SILENT_FAIL) {
					throw new Error(
						`Session ${parsedCookie.sessionId} not found in the database!`,
					)
				}
			}

			if (
				dbSession &&
				dbSession.sessionEndTimestamp &&
				dbSession.sessionEndTimestamp <= new Date()
			) {
				if (!SESSION_EXPIRY_SILENT_FAIL) {
					throw new Error(
						`Expired / Closed session ${dbSession.sessionId} was used`,
					)
				}
			}

			// Check if the session is from the same IP and User Agent
			// if (
			// 	altHeaderMode === false &&
			// 	dbSession.sessionIp === req.ip &&
			// 	dbSession.sessionUA === req.headers["user-agent"]
			// ) {
			// 	req.currentSession = dbSession
			// 	req.devApp = undefined
			// } else if (altHeaderMode === true) {
			// 	req.currentSession = dbSession
			// 	req.devApp = undefined
			// }
			req.currentSession = dbSession ?? undefined
			// req.devApp = undefined
		}
	}

	next()
})

type SendVerificationTokenArgs = {
	userId: string
	orgId: string
	mailAddress: User["userMail"]
}

export async function createAndSendVerificationToken(
	args: SendVerificationTokenArgs,
) {
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
