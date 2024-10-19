import { AWS_CLOUDFRONT_BASE_URL } from "../config/s3"

import { ContentType } from "@/util/config/media"
import db from "@/util/db"
import { type ErrorCode, ErrorCodes } from "@/util/defs/errors"
import { ValidatorFunction, ValidatorFunctionRet } from "@/util/http/middleware"

export type VarType = "string" | "number" | "boolean" | "object" | "date"

type MapFunctionToValidatorArgs<
	DataT,
	RetT extends string,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
> = {
	innerFn: (value: DataT) => RetT | Promise<RetT>
	mapResult: (result: RetT) => ErrorCode | ErrorCode[] | undefined
}

export function mapToValidator<
	DataT,
	RetT extends string,
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
>(
	args: MapFunctionToValidatorArgs<DataT, RetT, ParamT, BodyT, QueryT>,
): ValidatorFunction<DataT, ParamT, BodyT, QueryT> {
	return async function (value, req) {
		const fnResult = await args.innerFn(value)
		const valResult = args.mapResult(fnResult)
		if (valResult === undefined) {
			return {
				validationPass: true,
			}
		}
		if (!Array.isArray(valResult)) {
			return [
				{
					validationPass: false,
					errorCode: valResult,
				},
			]
		}
		if (valResult.length === 0) {
			return {
				validationPass: true,
			}
		}
		return valResult.map((valRes) => {
			return {
				validationPass: false,
				errorCode: valRes,
			}
		})
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
			return {
				validationPass: false,
				errorCode: ErrorCodes.NullOrUndefined,
			}
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
				return {
					validationPass: false,
					errorCode: ErrorCodes.InvalidDataType,
					errorArgs: { expectedType: type },
				}
			}
			return innerFn(value, req)
		}
		if (type === "number") {
			const parsedValue = Number.parseFloat(value)
			if (Number.isNaN(parsedValue) || !Number.isFinite(parsedValue)) {
				return {
					validationPass: false,
					errorCode: ErrorCodes.InvalidDataType,
					errorArgs: { expectedType: type },
				}
			}
			return innerFn(value, req)
		}
		if (typeof value !== type) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.InvalidDataType,
				errorArgs: { expectedType: type },
			}
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
			return {
				validationPass: false,
				errorCode: ErrorCodes.InvalidDataType,
				errorArgs: { expectedType: `array` },
			}
		}
		for (const elem of value) {
			if (typeof elem !== type) {
				return {
					validationPass: false,
					errorCode: ErrorCodes.InvalidDataType,
					errorArgs: { expectedType: `array` },
				}
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
			return {
				validationPass: false,
				errorCode: ErrorCodes.InvalidDataType,
				errorArgs: { expectedType: `array` },
			}
		}
		const valErrorAcc = await Promise.all(
			value.map((elem) => {
				return innerFn(elem, req)
			}),
		)
		const flatErrorAcc = valErrorAcc.flat().filter((valRes) => {
			return valRes.validationPass === false
		})
		if (flatErrorAcc.length) {
			return [
				{
					validationPass: false,
					errorCode: "E3005",
				},
				...flatErrorAcc,
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

		return flatResultAcc
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
		return {
			validationPass: false,
			errorCode: errorCode,
			errorArgs: errorArgs,
		}
	}
}

// String length must exactly be equal E1002
export function STRLEN_EQ(strLen: number): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", (value) => {
		if (value.length !== strLen) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.ExactStringLength,
				errorArgs: { expectedLength: strLen },
			}
		}
		return { validationPass: true }
	})
}

// String length should be non-zero E1001
export function STR_NOT_EMPTY(): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", (value) => {
		if (value.length === 0) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.EmptyString,
			}
		}
		return { validationPass: true }
	})
}

// String length should be minimum
export function STRLEN_MIN(minLen: number): ValidatorFunction<string> {
	return EXPECT_TYPE<string>("string", (value) => {
		if (value.length < minLen) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.MinStringLength,
				errorArgs: { minLength: minLen },
			}
		}
		return { validationPass: true }
	})
}

// At most maxLen characters in string
export function STRLEN_MAX(maxLen: number): ValidatorFunction<string> {
	return (value) => {
		if (value.length > maxLen) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.MaxStringLength,
				errorArgs: { maxLength: maxLen },
			}
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
		if (value.length < minLen || value.length > maxLen) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.MinMaxStringLength,
				errorArgs: { minLength: minLen, maxLength: maxLen },
			}
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
			return {
				validationPass: false,
				errorCode: ErrorCodes.InvalidUrl,
			}
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

		return {
			validationPass: false,
			errorCode: ErrorCodes.InvalidRegex,
			errorArgs: {
				regExp: regex.toString(),
			},
		}
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
			if (urlObj.origin !== AWS_CLOUDFRONT_BASE_URL) {
				return {
					validationPass: false,
					errorCode: ErrorCodes.InvalidUrl,
				}
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
					return {
						validationPass: false,
						errorCode: ErrorCodes.InvalidUrl,
					}
				}
				if (
					!(args.contentTypes as string[]).includes(
						dbObj.objectContentType,
					)
				) {
					return {
						validationPass: false,
						errorCode: ErrorCodes.InvalidUrl,
					}
				}
				return { validationPass: true }
			}
			return { validationPass: true }
		} catch (e) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.InvalidUrl,
			}
		}
	})
}

