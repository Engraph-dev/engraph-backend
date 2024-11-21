import {
	MetavalTypes,
	type MetavalValue,
	createConditionalObjectValidator,
} from "@/util/app/helpers//metaval"
import { type ErrorCode, ErrorCodes } from "@/util/defs/engraph-backend/errors"

/**
 * Mapping of error codes to their error args object.
 * This is used to validate the error args object before sending it to the user.
 * The error args object is expected to have the same keys as the mapping object.
 * The values of the mapping object are the expected types of the error args object.
 */
export const ErrorArgMapping = {
	// Invalid Data Type
	[ErrorCodes.InvalidDataType]: {
		expectedType: MetavalTypes.String,
	},
	// Extra parameter not part of expected request
	[ErrorCodes.ExtraParameter]: {},
	// Undefined / Null
	[ErrorCodes.NullOrUndefined]: {},

	//Received value not in a set of values
	[ErrorCodes.NotInAllowedSet]: {
		allowedValues: [MetavalTypes.Any],
	},
	//Received value is in a set of disallowed values
	[ErrorCodes.InDisallowedSet]: {
		disallowedValues: [MetavalTypes.Any],
	},

	// Empty string passed where content expected
	[ErrorCodes.EmptyString]: {},
	// Exact string length not met
	[ErrorCodes.ExactStringLength]: {
		expectedLength: MetavalTypes.Number,
	},
	// Minimum length not met
	[ErrorCodes.MinStringLength]: {
		minLength: MetavalTypes.Number,
	},
	// Maximum length of string exceeded
	[ErrorCodes.MaxStringLength]: {
		maxLength: MetavalTypes.Number,
	},
	// Min-Max length of string not met
	[ErrorCodes.MinMaxStringLength]: {
		minLength: MetavalTypes.Number,
		maxLength: MetavalTypes.Number,
	},
	// Invalid Email Address
	[ErrorCodes.InvalidEmail]: {},
	// Invalid URL
	[ErrorCodes.InvalidUrl]: {
		urlOrigin: MetavalTypes.String,
		urlProtocol: MetavalTypes.String,
	},
	// Invalid Date FMT
	[ErrorCodes.InvalidDate]: {},
	// Invalid Phone Number Format
	[ErrorCodes.InvalidPhone]: {},
	// General Regular Expression
	[ErrorCodes.InvalidRegex]: {
		regExp: MetavalTypes.String,
	},
	// 0 entered for a non-zero field
	[ErrorCodes.NonZero]: {},
	// 0 or -ve entered for a +ve field
	[ErrorCodes.Positive]: {},
	// 0 or +ve entered for a -ve field
	[ErrorCodes.Negative]: {},
	// -ve entered for a 0 or +ve field
	[ErrorCodes.PositiveOrZero]: {},
	// +ve entered for a 0 or -ve field
	[ErrorCodes.NegativeOrZero]: {},
	// Min value not met
	[ErrorCodes.Min]: {
		minValue: MetavalTypes.Number,
	},
	// Max value exceeded
	[ErrorCodes.Max]: {
		maxValue: MetavalTypes.Number,
	},
	// Min-Max value not met
	[ErrorCodes.MinMax]: {
		minValue: MetavalTypes.Number,
		maxValue: MetavalTypes.Number,
	},
	// Empty Array
	[ErrorCodes.EmptyArr]: {},
	// Min length not met
	[ErrorCodes.MinArrLength]: {
		minLength: MetavalTypes.Number,
	},
	// Max length exceeded
	[ErrorCodes.MaxArrLength]: {
		maxLength: MetavalTypes.Number,
	},
	// Min-Max length not met
	[ErrorCodes.MinMaxArrLength]: {
		minLength: MetavalTypes.Number,
		maxLength: MetavalTypes.Number,
	},
	// Array elements are invalid
	[ErrorCodes.ArrElemInvalid]: {
		invalidIndexes: [MetavalTypes.Number],
	},

	/*App Logic Errors*/
	// Authentication Mode Already in Use
	[ErrorCodes.IdentityInUse]: {},
	// Authentication credentials not found
	[ErrorCodes.IdentityNotFound]: {},
	// Password does not match
	[ErrorCodes.PasswordMismatch]: {},

	/*Entity Errors*/
	// Invalid session ID
	[ErrorCodes.InvalidSessionId]: {},
	// Invalid org ID
	[ErrorCodes.InvalidOrgId]: {},
	// Invalid team ID
	[ErrorCodes.InvalidTeamId]: {},
	// Invalid User Id
	[ErrorCodes.InvalidUserId]: {},
	// Object key does not exist (GET / DELETE)
	[ErrorCodes.InvalidObjectKey]: {},
	// Media Object already exists (PUT)
	[ErrorCodes.ObjectExists]: {},
	// Media Object parameters are invalid (Content Type, Size)
	[ErrorCodes.ObjectParamsInvalid]: {
		maxSize: MetavalTypes.Number,
		acceptedTypes: [MetavalTypes.String],
	},
	// Media Request ID is invalid
	[ErrorCodes.RequestIdInvalid]: {},
	// Project ID is invalid
	[ErrorCodes.ProjectIdInvalid]: {},
	// Project Quota Exceeded for Org Plan
	[ErrorCodes.ProjectQuotaExceeded]: {},
	// User Quota Exceeded for Org Plan
	[ErrorCodes.UserQuotaExceeded]: {},
	// Project Access Missing
	[ErrorCodes.ProjectAccessMissing]: {},

	// Unknown error
	[ErrorCodes.Unknown]: {},
} satisfies Record<ErrorCode, Record<string, MetavalValue>>

export const validateErrorArgs = createConditionalObjectValidator(
	ErrorArgMapping,
	MetavalTypes,
)
