import { NODE_ENV } from "../config/http"
import { NextFunction } from "express"

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
