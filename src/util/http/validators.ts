import validator from "validator"

import { ContentType } from "@/util/config/media"
import { S3_ORIGIN, S3_ORIGIN_PROTOCOL } from "@/util/config/s3"
import db from "@/util/db"
import type { MakeOptional } from "@/util/defs/engraph-backend/common"
import { type ErrorCode, ErrorCodes } from "@/util/defs/engraph-backend/errors"
import {
	type BatchValidator,
	ValidatorFunction,
	ValidatorFunctionRet,
	invalidParam,
} from "@/util/http/middleware"

export type VarType = "string" | "number" | "boolean" | "object" | "date"

export function NULLISH_BATCH<
	DataT,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	batchValidator: BatchValidator<DataT, ParamT, BodyT, QueryT>,
): BatchValidator<MakeOptional<DataT>, ParamT, BodyT, QueryT> {
	const { targetParams, validatorFunction } = batchValidator
	return {
		targetParams: targetParams,
		validatorFunction: async (batchParams, req) => {
			const nullishParams = targetParams.filter((paramName) => {
				return (
					batchParams[paramName] === null ||
					batchParams[paramName] === undefined
				)
			})
			if (nullishParams.length) {
				return {
					validationPass: true,
				}
			}
			return validatorFunction(batchParams as DataT, req)
		},
	}
}

// Only allow non nullish values
export function NOT_NULLISH<
	T,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	innerFn: ValidatorFunction<T, ParamT, BodyT, QueryT>,
): ValidatorFunction<T | null | undefined, ParamT, BodyT, QueryT> {
	return async (value, req) => {
		if (value === null || value === undefined) {
			return invalidParam({
				errorCode: ErrorCodes.NullOrUndefined,
				errorArgs: {},
			})
		}
		return innerFn(value, req)
	}
}

// Directly allow nullish values, or validate if non-nullish provided
export function NULLISH<
	T,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	innerFn: ValidatorFunction<T, ParamT, BodyT, QueryT>,
): ValidatorFunction<T | null | undefined, ParamT, BodyT, QueryT> {
	return async (value, req) => {
		if (value === null || value === undefined) {
			return {
				validationPass: true,
			}
		}
		return innerFn(value, req)
	}
}

// Expect a specific type, wrap every validator with this
export function EXPECT_TYPE<
	T,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	type: VarType,
	innerFn: ValidatorFunction<T, ParamT, BodyT, QueryT>,
): ValidatorFunction<any, ParamT, BodyT, QueryT> {
	return async (value, req) => {
		if (type === "date") {
			const dateObj = new Date(value)
			if (dateObj.toString() === "Invalid Date") {
				return invalidParam({
					errorCode: ErrorCodes.InvalidDataType,
					errorArgs: { expectedType: type },
				})
			}
			return innerFn(value, req)
		}
		if (type === "number") {
			const parsedValue = Number.parseFloat(value)
			if (Number.isNaN(parsedValue) || !Number.isFinite(parsedValue)) {
				return invalidParam({
					errorCode: ErrorCodes.InvalidDataType,
					errorArgs: { expectedType: type },
				})
			}
			return innerFn(value, req)
		}
		if (typeof value !== type) {
			return invalidParam({
				errorCode: ErrorCodes.InvalidDataType,
				errorArgs: { expectedType: type },
			})
		}
		return innerFn(value, req)
	}
}

// Expect an array of type T
export function EXPECT_ARR_TYPE<
	T,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	type: VarType,
	innerFn: ValidatorFunction<T[], ParamT, BodyT, QueryT>,
): ValidatorFunction<any, ParamT, BodyT, QueryT> {
	return async (value, req) => {
		if (!Array.isArray(value)) {
			return invalidParam({
				errorCode: ErrorCodes.InvalidDataType,
				errorArgs: { expectedType: `array` },
			})
		}
		for (const elem of value) {
			if (typeof elem !== type) {
				return invalidParam({
					errorCode: ErrorCodes.InvalidDataType,
					errorArgs: { expectedType: `array` },
				})
			}
		}
		return innerFn(value, req)
	}
}

