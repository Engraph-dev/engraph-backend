import { S3RequestMethod } from "@prisma/client"
import { Router } from "express"

import { mediaCallbackHandler, mediaHandler } from "@/controllers/media"

import {
	MediaRequestIdValidator,
	S3ObjectContentSizeValidator,
	S3ObjectKeyMethodValidator,
} from "@/util/app/validators/media"
import { NoParams } from "@/util/defs/engraph-backend/common"
import {
	MediaCallbackParams,
	MediaEndpointRequestBody,
	type MediaEndpointRequestQuery,
} from "@/util/defs/engraph-backend/media"
import { requireMethods, validateParams } from "@/util/http/middleware"
import { EXPECT_TYPE, IN_ARRAY, NOVALIDATE } from "@/util/http/validators"

const mediaRouter = Router({ mergeParams: true })

mediaRouter.post<
	"/",
	NoParams,
	NoParams,
	MediaEndpointRequestBody,
	MediaEndpointRequestQuery,
	NoParams
>(
	"/",
	validateParams({
		urlParams: {},
		bodyParams: {
			objectFileName: EXPECT_TYPE<string>("string", NOVALIDATE()),
			requestMethod: IN_ARRAY<S3RequestMethod>([
				S3RequestMethod.PUT,
				S3RequestMethod.GET,
				S3RequestMethod.DELETE,
			]),
			objectContentType: EXPECT_TYPE<string>("string", NOVALIDATE()),
			objectKey: EXPECT_TYPE<string>("string", NOVALIDATE()),
			objectSizeBytes: NOVALIDATE(),
		},
		batchValidators: {
			bodyParams: [
				{
					targetParams: ["requestMethod", "objectKey"],
					validatorFunction: S3ObjectKeyMethodValidator,
				},
				{
					targetParams: [
						"requestMethod",
						"objectSizeBytes",
						"objectContentType",
					],
					validatorFunction: S3ObjectContentSizeValidator,
				},
			],
		},
	}),
	mediaHandler,
)

mediaRouter.use<
	"/:requestId",
	MediaCallbackParams,
	NoParams,
	NoParams,
	NoParams,
	NoParams
>(
	"/:requestId",
	requireMethods([S3RequestMethod.PUT, S3RequestMethod.DELETE]),
	validateParams({
		urlParams: {
			requestId: MediaRequestIdValidator,
		},
	}),
	mediaCallbackHandler,
)

export { mediaRouter }
