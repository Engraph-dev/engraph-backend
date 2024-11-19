import { featureFlag } from "../config"
import { LogLevel, log } from "../log"
import { UserRole } from "@prisma/client"
import cors from "cors"
import rateLimit from "express-rate-limit"

import {
	ALLOW_EXPIRED_SESSIONS,
	ALLOW_NON_DB_SESSION_ID,
	CORS_CONFIG,
	STRICT_CHECK_SESSION_IP_UA,
} from "@/util/config/auth"
import {
	ACTION_RATE_LIMIT_CONFIG,
	GET_RATE_LIMIT_CONFIG,
	USE_XSRF_PROTECTION,
	XSRF_HEADER_NAME,
} from "@/util/config/http"
import db from "@/util/db"
import {
	InvalidParam,
	ParamType,
	ReqMethod,
	StatusCodes,
} from "@/util/defs/engraph-backend/common"
import { ErrorCode } from "@/util/defs/engraph-backend/errors"
import type { IRequest, ReqUserSession } from "@/util/http"
import { parseJwtFromRequest } from "@/util/http/helpers"
import { middlewareHandler } from "@/util/http/wrappers"

export type ValidatorFunctionRet =
	| {
			validationPass: true
	  }
	| {
			validationPass: false
			errorCode: ErrorCode
			errorArgs?: any
	  }

export type ValidatorFunction<
	ValueT,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
> = (
	value: ValueT,
	req: IRequest<ParamT, BodyT, QueryT>,
) =>
	| Promise<ValidatorFunctionRet | ValidatorFunctionRet[]>
	| ValidatorFunctionRet
	| ValidatorFunctionRet[]

export type BatchValidatorFunction<
	DataT,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
> = (
	batchParams: DataT,
	req: IRequest<ParamT, BodyT, QueryT>,
) =>
	| Promise<ValidatorFunctionRet | ValidatorFunctionRet[]>
	| ValidatorFunctionRet
	| ValidatorFunctionRet[]

export type BatchValidator<
	DataT,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
> = {
	targetParams: (keyof DataT)[]
	validatorFunction: BatchValidatorFunction<DataT, ParamT, BodyT, QueryT>
}

export type ValidatorArgs<
	DataT extends {} = {},
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
> = {
	[dataKey in keyof DataT]: ValidatorFunction<
		DataT[dataKey],
		ParamT,
		BodyT,
		QueryT
	>
}

type ValidateParamsArgs<
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
> = {
	urlParams?: ValidatorArgs<ParamT, ParamT, BodyT, QueryT>
	bodyParams?: ValidatorArgs<BodyT, ParamT, BodyT, QueryT>
	queryParams?: ValidatorArgs<QueryT, ParamT, BodyT, QueryT>
	batchValidators?: Partial<{
		urlParams: BatchValidator<ParamT, ParamT, BodyT, QueryT>[]
		bodyParams: BatchValidator<BodyT, ParamT, BodyT, QueryT>[]
		queryParams: BatchValidator<QueryT, ParamT, BodyT, QueryT>[]
	}>
}

export function requireMethods(methods: ReqMethod[]) {
	return middlewareHandler((req, res, next) => {
		if (!methods.includes(req.method as ReqMethod)) {
			res.status(StatusCodes.METHOD_NOT_ALLOWED).json({
				responseStatus: "ERR_METHOD_NOT_ALLOWED",
			})
			return
		}
		next()
	})
}

type ValidateAuthArgs = {
	allowNonAuthUsers: boolean
} & (
	| {
			allowAuthUsers: false
	  }
	| {
			allowAuthUsers: true
			requireVerified: boolean
			requireRoles?: UserRole[]
	  }
)

export function restrictEndpoint(args: ValidateAuthArgs) {
	return middlewareHandler(async (req, res, next) => {
		const { allowAuthUsers, allowNonAuthUsers } = args

		if (allowNonAuthUsers && !req.currentSession) {
			return next()
		}
		if (allowAuthUsers) {
			const { requireVerified, requireRoles = Object.values(UserRole) } =
				args
			if (!req.currentSession) {
				return res.status(StatusCodes.UNAUTHENTICATED).json({
					responseStatus: "ERR_UNAUTHENTICATED",
				})
			}
			if (
				requireVerified &&
				!req.currentSession.sessionUser.userVerified
			) {
				return res.status(StatusCodes.UNAUTHORIZED).json({
					responseStatus: "ERR_UNVERIFIED",
				})
			}

			if (
				!requireRoles.includes(req.currentSession!.sessionUser.userRole)
			) {
				return res.status(StatusCodes.UNAUTHORIZED).json({
					responseStatus: "ERR_UNAUTHORIZED",
				})
			}
		} else {
			if (req.currentSession) {
				return res.status(StatusCodes.UNAUTHORIZED).json({
					responseStatus: "ERR_RESTRICTED_ENDPOINT",
				})
			}
		}
		next()
	})
}