// Run given validator for each obj in the array
export function FOR_EACH<
	T,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	innerFn: ValidatorFunction<T, ParamT, BodyT, QueryT>,
): ValidatorFunction<T[], ParamT, BodyT, QueryT> {
	return async (value, req) => {
		if (!Array.isArray(value)) {
			return invalidParam({
				errorCode: ErrorCodes.InvalidDataType,
				errorArgs: { expectedType: `array` },
			})
		}
		const valErrorAcc = await Promise.all(
			value.map(async (elem, elemIdx) => {
				let innerValue = await innerFn(elem, req)
				if (!Array.isArray(innerValue)) {
					innerValue = [innerValue]
				}
				return [elemIdx, innerValue] as [number, typeof innerValue]
			}),
		)
		const flatErrorAcc = valErrorAcc.filter(([valIndex, valRes]) => {
			const everyValPass = valRes.every((valRe) => {
				return valRe.validationPass === true
			})
			return !everyValPass
		})
		if (flatErrorAcc.length) {
			const collectedErrors = flatErrorAcc.map(([elemIdx, accErrors]) => {
				return accErrors
			})
			const flatCollectedErrors = collectedErrors.flat()
			return [
				invalidParam({
					errorCode: ErrorCodes.ArrElemInvalid,
					errorArgs: {
						invalidIndexes: flatErrorAcc.map(
							([valIndex]) => valIndex,
						),
					},
				}),
				...flatCollectedErrors,
			]
		} else {
			return {
				validationPass: true,
			}
		}
	}
}

export function ANY_OF<
	T,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	valFns: ValidatorFunction<T, ParamT, BodyT, QueryT>[],
): ValidatorFunction<T, ParamT, BodyT, QueryT> {
	// @ts-expect-error
	return async (val, req) => {
		const resultAcc: ValidatorFunctionRet[][] = await Promise.all(
			valFns.map(async (validatorFn) => {
				const valResult = await validatorFn(val, req)
				if (Array.isArray(valResult)) {
					return valResult
				} else {
					return [valResult]
				}
			}),
		)

		const flatResultAcc = resultAcc.flat()

		const anyPassed = flatResultAcc.some(
			(valResult) => valResult.validationPass,
		)

		if (anyPassed) {
			return {
				validationPass: true,
			}
		}

		const mappedResultAcc = flatResultAcc.map((valResult) => {
			if (valResult.validationPass) {
				return {
					validationPass: true,
				}
			}
			return invalidParam({
				errorCode: valResult.errorCode,
				errorArgs: valResult.errorArgs,
			})
		})

		return mappedResultAcc
	}
}

// Run multiple validators on the same data
export function ALL_OF<
	T,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	valFns: ValidatorFunction<T, ParamT, BodyT, QueryT>[],
): ValidatorFunction<T, ParamT, BodyT, QueryT> {
	return async (val, req) => {
		const resultAcc: ValidatorFunctionRet[][] = await Promise.all(
			valFns.map(async (validatorFn) => {
				const valResult = await validatorFn(val, req)
				if (Array.isArray(valResult)) {
					return valResult
				} else {
					return [valResult]
				}
			}),
		)

		const flatResultAcc = resultAcc.reduce(
			(prev, curr) => [...prev, ...curr],
			[] as ValidatorFunctionRet[],
		)

		const allPassed = flatResultAcc.every(
			(valResult) => valResult.validationPass,
		)

		if (allPassed) {
			return {
				validationPass: true,
			}
		}

		return flatResultAcc
	}
}

// Don't validate, simply pass through
export function NOVALIDATE<T>(): ValidatorFunction<T> {
	return function () {
		return {
			validationPass: true,
		}
	}
}

export function FORCE_FAIL<T>(
	errorCode: ErrorCode = ErrorCodes.Unknown,
	errorArgs: any = undefined,
): ValidatorFunction<T> {
	return function () {
		return invalidParam({
			errorCode: errorCode,
			errorArgs: errorArgs,
		})
	}
}

export function STRING(): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", NOVALIDATE())
}

// String length must exactly be equal E1002
export function STRLEN_EQ(strLen: number): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", (value) => {
		if (value.trim().length !== strLen) {
			return invalidParam({
				errorCode: ErrorCodes.ExactStringLength,
				errorArgs: { expectedLength: strLen },
			})
		}
		return { validationPass: true }
	})
}