// Number should be non-zero
export function NON_ZERO(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value === 0) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.NonZero,
			}
		}
		return { validationPass: true }
	})
}

// Number cannot be <= 0
export function POSITIVE(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value <= 0) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.Positive,
			}
		}
		return { validationPass: true }
	})
}

// Number cannot be >= 0
export function NEGATIVE(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value >= 0) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.Negative,
			}
		}
		return { validationPass: true }
	})
}

// Number cannot be < 0 (Can be 0 or positive)
export function NON_NEGATIVE(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value < 0) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.PositiveOrZero,
			}
		}
		return { validationPass: true }
	})
}

// Number cannot be > 0 (Can be 0 or negative)
export function NON_POSITIVE(): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value > 0) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.NegativeOrZero,
			}
		}
		return { validationPass: true }
	})
}

// Number cannot be lesser than minimum (can be greater or equal)
export function MIN_VALUE(minVal: number): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value < minVal) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.Min,
				errorArgs: { minValue: minVal },
			}
		}
		return { validationPass: true }
	})
}

// Number cannot be greater than max (can be lesser or equal)
export function MAX_VALUE(maxVal: number): ValidatorFunction<number> {
	return EXPECT_TYPE<number>("number", (value) => {
		if (value > maxVal) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.Max,
				errorArgs: { maxValue: maxVal },
			}
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
			return {
				validationPass: false,
				errorCode: ErrorCodes.MinMax,
				errorArgs: { minValue: minVal, maxValue: maxVal },
			}
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
			return {
				validationPass: false,
				errorCode: ErrorCodes.EmptyArr,
			}
		}
	}
}

// Array size should be minLen (inclusive)
export function ARR_LEN_MIN<T>(minLen: number): ValidatorFunction<T[]> {
	return function (val: T[]) {
		if (Array.isArray(val) && val.length >= minLen) {
			return { validationPass: true }
		} else {
			return {
				validationPass: false,
				errorCode: ErrorCodes.MinArrLength,
				errorArgs: {
					minLength: minLen,
				},
			}
		}
	}
}

// Array size should be max maxLen (inclusive)
export function ARR_LEN_MAX<T>(maxLen: number): ValidatorFunction<T[]> {
	return function (val: T[]) {
		if (Array.isArray(val) && val.length <= maxLen) {
			return { validationPass: true }
		} else {
			return {
				validationPass: false,
				errorCode: ErrorCodes.MaxArrLength,
				errorArgs: {
					maxLength: maxLen,
				},
			}
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
			return {
				validationPass: false,
				errorCode: ErrorCodes.MinMaxArrLength,
				errorArgs: {
					minLength: minLen,
					maxLength: maxLen,
				},
			}
		}
	}
}

export function IN_ARRAY<T>(allowedValues: T[]): ValidatorFunction<T> {
	return function (val: T) {
		if (allowedValues.includes(val)) {
			return { validationPass: true }
		} else {
			return {
				validationPass: false,
				errorCode: ErrorCodes.NotInAllowedSet,
				errorArgs: {
					allowedValues,
				},
			}
		}
	}
}

export function NOT_IN_ARRAY<T>(disallowedValues: T[]): ValidatorFunction<T> {
	return function (val: T) {
		if (!disallowedValues.includes(val)) {
			return { validationPass: true }
		} else {
			return {
				validationPass: false,
				errorCode: ErrorCodes.InDisallowedSet,
				errorArgs: {
					disallowedValues,
				},
			}
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
			return {
				validationPass: false,
				errorCode: ErrorCodes.NotInAllowedSet,
				errorArgs: {
					allowedValues: Object.values(selectedEnum),
				},
			}
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
			return {
				validationPass: false,
				errorCode: ErrorCodes.NotInAllowedSet,
				errorArgs: {
					allowedValues: Object.values(selectedEnum),
				},
			}
		}
	}
}

export const DATE = EXPECT_TYPE<Date>("date", (value) => {
	const dateVal = new Date(value)
	if (dateVal.toString() === "Invalid Date") {
		return {
			validationPass: false,
			errorCode: ErrorCodes.InvalidDate,
		}
	}
	return {
		validationPass: true,
	}
})

export const DATE_FUTURE = EXPECT_TYPE<Date>("date", (value) => {
	if (new Date(value).getTime() < Date.now()) {
		return {
			validationPass: false,
			errorCode: ErrorCodes.InvalidDate,
		}
	}
	return { validationPass: true }
})

export const DATE_PAST = EXPECT_TYPE<Date>("date", (value) => {
	const dateVal = new Date(value)
	if (dateVal.toString() === "Invalid Date") {
		return {
			validationPass: false,
			errorCode: ErrorCodes.InvalidDate,
		}
	}
	if (dateVal.getTime() > Date.now()) {
		return {
			validationPass: false,
			errorCode: ErrorCodes.InvalidDate,
		}
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