export function validateParams<
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(args: ValidateParamsArgs<ParamT, BodyT, QueryT>) {
	return middlewareHandler<ParamT, BodyT, QueryT>(async (req, res, next) => {
		const {
			urlParams = {},
			bodyParams = {},
			queryParams = {},
			batchValidators = {},
		} = args
		const { params, body, query } = req

		const validateObjectWithReq = async <DataT extends {} = {}>(
			dataObj: DataT,
			objValidator: ValidatorArgs<DataT, ParamT, BodyT, QueryT>,
			objType: ParamType,
		) => {
			const validatorKeys = Object.keys(objValidator) as (keyof DataT)[]
			const validationResults = await Promise.all(
				validatorKeys.map(async (key) => {
					const dataValue = dataObj[key]
					const validatorFn = objValidator[key]
					let validationResult = await validatorFn(dataValue, req)

					if (!Array.isArray(validationResult)) {
						validationResult = [{ ...validationResult }]
					}

					const mappedValidationResults = validationResult.map(
						(valRes) => {
							if (!valRes.validationPass) {
								return {
									paramType: objType,
									paramName: key,
									errorCode: valRes.errorCode,
									errorArgs: valRes.errorArgs,
								}
							} else {
								return undefined
							}
						},
					) as (InvalidParam<ParamT, BodyT, QueryT> | undefined)[]

					return mappedValidationResults
				}),
			)

			const flatValidationResults = validationResults.reduce(
				(prevVal, currVal) => {
					return [...prevVal, ...currVal]
				},
				[] as InvalidParam<ParamT, BodyT, QueryT>[],
			)

			const filteredValidationResults = flatValidationResults.filter(
				(valResult) => {
					return valResult !== undefined
				},
			) as unknown as InvalidParam<ParamT, BodyT, QueryT>[]

			return filteredValidationResults
		}

		const validateBatchParams = async <DataT extends {} = {}>(
			dataObj: DataT,
			batchValidator: BatchValidator<DataT, ParamT, BodyT, QueryT>,
			objType: ParamType,
		): Promise<InvalidParam<ParamT, BodyT, QueryT>[]> => {
			const { targetParams, validatorFunction } = batchValidator
			let validationResult = await validatorFunction(dataObj, req)
			if (!Array.isArray(validationResult)) {
				validationResult = [{ ...validationResult }]
			}

			const mappedValidationResults = validationResult.map((valRes) => {
				if (valRes.validationPass) {
					return [] satisfies InvalidParam<ParamT, BodyT, QueryT>[]
				} else {
					return targetParams.map(
						(targetParam): InvalidParam<ParamT, BodyT, QueryT> => {
							return {
								paramType: objType,
								// @ts-ignore
								paramName: targetParam,
								errorCode: valRes.errorCode,
								errorArgs: valRes.errorArgs,
							}
						},
					)
				}
			})

			const flatValidationResult = mappedValidationResults.reduce(
				(prevArr, currArr) => {
					return [...prevArr, ...currArr]
				},
			) satisfies InvalidParam<ParamT, BodyT, QueryT>[]

			return flatValidationResult
		}

		const applyMultipleBatchParams = async <DataT extends {} = {}>(
			dataObj: DataT,
			batchValidators: BatchValidator<DataT, ParamT, BodyT, QueryT>[],
			objType: ParamType,
		): Promise<InvalidParam<ParamT, BodyT, QueryT>[]> => {
			const mappedBatchValdationResults = await Promise.all(
				batchValidators.map(async (batchValidator) => {
					return validateBatchParams(dataObj, batchValidator, objType)
				}),
			)

			const flatValidationResult = mappedBatchValdationResults.reduce(
				(prevArr, currArr) => {
					return [...prevArr, ...currArr]
				},
				[] satisfies InvalidParam<ParamT, BodyT, QueryT>[],
			)

			return flatValidationResult
		}

		const validationPromises = [
			validateObjectWithReq(
				params,
				urlParams as ValidatorArgs<ParamT, ParamT, BodyT, QueryT>,
				"URL",
			),
			validateObjectWithReq(
				body,
				bodyParams as ValidatorArgs<BodyT, ParamT, BodyT, QueryT>,
				"BODY",
			),
			validateObjectWithReq(
				query,
				queryParams as ValidatorArgs<QueryT, ParamT, BodyT, QueryT>,
				"QUERY",
			),
			applyMultipleBatchParams(
				params,
				batchValidators.urlParams || [],
				"URL",
			),
			applyMultipleBatchParams(
				body,
				batchValidators.bodyParams || [],
				"BODY",
			),
			applyMultipleBatchParams(
				query,
				batchValidators.queryParams || [],
				"QUERY",
			),
		]

		const resolvedValidation = await Promise.all(validationPromises)

		const mergedValidation = resolvedValidation.reduce(
			(prevVal, currVal) => {
				return [...prevVal, ...currVal]
			},
		)

		if (mergedValidation.length) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				responseStatus: "ERR_INVALID_PARAMS",
				invalidParams: mergedValidation,
			})
		}

		next()
	})
}