// String length should be non-zero E1001
export function STR_NOT_EMPTY(): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", (value) => {
		if (value.trim().length === 0) {
			return invalidParam({
				errorCode: ErrorCodes.EmptyString,
				errorArgs: {},
			})
		}
		return { validationPass: true }
	})
}

// String length should be minimum
export function STRLEN_MIN(minLen: number): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", (value) => {
		if (value.trim().length < minLen) {
			return invalidParam({
				errorCode: ErrorCodes.MinStringLength,
				errorArgs: { minLength: minLen },
			})
		}
		return { validationPass: true }
	})
}

// At most maxLen characters in string
export function STRLEN_MAX(maxLen: number): ValidatorFunction<string> {
	return (value) => {
		if (value.trim().length > maxLen) {
			return invalidParam({
				errorCode: ErrorCodes.MaxStringLength,
				errorArgs: { maxLength: maxLen },
			})
		}
		return { validationPass: true }
	}
}

// Strlen between (inclusive) min and (inclusive) max
export function STRLEN_MIN_MAX(
	minLen: number,
	maxLen: number,
): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", (value) => {
		if (value.trim().length < minLen || value.trim().length > maxLen) {
			return invalidParam({
				errorCode: ErrorCodes.MinMaxStringLength,
				errorArgs: { minLength: minLen, maxLength: maxLen },
			})
		}
		return { validationPass: true }
	})
}

export function IS_URL(): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", (value) => {
		try {
			new URL(value)
			return { validationPass: true }
		} catch (e) {
			return invalidParam({
				errorCode: ErrorCodes.InvalidUrl,
				errorArgs: {
					urlOrigin: "",
					urlProtocol: "",
				},
			})
		}
	})
}

type MatchUrlOpts = {
	origin?: string
	protocol?: string
}

export function MATCH_URL(urlOpts: MatchUrlOpts): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", (urlLike, req) => {
		try {
			const urlObj = new URL(urlLike)
			const {
				origin: urlOrigin = urlObj.origin,
				protocol: urlProto = urlObj.protocol,
			} = urlOpts
			if (urlOrigin !== urlObj.origin || urlProto !== urlObj.protocol) {
				return invalidParam({
					errorCode: ErrorCodes.InvalidUrl,
					errorArgs: {
						urlOrigin: urlOrigin,
						urlProtocol: urlProto,
					},
				})
			}
			return {
				validationPass: true,
			}
		} catch (e) {
			return invalidParam({
				errorCode: ErrorCodes.Unknown,
				errorArgs: {},
			})
		}
	})
}

export function MATCH_REGEX(regex: RegExp) {
	return EXPECT_TYPE<string>("string", (stringContent) => {
		const isMatch = regex.test(stringContent)
		if (isMatch) {
			return {
				validationPass: true,
			}
		}

		return invalidParam({
			errorCode: ErrorCodes.InvalidRegex,
			errorArgs: {
				regExp: regex.toString(),
			},
		})
	})
}

export function IS_EMAIL(): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", (userMail) => {
		const isEmail = validator.isEmail(userMail)
		if (isEmail) {
			return {
				validationPass: true,
			}
		}
		return invalidParam({
			errorCode: ErrorCodes.InvalidEmail,
			errorArgs: {},
		})
	})
}

type IsObjectUrlArgs = {
	contentTypes?: ContentType[]
}

