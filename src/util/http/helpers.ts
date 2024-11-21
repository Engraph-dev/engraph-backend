import { verify } from "jsonwebtoken"

import {
	ALLOW_MALFORMED_JWT,
	AUTH_COOKIE_NAME,
	AUTH_HEADER_NAME,
	JWT_SECRET,
} from "@/util/config/auth"
import type { IRequest, SessionJwtContent } from "@/util/http"

export type ParsedJwtData =
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
			if (!ALLOW_MALFORMED_JWT) {
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

		return {
			jwtString: authString,
			jwtData: parsedData,
			headerMode: altHeaderMode,
		}
	}

	return {
		jwtString: undefined,
		jwtData: undefined,
		headerMode: undefined,
	}
}
