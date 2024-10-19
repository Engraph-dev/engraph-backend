import { S3RequestMethod, S3RequestStatus } from "@prisma/client"

import { ACCEPT_S3_CONTENT_TYPES } from "@/util/config/media"
import {
	CHECK_S3_OBJECT_VALIDITY,
	S3_OBJECT_UPLOAD_MAX_SIZE_BYTES,
} from "@/util/config/s3"
import db from "@/util/db"
import type { NoParams } from "@/util/defs/common"
import { ErrorCodes } from "@/util/defs/errors"
import {
	MediaEndpointRequestBody,
	type MediaEndpointRequestQuery,
} from "@/util/defs/media"
import { BatchValidatorFunction } from "@/util/http/middleware"
import { EXPECT_TYPE } from "@/util/http/validators"

export const S3ObjectKeyMethodValidator: BatchValidatorFunction<
	MediaEndpointRequestBody,
	NoParams,
	MediaEndpointRequestBody,
	MediaEndpointRequestQuery
> = async ({ requestMethod, objectKey }, req) => {
	const objectDoc = await db.s3Object.findFirst({
		where: {
			objectKey: objectKey,
		},
	})

	const objectExists = objectDoc !== null

	if (!CHECK_S3_OBJECT_VALIDITY) {
		return {
			validationPass: true,
		}
	}
	if (
		requestMethod === S3RequestMethod.GET ||
		requestMethod === S3RequestMethod.DELETE
	) {
		if (objectExists) {
			return {
				validationPass: true,
			}
		}
		return {
			validationPass: false,
			errorCode: ErrorCodes.InvalidObjectKey,
		}
	} else {
		if (objectExists && !Boolean(req.query.replaceObject)) {
			return {
				validationPass: false,
				errorCode: ErrorCodes.ObjectExists,
			}
		}
		return {
			validationPass: true,
		}
	}
}
export const S3ObjectContentSizeValidator: BatchValidatorFunction<
	MediaEndpointRequestBody
> = async ({ requestMethod, objectSizeBytes, objectContentType }) => {
	if (
		requestMethod === S3RequestMethod.GET ||
		requestMethod === S3RequestMethod.DELETE
	) {
		return {
			validationPass: true,
		}
	}

	if (
		objectSizeBytes > 0 &&
		objectSizeBytes <= S3_OBJECT_UPLOAD_MAX_SIZE_BYTES &&
		(ACCEPT_S3_CONTENT_TYPES as readonly string[]).includes(
			objectContentType,
		)
	) {
		return {
			validationPass: true,
		}
	}

	return {
		validationPass: false,
		errorCode: ErrorCodes.ObjectParamsInvalid,
		errorArgs: {
			maxSize: S3_OBJECT_UPLOAD_MAX_SIZE_BYTES,
			acceptedMimeTypes: ACCEPT_S3_CONTENT_TYPES,
		},
	}
}
export const MediaRequestIdValidator = EXPECT_TYPE<string>(
	"string",
	async (reqId) => {
		const dbRequest = await db.s3Request.findFirst({
			where: {
				requestId: reqId,
				requestExpiryTimestamp: {
					gt: new Date(),
				},
				requestStatus: S3RequestStatus.Pending,
			},
		})

		if (dbRequest) {
			return {
				validationPass: true,
			}
		}
		return {
			validationPass: false,
			errorCode: ErrorCodes.RequestIdInvalid,
		}
	},
)