export type CheckSessionAccessFn<
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
> = (
	app: ReqUserSession,
	req: IRequest<ParamT, BodyT, QueryT>,
) => boolean | Promise<boolean>

type CheckAccessArgs<
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
> = {
	checkSessionAccess?: CheckSessionAccessFn<ParamT, BodyT, QueryT>
}

export function checkAccess<
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(args: CheckAccessArgs<ParamT, BodyT, QueryT>) {
	return middlewareHandler<ParamT, BodyT, QueryT>(async (req, res, next) => {
		const { checkSessionAccess } = args

		if (req.currentSession && checkSessionAccess) {
			const sessionAccess = await checkSessionAccess(
				req.currentSession,
				req,
			)
			if (!sessionAccess) {
				return res.status(StatusCodes.UNAUTHORIZED).json({
					responseStatus: "ERR_UNAUTHORIZED",
				})
			}
		}

		next()
	})
}

export const xsrfProtection = middlewareHandler((req, res, next) => {
	if (!USE_XSRF_PROTECTION) {
		return next()
	}

	if (req.xsrfValid) {
		return next()
	}

	return res.status(StatusCodes.TEAPOT).json({
		responseStatus: "ERR_TEAPOT",
	})
})

export const devRequestLogger = middlewareHandler((req, res, next) => {
	const startTimestamp = Date.now()
	res.setHeader("Cache-Control", "no-store")

	log(
		"http",
		LogLevel.Debug,
		`${req.protocol.toUpperCase()} ${req.method} ${req.originalUrl}`,
	)
	log(
		"http",
		LogLevel.Debug,
		"Request Headers",
		JSON.stringify(req.headers, null, 4),
	)
	log(
		"http",
		LogLevel.Debug,
		"Request Params",
		JSON.stringify(req.params, null, 4),
	)
	log(
		"http",
		LogLevel.Debug,
		"Request Body",
		JSON.stringify(req.body, null, 4),
	)
	log(
		"http",
		LogLevel.Debug,
		"Request Query",
		JSON.stringify(req.query, null, 4),
	)

	const oldJson = res.json

	const newJson: typeof res.json = (data) => {
		log(
			"http",
			LogLevel.Debug,
			"Response Headers",
			JSON.stringify(res.getHeaders(), null, 4),
		)
		log(
			"http",
			LogLevel.Debug,
			"Response Body",
			JSON.stringify(data, null, 4),
		)
		oldJson.call(res, data)
		const endTimestamp = Date.now()
		log(
			"http",
			LogLevel.Debug,
			`Request RT: ${endTimestamp - startTimestamp}ms`,
		)
		return res
	}

	res.json = newJson

	next()
})

const baseCorsHandler = cors(CORS_CONFIG)

export const corsHelper = middlewareHandler((req, res, next) => {
	const isDevelopment = featureFlag()
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
			if (!ALLOW_NON_DB_SESSION_ID) {
				throw new Error(
					`Session ${jwtData.sessionId} not found in the database!`,
				)
			}
		}

		if (dbSession && dbSession.sessionEndTimestamp <= new Date()) {
			if (!ALLOW_EXPIRED_SESSIONS) {
				throw new Error(
					`Expired / Closed session ${dbSession.sessionId} was used`,
				)
			}
			if (STRICT_CHECK_SESSION_IP_UA) {
				const reqIp = req.ip || ""
				const reqUa = req.headers["user-agent"] || ""
				if (
					dbSession.sessionIp !== reqIp ||
					dbSession.sessionUA !== reqUa
				) {
					throw new Error(
						`Session ${dbSession.sessionId} IP/UA mismatch!`,
					)
				}
			}
		}
		req.currentSession = dbSession ?? undefined
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
	log("xsrf", LogLevel.Debug, `XSRF Token: ${xsrfToken || "Not Sent"}`)
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
			tokenSessionId: req.currentSession?.sessionId,
		},
	})

	if (tokenDoc.count === 0) {
		return next()
	}

	req.xsrfValid = true
	return next()
})