export function IS_OBJECT_URL(
	args: IsObjectUrlArgs = {},
): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", async (value) => {
		try {
			const urlObj = new URL(value)
			if (urlObj.origin !== S3_ORIGIN) {
				return invalidParam({
					errorCode: ErrorCodes.InvalidUrl,
					errorArgs: {
						urlOrigin: S3_ORIGIN,
						urlProtocol: S3_ORIGIN_PROTOCOL,
					},
				})
			}
			if (args.contentTypes) {
				const urlPath = urlObj.pathname
				// urlPath includes the starting /
				const objectKey = urlPath.slice(1)
				// Select the forward characters
				const dbObj = await db.s3Object.findFirst({
					where: {
						objectKey,
					},
				})

				if (dbObj === null) {
					return invalidParam({
						errorCode: ErrorCodes.InvalidUrl,
						errorArgs: {
							urlOrigin: S3_ORIGIN,
							urlProtocol: S3_ORIGIN_PROTOCOL,
						},
					})
				}
				if (
					!(args.contentTypes as string[]).includes(
						dbObj.objectContentType,
					)
				) {
					return invalidParam({
						errorCode: ErrorCodes.InvalidUrl,
						errorArgs: {
							urlOrigin: S3_ORIGIN,
							urlProtocol: S3_ORIGIN_PROTOCOL,
						},
					})
				}
				return { validationPass: true }
			}
			return { validationPass: true }
		} catch (e) {
			return invalidParam({
				errorCode: ErrorCodes.InvalidUrl,
				errorArgs: {
					urlOrigin: S3_ORIGIN,
					urlProtocol: S3_ORIGIN_PROTOCOL,
				},
			})
		}
	})
}

export function NUMBER(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", NOVALIDATE())
}

// Number should be non-zero
export function NON_ZERO(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value === 0) {
			return invalidParam({
				errorCode: ErrorCodes.NonZero,
				errorArgs: {},
			})
		}
		return { validationPass: true }
	})
}

// Number cannot be <= 0
export function POSITIVE(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value <= 0) {
			return invalidParam({
				errorCode: ErrorCodes.Positive,
				errorArgs: {},
			})
		}
		return { validationPass: true }
	})
}

// Number cannot be >= 0
export function NEGATIVE(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value >= 0) {
			return invalidParam({
				errorCode: ErrorCodes.Negative,
				errorArgs: {},
			})
		}
		return { validationPass: true }
	})
}

// Number cannot be < 0 (Can be 0 or positive)
export function NON_NEGATIVE(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value < 0) {
			return invalidParam({
				errorCode: ErrorCodes.PositiveOrZero,
				errorArgs: {},
			})
		}
		return { validationPass: true }
	})
}

// Number cannot be > 0 (Can be 0 or negative)
export function NON_POSITIVE(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value > 0) {
			return invalidParam({
				errorCode: ErrorCodes.NegativeOrZero,
				errorArgs: {},
			})
		}
		return { validationPass: true }
	})
}

// Number cannot be lesser than minimum (can be greater or equal)
export function MIN_VALUE(minVal: number): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value < minVal) {
			return invalidParam({
				errorCode: ErrorCodes.Min,
				errorArgs: { minValue: minVal },
			})
		}
		return { validationPass: true }
	})
}

// Number cannot be greater than max (can be lesser or equal)
export function MAX_VALUE(maxVal: number): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value > maxVal) {
			return invalidParam({
				errorCode: ErrorCodes.Max,
				errorArgs: { maxValue: maxVal },
			})
		}
		return { validationPass: true }
	})
}

// Number must be between min and max (inclusive)
export function MIN_MAX_VALUE(
	minVal: number,
	maxVal: number,
): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value < minVal || value > maxVal) {
			return invalidParam({
				errorCode: ErrorCodes.MinMax,
				errorArgs: { minValue: minVal, maxValue: maxVal },
			})
		}
		return { validationPass: true }
	})
}

// Array should be non-empty
export function NON_EMPTY_ARR<T>(): ValidatorFunction<T[]> {
	return function (val: T[]) {
		if (Array.isArray(val) && val.length > 0) {
			return { validationPass: true }
		} else {
			return invalidParam({
				errorCode: ErrorCodes.EmptyArr,
				errorArgs: {},
			})
		}
	}
}

// Array size should be minLen (inclusive)
export function ARR_LEN_MIN<T>(minLen: number): ValidatorFunction<T[]> {
	return function (val: T[]) {
		if (Array.isArray(val) && val.length >= minLen) {
			return { validationPass: true }
		} else {
			return invalidParam({
				errorCode: ErrorCodes.MinArrLength,
				errorArgs: {
					minLength: minLen,
				},
			})
		}
	}
}

