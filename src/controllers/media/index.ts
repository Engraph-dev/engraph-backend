import { HeadObjectCommand } from "@aws-sdk/client-s3"
import { EventType, S3RequestMethod, S3RequestStatus } from "@prisma/client"

import { getEventData, logEvent } from "@/util/app/events"
import { getObjectUrl, s3Client } from "@/util/app/s3"
import { AWS_S3_BUCKET, S3_REQUEST_VALIDITY_SECONDS } from "@/util/config/s3"
import db from "@/util/db"
import { NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import { ErrorCodes } from "@/util/defs/engraph-backend/errors"
import type {
	MediaCallbackParams,
	MediaEndpointRequestBody,
	MediaEndpointRequestQuery,
	MediaEndpointResponse,
} from "@/util/defs/engraph-backend/media"
import { requestHandler } from "@/util/http/helpers"

export const mediaHandler = requestHandler<
	NoParams,
	MediaEndpointRequestBody,
	MediaEndpointRequestQuery
>(async (req, res) => {
	const {
		requestMethod,
		objectFileName,
		objectKey,
		objectSizeBytes,
		objectContentType,
	} = req.body

	const createdRequest = await db.s3Request.create({
		data: {
			requestObjectKey: objectKey,
			requestMethod: requestMethod,
			requestUserId: req.currentSession!.userId,
			requestCreationTimestamp: new Date(),
			requestExpiryTimestamp: new Date(
				Date.now() + S3_REQUEST_VALIDITY_SECONDS * 1000,
			),
			requestStatus:
				requestMethod === S3RequestMethod.PUT
					? S3RequestStatus.Pending
					: S3RequestStatus.Success,
			...(requestMethod === S3RequestMethod.PUT
				? {
						requestObjectContentType: objectContentType,
						requestObjectFileName: objectFileName,
						requestObjectSize: objectSizeBytes,
					}
				: {}),
		},
	})

	const presignedUrl = await getObjectUrl({
		objectKey: objectKey,
		requestMethod: requestMethod,
	})

	if (requestMethod === S3RequestMethod.DELETE) {
		// Handle the delete ourselves
		const deleteResponse = await fetch(presignedUrl, {
			method: "DELETE",
		})

		await db.s3Object.delete({
			where: {
				objectKey: objectKey,
			},
		})

		logEvent({
			...getEventData(req),
			eventType: EventType.S3ObjectDelete,
			eventMetadata: {
				objectKey: objectKey,
			},
		})

		return res.status(StatusCodes.OK).json<MediaEndpointResponse>({
			responseStatus: "SUCCESS",
			requestId: createdRequest.requestId,
			objectUrl: "",
		})
	}

	logEvent({
		...getEventData(req),
		eventMetadata: {
			requestId: createdRequest.requestId,
		},
		eventType: EventType.S3RequestCreate,
	})

	return res.status(StatusCodes.OK).json<MediaEndpointResponse>({
		responseStatus: "SUCCESS",
		requestId: createdRequest.requestId,
		objectUrl: presignedUrl,
	})
})

export const mediaCallbackHandler = requestHandler<MediaCallbackParams>(
	async (req, res) => {
		const {
			params: { requestId },
		} = req

		const method = req.method as S3RequestMethod

		if (method === S3RequestMethod.GET) {
			return res.status(StatusCodes.OK).json({
				responseStatus: "SUCCESS",
			})
		}

		const s3Request = await db.s3Request.findFirstOrThrow({
			where: {
				requestId: requestId,
			},
		})

		const headRequest = new HeadObjectCommand({
			Bucket: AWS_S3_BUCKET,
			Key: s3Request.requestObjectKey,
		})

		let fileExists: boolean
		const fileShouldExist = s3Request.requestMethod === S3RequestMethod.PUT
		try {
			await s3Client.send(headRequest)
			fileExists = true
		} catch (e) {
			fileExists = false
		}

		if (!fileExists && fileShouldExist) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				responseStatus: "ERR_INVALID_PARAMS",
				invalidParams: [
					{
						paramType: "URL",
						errorCode: ErrorCodes.RequestIdInvalid,
						paramName: "requestId",
					},
				],
			})
		} else if (fileExists && !fileShouldExist) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				responseStatus: "ERR_INVALID_PARAMS",
				invalidParams: [
					{
						paramType: "URL",
						errorCode: ErrorCodes.RequestIdInvalid,
						paramName: "requestId",
					},
				],
			})
		} else {
			const contentType =
				s3Request.requestObjectContentType || "text/plain"
			const fileSplit = s3Request.requestObjectKey.split("/")
			const fileName =
				s3Request.requestObjectFileName ||
				(fileSplit.length
					? fileSplit.at(-1)!
					: s3Request.requestObjectKey)
			const contentSize = s3Request.requestObjectSize || 0

			await db.s3Object.deleteMany({
				where: {
					objectKey: s3Request.requestObjectKey,
				},
			})

			await db.s3Object.create({
				data: {
					objectKey: s3Request.requestObjectKey,
					objectContentType: contentType,
					objectFileName: fileName,
					objectSizeBytes: contentSize,
				},
			})

			await db.s3Request.update({
				where: {
					requestId: requestId,
				},
				data: {
					requestStatus: S3RequestStatus.Success,
				},
			})

			logEvent({
				...getEventData(req),
				eventType: EventType.S3RequestCallback,
				eventMetadata: {
					requestId: requestId,
				},
			})
			logEvent({
				...getEventData(req),
				eventType: EventType.S3ObjectCreate,
				eventMetadata: {
					objectKey: s3Request.requestObjectKey,
				},
			})

			return res.status(StatusCodes.OK).json({
				responseStatus: "SUCCESS",
			})
		}
	},
)
