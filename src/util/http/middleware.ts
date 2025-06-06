import cors from "cors"
import rateLimit from "express-rate-limit"

import {
	ErrorArgMapping,
	validateErrorArgs,
} from "@/util/app/helpers/error-codes"
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
import { ErrorCode, ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type { IRequest } from "@/util/http"
import { parseJwtFromRequest } from "@/util/http/helpers"
import { middlewareHandler } from "@/util/http/wrappers"
import { LogLevel, log } from "@/util/log"

type InvalidParamWrapperArg<ErrCodeT extends ErrorCode> = {
	errorCode: ErrCodeT
	errorArgs: (typeof ErrorArgMapping)[ErrCodeT]
}

function getInverseErrorCodeName(errorCode: ErrorCode): string {
	const errCodeEntries = Object.entries(ErrorCodes)
	const targetPair = errCodeEntries.find(([errName, errCodeValue]) => {
		return errCodeValue === errorCode
	}) || [getInverseErrorCodeName(ErrorCodes.Unknown), ErrorCodes.Unknown]

	return targetPair[0]
}

export function invalidParam<ErrCodeT extends ErrorCode>(
	args: InvalidParamWrapperArg<ErrCodeT>,
): ValidatorFunctionRet {
	const { errorArgs, errorCode } = args
	const codeName = getInverseErrorCodeName(errorCode)

	if (errorArgs === undefined) {
		log(
			"middleware.validate",
			LogLevel.Error,
			`No Error Arguments were supplied to errorCode ${errorCode}(${codeName}). Did you wrap it with invalidParam()`,
		)

		// It will eventually fail in the next step
		// @ts-expect-error This will fail since a lot of error code mappings have args, but this generic replacement doesn't
		return invalidParam({
			errorCode: errorCode,
			errorArgs: {},
		})
	}

	const valResult = validateErrorArgs(errorCode, errorArgs)

	const { missingKeys, objectValid, typeErrors } = valResult

	if (objectValid) {
		return {
			validationPass: false,
			errorCode: errorCode,
			errorArgs: errorArgs,
		}
	}

	const missingKeyErrors = (missingKeys as string[]).map((missingKey) => {
		return `Missing error arg key: ${missingKey} for error type: ${errorCode} (${codeName})`
	})

	const typeErrorsStr = typeErrors.map((typeError) => {
		return `Invalid Error Arg for error type ${errorCode} (${codeName}): ${typeError.errorArgKey} expected type: ${typeError.expectedType}, received type: ${typeError.receivedType}`
	})

	const errorMessages = [...missingKeyErrors, ...typeErrorsStr]
	log("middleware.validate", LogLevel.Error, errorMessages.join("\n"))

	return {
		validationPass: false,
		errorCode: ErrorCodes.Unknown,
		errorArgs: {},
	}
}

export type ValidatorFunctionRet =
	| {
			validationPass: true
	  }
	| {
			validationPass: false
			errorCode: ErrorCode
			errorArgs: any
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
	  }
)