// Array size should be max maxLen (inclusive)
export function ARR_LEN_MAX<T>(maxLen: number): ValidatorFunction<T[]> {
	return function (val: T[]) {
		if (Array.isArray(val) && val.length <= maxLen) {
			return { validationPass: true }
		} else {
			return invalidParam({
				errorCode: ErrorCodes.MaxArrLength,
				errorArgs: {
					maxLength: maxLen,
				},
			})
		}
	}
}

export function ARR_LEN_MIN_MAX<T>(
	minLen: number,
	maxLen: number,
): ValidatorFunction<T[]> {
	return function (val: T[]) {
		if (
			Array.isArray(val) &&
			val.length <= maxLen &&
			val.length >= minLen
		) {
			return { validationPass: true }
		} else {
			return invalidParam({
				errorCode: ErrorCodes.MinMaxArrLength,
				errorArgs: {
					minLength: minLen,
					maxLength: maxLen,
				},
			})
		}
	}
}

export function IN_ARRAY<T>(allowedValues: T[]): ValidatorFunction<T> {
	return function (val: T) {
		if (allowedValues.includes(val)) {
			return { validationPass: true }
		} else {
			return invalidParam({
				errorCode: ErrorCodes.NotInAllowedSet,
				errorArgs: {
					allowedValues: allowedValues,
				},
			})
		}
	}
}

export function NOT_IN_ARRAY<T>(disallowedValues: T[]): ValidatorFunction<T> {
	return function (val: T) {
		if (!disallowedValues.includes(val)) {
			return { validationPass: true }
		} else {
			return invalidParam({
				errorCode: ErrorCodes.InDisallowedSet,
				errorArgs: {
					disallowedValues: disallowedValues,
				},
			})
		}
	}
}

export function IN_ENUM<T extends {} = {}>(
	selectedEnum: T,
): ValidatorFunction<T[keyof T]> {
	return function (val: T[keyof T]) {
		if (Object.values(selectedEnum).includes(val)) {
			return { validationPass: true }
		} else {
			return invalidParam({
				errorCode: ErrorCodes.NotInAllowedSet,
				errorArgs: {
					allowedValues: Object.keys(selectedEnum),
				},
			})
		}
	}
}

export function NOT_IN_ENUM<T extends {} = {}>(
	selectedEnum: T,
): ValidatorFunction<T[keyof T]> {
	return function (val: T[keyof T]) {
		if (!Object.values(selectedEnum).includes(val)) {
			return { validationPass: true }
		} else {
			return invalidParam({
				errorCode: ErrorCodes.InDisallowedSet,
				errorArgs: {
					disallowedValues: Object.values(selectedEnum),
				},
			})
		}
	}
}

export const DATE = EXPECT_TYPE<Date>("date", (value) => {
	const dateVal = new Date(value)
	if (dateVal.toString() === "Invalid Date") {
		return invalidParam({
			errorCode: ErrorCodes.InvalidDate,
			errorArgs: {},
		})
	}
	return {
		validationPass: true,
	}
})

export const DATE_FUTURE = EXPECT_TYPE<Date>("date", (value) => {
	const dateVal = new Date(value)
	if (dateVal.toString() === "Invalid Date") {
		return invalidParam({
			errorCode: ErrorCodes.InvalidDate,
			errorArgs: {},
		})
	}
	if (dateVal.getTime() <= Date.now()) {
		return invalidParam({
			errorCode: ErrorCodes.InvalidDate,
			errorArgs: {},
		})
	}
	return { validationPass: true }
})

export const DATE_PAST = EXPECT_TYPE<Date>("date", (value) => {
	const dateVal = new Date(value)
	if (dateVal.toString() === "Invalid Date") {
		return invalidParam({
			errorCode: ErrorCodes.InvalidDate,
			errorArgs: {},
		})
	}
	if (dateVal.getTime() >= Date.now()) {
		return invalidParam({
			errorCode: ErrorCodes.InvalidDate,
			errorArgs: {},
		})
	}
	return { validationPass: true }
})

export function isValidationSuccess(
	validationResults: ValidatorFunctionRet | ValidatorFunctionRet[],
) {
	if (Array.isArray(validationResults)) {
		return validationResults.every((result) => result.validationPass)
	}
	return validationResults.validationPass
}
