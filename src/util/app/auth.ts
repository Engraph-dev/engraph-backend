import { EventType, type User } from "@prisma/client"
import { verify } from "jsonwebtoken"
import { createHash } from "node:crypto"

import { logEvent } from "@/util/app/events"
import { sendMail } from "@/util/app/mail"
import {
	AUTH_COOKIE_NAME,
	AUTH_HEADER_NAME,
	BRAND_NAME,
	JWT_SECRET,
	JWT_SECRET_EXPOSED_SILENT_FAIL,
	SESSION_EXPIRY_SILENT_FAIL,
	SESSION_ID_SILENT_FAIL,
	STRICT_SESSION_IP_UA_CHECK,
	VERIFICATION_TOKEN_EXPIRATION_HOURS,
	VERIFY_EMAIL,
	WEB_ENDPOINTS,
	WEB_ORIGIN,
	WEB_PROTO,
} from "@/util/config/auth"
import db from "@/util/db"
import { type IRequest, SessionJwtContent } from "@/util/http"
import { middlewareHandler } from "@/util/http/helpers"

type ParsedJwtData =
	| {
			jwtString: string
			jwtData: SessionJwtContent
			headerMode: boolean
	  }
	| {
			jwtString: undefined
			jwtData: undefined
			headerMode: undefined
	  }

export function parseJwtFromRequest(req: IRequest): ParsedJwtData {
	let authString: string | string[] | undefined = undefined
	let altHeaderMode = false
	if (req.cookies[AUTH_COOKIE_NAME]) {
		authString = req.cookies[AUTH_COOKIE_NAME]
	}
	if (!authString && req.headers[AUTH_HEADER_NAME.toLowerCase()]) {
		authString = req.headers[AUTH_HEADER_NAME.toLowerCase()]
		altHeaderMode = true
	}

	if (authString && typeof authString === "string" && authString.length > 0) {
		const parsedData = verify(authString, JWT_SECRET) as SessionJwtContent

		if (!parsedData || typeof parsedData.sessionId !== "string") {
			if (!JWT_SECRET_EXPOSED_SILENT_FAIL) {
				throw new Error(
					"Session ID was not found in the jwt! The environment secrets may have been leaked!",
				)
			}
			return {
				jwtString: undefined,
				jwtData: undefined,
				headerMode: undefined,
			}
		}
	}

	return {
		jwtString: undefined,
		jwtData: undefined,
		headerMode: undefined,
	}
}

export const authParser = middlewareHandler(async (req, res, next) => {
	const { headerMode, jwtData, jwtString } = parseJwtFromRequest(req)
	if (jwtData) {
		const dbSession = await db.session.findFirst({
			where: {
				sessionId: jwtData.sessionId,
				sessionToken: jwtString,
			},
			include: {
				sessionUser: true,
				sessionOrg: true,
			},
		})
		if (!dbSession) {
			if (!SESSION_ID_SILENT_FAIL) {
				throw new Error(
					`Session ${jwtData.sessionId} not found in the database!`,
				)
			}
		}

		if (dbSession && dbSession.sessionEndTimestamp <= new Date()) {
			if (!SESSION_EXPIRY_SILENT_FAIL) {
				throw new Error(
					`Expired / Closed session ${dbSession.sessionId} was used`,
				)
			}
			if (STRICT_SESSION_IP_UA_CHECK){
				const reqIp = req.ip || ""
				const reqUa = req.headers["user-agent"] || ""	
				if (
					dbSession.sessionIp !== reqIp ||
					dbSession.sessionUA !== reqUa
				){
					throw new Error(`Session ${dbSession.sessionId} IP/UA mismatch!`)
				}
			}
		}
		req.currentSession = dbSession ?? undefined
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
