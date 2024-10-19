import {
	InvalidParam,
	ParamType,
	ReqMethod,
	StatusCodes,
} from "@/util/defs/common"
import { ErrorCode } from "@/util/defs/errors"
import { IRequest, ReqUserSession } from "@/util/http"
import { middlewareHandler } from "@/util/http/helpers"

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
	allowAuthUsers: boolean
}

export function restrictEndpoint(args: ValidateAuthArgs) {
	return middlewareHandler(async (req, res, next) => {
		if (args.allowNonAuthUsers && !req.currentSession) {
			return next()
		}
		if (args.allowAuthUsers) {
			if (!req.currentSession) {
				return res.status(StatusCodes.UNAUTHENTICATED).json({
					responseStatus: "ERR_UNAUTHENTICATED",
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
