import { createHash } from "crypto"

import { createCuid } from "@/util/app/helpers"
import { XSRF_TIMEOUT_SECONDS } from "@/util/config/http"
import db from "@/util/db"
import { type NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import { GetXSRFTokenResponse } from "@/util/defs/engraph-backend/xsrf"
import { requestHandler } from "@/util/http/wrappers"

/**
 * Get a new XSRF token for the current session (if authenticated)
 * The token is valid for {XSRF_TIMEOUT_SECONDS} seconds
 * The token is stored in the database for validation
 */
export const getXSRFToken = requestHandler<NoParams, NoParams, NoParams>(
	async (req, res) => {
		const tokenId = createCuid()
		const reqIp = req.ip || ""
		const reqUA = req.headers["user-agent"] || ""
		const expTimestamp = new Date(Date.now() + XSRF_TIMEOUT_SECONDS * 1000)

		const tokenContent = `${tokenId}.${reqIp}.${reqUA}.${expTimestamp}`

		const tokenHash = createHash("sha256")
			.update(tokenContent)
			.digest("hex")

		await db.crossSiteToken.create({
			data: {
				tokenId: tokenId,
				tokenHash: tokenHash,
				tokenIp: reqIp,
				tokenUA: reqUA,
				tokenSessionId: req.currentSession?.sessionId,
				tokenExpiryTimestamp: expTimestamp,
			},
		})

		return res.status(StatusCodes.OK).json<GetXSRFTokenResponse>({
			responseStatus: "SUCCESS",
			xsrfToken: {
				tokenExpiryTimestamp: expTimestamp,
				tokenHash: tokenHash,
			},
		})
	},
)
