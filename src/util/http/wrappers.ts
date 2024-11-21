import type { NextFunction } from "express"

import { StatusCodes } from "@/util/defs/engraph-backend/common"
import type { IRequest, IResponse } from "@/util/http"
import { LogLevel, log } from "@/util/log"

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
			const beforeHandlerTs = Date.now()
			await coreHandler(req, res)
			const afterHandlerTs = Date.now()
			log(
				"handler",
				LogLevel.Debug,
				`${req.method} ${req.originalUrl} took ${
					afterHandlerTs - beforeHandlerTs
				}ms`,
			)
		} catch (err) {
			log("handler", LogLevel.Error, err)
			res.status(StatusCodes.INTERNAL_ERROR).json({
				responseStatus: "ERR_INTERNAL_ERROR",
			})
		}
	}
}

/**
 * Wraps middleware similar to requestHandler
 * Declare your middleware with this,
 * e.g. const myMiddleware = middlewareHandler((req, res, next) => {})
 * And not like this
 * app.use(middlewareHandler((req, res, next) => {}))
 */
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
			const beforeHandlerTs = Date.now()
			await middlewareFn(req, res, next)
			const afterHandlerTs = Date.now()
			log(
				"middleware",
				LogLevel.Debug,
				`${req.method} ${req.originalUrl} took ${
					afterHandlerTs - beforeHandlerTs
				}ms`,
			)
		} catch (err) {
			log("middleware", LogLevel.Error, err)
			res.status(StatusCodes.INTERNAL_ERROR).json({
				responseStatus: "ERR_INTERNAL_ERROR",
			})
		}
	}
}
