export const MetavalTypes = {
	Any: null as any,
	String: String(),
	Number: Number(),
	Boolean: Boolean(),
	Object: {} as object,
}

export type MetavalTypes = typeof MetavalTypes
export type MetavalValue =
	| MetavalTypes[keyof MetavalTypes]
	| MetavalTypes[keyof MetavalTypes][]
/**
 *
 * @param objectMapping A mapping of the object keys to their respective expected types
 * @param objectValueTypes A set of expected types
 * @returns A function that validates an object against the expected types
 *
 * Really funky way to validate an object against a set of expected types
 * Thanks a lot to copilot for helping me figure out how to basically make this thing work with typescript generics
 * This is implemented in the errorArgs system as well as eventMetadata system
 */
export function createConditionalObjectValidator<
	DataT,
	KeyT extends keyof DataT,
	Mapping extends Record<KeyT, Types>,
	Types extends Record<string, MetavalValue>,
>(objectMapping: Mapping, objectValueTypes: Types) {
	type ObjectKey = keyof Mapping
	type ObjectMapping = typeof objectMapping

	type ObjectTypeMismatchError = {
		errorArgKey: keyof ObjectMapping[ObjectKey]
		expectedType: string
		receivedType: string
	}

	type ValidateObjectResult =
		| {
				objectValid: true
				missingKeys: never[]
				typeErrors: never[]
		  }
		| {
				objectValid: false
				missingKeys: (keyof ObjectMapping[ObjectKey])[] | never[]
				typeErrors: ObjectTypeMismatchError[] | never[]
		  }

	return function (
		objectKey: ObjectKey,
		objectValue: ObjectMapping[ObjectKey],
	): ValidateObjectResult {
		const targetType = objectMapping[objectKey]
		const expectedKeys = Object.keys(
			targetType,
		) as (keyof ObjectMapping[ObjectKey])[]

		if (expectedKeys.length === 0) {
			return {
				objectValid: true,
				missingKeys: [],
				typeErrors: [],
			}
		}

		const receivedKeys = Object.keys(
			objectValue,
		) as (keyof ObjectMapping[ObjectKey])[]
		const missingKeys = expectedKeys.filter(
			(missingKey) => !receivedKeys.includes(missingKey),
		)

		if (missingKeys.length > 0) {
			return {
				objectValid: false,
				missingKeys: missingKeys,
				typeErrors: [],
			}
		}

		const typeErrors = expectedKeys
			.map((expectedKey) => {
				const expectedMetaType = targetType[expectedKey]
				const receivedValue = objectValue[expectedKey]
				const receivedType = typeof receivedValue

				if (Array.isArray(expectedMetaType)) {
					const realExpectedMetaType = expectedMetaType[0]
					const realExpectedType = typeof realExpectedMetaType
					if (!Array.isArray(receivedValue)) {
						return {
							errorArgKey: expectedKey,
							expectedType: `${realExpectedMetaType ? realExpectedType : "any"}[]`,
							receivedType: receivedType,
						} satisfies ObjectTypeMismatchError
					}

					if (realExpectedMetaType === null) {
						return undefined
					}

					const memberTypes = receivedValue.map(
						(receivedMember: any) => {
							const memberType = typeof receivedMember
							return memberType
						},
					)

					const allMemberTypesMatch = memberTypes.every(
						(memberType: any) => {
							return memberType === realExpectedType
						},
					)

					if (allMemberTypesMatch) {
						return undefined
					}

					const prettyFmtMemberTypes =
						"[" + memberTypes.join(", ") + "]"

					return {
						errorArgKey: expectedKey,
						expectedType: `${realExpectedType}[]`,
						receivedType: prettyFmtMemberTypes,
					} satisfies ObjectTypeMismatchError
				}

				if (expectedMetaType === null) {
					return undefined
				}

				if (receivedType !== typeof expectedMetaType) {
					return {
						errorArgKey: expectedKey,
						expectedType: typeof expectedMetaType,
						receivedType: receivedType,
					} satisfies ObjectTypeMismatchError
				}

				return undefined
			})
			.filter((error) => error !== undefined)

		if (typeErrors.length > 0) {
			return {
				objectValid: false,
				missingKeys: [],
				typeErrors: typeErrors,
			}
		}

		return {
			objectValid: true,
			missingKeys: [],
			typeErrors: [],
		}
	}
}