export function restrictEndpoint(args: ValidateAuthArgs) {
	return middlewareHandler(async (req, res, next) => {
		const { allowAuthUsers, allowNonAuthUsers } = args

		if (allowNonAuthUsers && !req.currentSession) {
			return next()
		}
		if (allowAuthUsers) {
			const { requireVerified } = args
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

function safeWrapValidatorFn<
	T,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	valFn: ValidatorFunction<T, ParamT, BodyT, QueryT>,
): ValidatorFunction<T, ParamT, BodyT, QueryT> {
	// @ts-expect-error
	return async function (valueToValidate, req) {
		try {
			const valResult = await valFn(valueToValidate, req)
			if (Array.isArray(valResult)) {
				const mappedResults = valResult.map((valRes) => {
					if (valRes.validationPass) {
						return {
							validationPass: true,
						}
					}

					return invalidParam({
						errorCode: valRes.errorCode,
						errorArgs: valRes.errorArgs,
					})
				})

				return mappedResults
			}

			if (valResult.validationPass) {
				return {
					validationPass: true,
				}
			}

			return invalidParam({
				errorCode: valResult.errorCode,
				errorArgs: valResult.errorArgs,
			})
		} catch (e) {
			return invalidParam({
				errorCode: ErrorCodes.Unknown,
				errorArgs: {},
			})
		}
	}
}

function errorWrapBatchValidator<
	DataT,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	batchFn: BatchValidatorFunction<DataT, ParamT, BodyT, QueryT>,
): BatchValidatorFunction<DataT, ParamT, BodyT, QueryT> {
	// @ts-expect-error
	return async function (batchData, req) {
		try {
			const valResult = await batchFn(batchData, req)

			if (Array.isArray(valResult)) {
				const mappedResults = valResult.map((valRes) => {
					if (valRes.validationPass) {
						return {
							validationPass: true,
						}
					}

					return invalidParam({
						errorCode: valRes.errorCode,
						errorArgs: valRes.errorArgs,
					})
				})

				return mappedResults
			}

			if (valResult.validationPass) {
				return {
					validationPass: true,
				}
			}

			return invalidParam({
				errorCode: valResult.errorCode,
				errorArgs: valResult.errorArgs,
			})
		} catch (e) {
			return invalidParam({
				errorCode: ErrorCodes.Unknown,
				errorArgs: {},
			})
		}
	}
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
				validatorKeys.map(async (validatorKey) => {
					const dataValue = dataObj[validatorKey]
					const validatorFn = objValidator[validatorKey]
					const wrappedFn = safeWrapValidatorFn(validatorFn)
					let validationResult = await wrappedFn(dataValue, req)

					if (!Array.isArray(validationResult)) {
						validationResult = [{ ...validationResult }]
					}

					const mappedValidationResults = validationResult.map(
						(valRes) => {
							if (!valRes.validationPass) {
								return {
									paramType: objType,
									paramName: validatorKey,
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

			const flatValidationResults = validationResults.flat()

			const filteredValidationResults = flatValidationResults.filter(
				(valResult) => {
					return valResult !== undefined
				},
			)

			return filteredValidationResults
		}

		const validateBatchParams = async <DataT extends {} = {}>(
			dataObj: DataT,
			batchValidator: BatchValidator<DataT, ParamT, BodyT, QueryT>,
			objType: ParamType,
		): Promise<InvalidParam<ParamT, BodyT, QueryT>[]> => {
			const { targetParams, validatorFunction } = batchValidator
			const wrappedBatchValidator =
				errorWrapBatchValidator(validatorFunction)
			let validationResult = await wrappedBatchValidator(dataObj, req)
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

			const flatValidationResult = mappedValidationResults.flat()

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

			const flatValidationResult = mappedBatchValdationResults.flat()

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

		const mergedValidation = resolvedValidation.flat()

		if (mergedValidation.length) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				responseStatus: "ERR_INVALID_PARAMS",
				invalidParams: mergedValidation,
			})
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

export const noCache = middlewareHandler((req, res, next) => {
	res.setHeader("Cache-Control", "no-store")
	next()
})

type CacheEndpointArgs = {
	cacheSeconds: number
	cachePrivate?: boolean
}

export function cacheEndpoint(
	args: CacheEndpointArgs = {
		cacheSeconds: 86400,
		cachePrivate: false,
	},
) {
	const { cacheSeconds, cachePrivate = false } = args
	return middlewareHandler((req, res, next) => {
		res.setHeader("Cache-Control", `max-age=${cacheSeconds}`)
		if (cachePrivate) {
			res.setHeader("Cache-Control", "private")
		}
		next()
	})
}

export const devRequestLogger = middlewareHandler((req, res, next) => {
	const startTimestamp = Date.now()

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

	const oldStatus = res.status

	const oldJson = res.json

	const newStatus: typeof res.status = (statusCode) => {
		log("http", LogLevel.Debug, "Response Status", statusCode)
		oldStatus.call(res, statusCode)
		return res
	}

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
			"Response JSON",
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
	res.status = newStatus
	res.json = newJson

	next()
})

const baseCorsHandler = cors(CORS_CONFIG)

export const corsHelper = middlewareHandler((req, res, next) => {
	// const isDevelopment = featureFlag()
	// const originHeader = req.headers["origin"]
	// if (!isDevelopment && !originHeader) {
	// 	return res.status(StatusCodes.TEAPOT).json({
	// 		responseStatus: "ERR_TEAPOT",
	// 	})
	// }
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
				sessionId: jwtData.sub,
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
					`Session ${jwtData.sub} not found in the database!`,
				)
			} else {
				log(
					"auth",
					LogLevel.Warn,
					`Session ${jwtData.sub} not found in the database!`,
				)
			}
		}

		if (dbSession && dbSession.sessionEndTimestamp <= new Date()) {
			if (!ALLOW_EXPIRED_SESSIONS) {
				throw new Error(
					`Expired / Closed session ${dbSession.sessionId} was used`,
				)
			} else {
				log(
					"auth",
					LogLevel.Warn,
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
				} else {
					log(
						"auth",
						LogLevel.Warn,
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
