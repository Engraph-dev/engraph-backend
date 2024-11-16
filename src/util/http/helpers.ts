import { CORS_CONFIG } from "../config/auth"
import cors from "cors"
import { NextFunction } from "express"
import rateLimit from "express-rate-limit"

import {
	ACTION_RATE_LIMIT_CONFIG,
	GET_RATE_LIMIT_CONFIG,
	NODE_ENV,
	USE_XSRF_PROTECTION,
	XSRF_HEADER_NAME,
} from "@/util/config/http"
import db from "@/util/db"
import { StatusCodes } from "@/util/defs/engraph-backend/common"
import { IRequest, IResponse } from "@/util/http/index"

// This is a helper function that wraps around the core handler function
// Simply manages the internal errors for you through try catch, so you don't have to
// Also normalizes the request and response format
export function requestHandler<
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	coreHandler: (
		req: IRequest<ParamT, BodyT, QueryT>,
		res: IResponse<ParamT, BodyT, QueryT>,
	) => Promise<any> | any,
) {
	return async (
		req: IRequest<ParamT, BodyT, QueryT>,
		res: IResponse<ParamT, BodyT, QueryT>,
	) => {
		try {
			await coreHandler(req, res)
		} catch (err) {
			console.error(err)
			res.status(StatusCodes.INTERNAL_ERROR).json({
				responseStatus: "ERR_INTERNAL_ERROR",
			})
		}
	}
}

// Wraps middleware similar to requestHandler
// Declare your middleware with this,
// e.g. const myMiddleware = middlewareHandler((req, res, next) => {})
// And not like this
// app.use(middlewareHandler((req, res, next) => {}))
export function middlewareHandler<
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	middlewareFn: (
		req: IRequest<ParamT, BodyT, QueryT>,
		res: IResponse<ParamT, BodyT, QueryT>,
		next: NextFunction,
	) => Promise<any> | any,
) {
	return async (
		req: IRequest<ParamT, BodyT, QueryT>,
		res: IResponse<ParamT, BodyT, QueryT>,
		next: NextFunction,
	) => {
		try {
			await middlewareFn(req, res, next)
		} catch (err) {
			console.error(err)
			res.status(StatusCodes.INTERNAL_ERROR).json({
				responseStatus: "ERR_INTERNAL_ERROR",
			})
		}
	}
}

export const requestHelper = middlewareHandler((req, res, next) => {
	const startTimestamp = Date.now()
	res.setHeader("Cache-Control", "no-store")

	if (NODE_ENV === "development") {
		console.log(
			`${req.protocol.toUpperCase()} ${req.method} ${req.originalUrl}`,
		)
		console.log(JSON.stringify(req.headers, null, 4))
		console.log(JSON.stringify(req.params, null, 4))
		console.log(JSON.stringify(req.body, null, 4))
		console.log(JSON.stringify(req.query, null, 4))

		const oldJson = res.json

		const newJson: typeof res.json = (data) => {
			console.log(JSON.stringify(res.getHeaders(), null, 4))
			console.log(JSON.stringify(data, null, 4))
			oldJson.call(res, data)
			const endTimestamp = Date.now()
			console.log(`Request RT: ${endTimestamp - startTimestamp}ms`)
			return res
		}

		res.json = newJson
	}

	next()
})

export const xsrfParser = middlewareHandler(async (req, res, next) => {
	req.xsrfValid = false
	if (!USE_XSRF_PROTECTION) {
		req.xsrfValid = true
		return next()
	}

	const xsrfToken = req.headers[XSRF_HEADER_NAME.toLowerCase()]
	if (typeof xsrfToken !== "string") {
		return next()
	}

	const tokenDoc = await db.crossSiteToken.deleteMany({
		where: {
			tokenHash: xsrfToken,
			tokenExpiryTimestamp: {
				gt: new Date(),
			},
			tokenIp: req.ip || "",
			tokenUA: req.headers["user-agent"] || "",
		},
	})

	if (tokenDoc.count === 0) {
		return next()
	}

	req.xsrfValid = true
	return next()
})

const baseCorsHandler = cors(CORS_CONFIG)

export const corsHelper = middlewareHandler((req, res, next) => {
	const isDevelopment = NODE_ENV === "development"
	const originHeader = req.headers["origin"]
	if (!isDevelopment && !originHeader) {
		return res.status(StatusCodes.TEAPOT).json({
			responseStatus: "ERR_TEAPOT",
		})
	}
	return baseCorsHandler(req, res, next)
})

const _getRateLimiter = rateLimit(GET_RATE_LIMIT_CONFIG)
const _actionRateLimiter = rateLimit(ACTION_RATE_LIMIT_CONFIG)

export const getRateLimiter = middlewareHandler(_getRateLimiter)
export const actionRateLimiter = middlewareHandler(_actionRateLimiter)
