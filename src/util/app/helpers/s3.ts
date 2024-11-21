import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { S3RequestMethod, S3RequestStatus } from "@prisma/client"

import {
	AWS_S3_BUCKET,
	AWS_S3_KEY_ID,
	AWS_S3_KEY_SECRET,
	AWS_S3_REGION,
	S3_ORIGIN,
	S3_ORIGIN_PROTOCOL,
	S3_REQUEST_VALIDITY_SECONDS,
} from "@/util/config/s3"
import db from "@/util/db"

export const s3Client = new S3Client({
	region: AWS_S3_REGION,
	credentials: {
		accessKeyId: AWS_S3_KEY_ID,
		secretAccessKey: AWS_S3_KEY_SECRET,
	},
})

const requestCommandMap = {
	GET: GetObjectCommand,
	PUT: PutObjectCommand,
	DELETE: DeleteObjectCommand,
} as const

type ObjectUrlOpts = {
	requestMethod: S3RequestMethod
	objectKey: string
}

export async function getObjectUrl({
	requestMethod,
	objectKey,
}: ObjectUrlOpts): Promise<string> {
	const assocMethodCommand = requestCommandMap[requestMethod]

	// @ts-ignore
	const objCommand = new assocMethodCommand({
		Bucket: AWS_S3_BUCKET,
		Key: objectKey,
	})

	const presignedUrl = await getSignedUrl(s3Client, objCommand, {
		expiresIn: S3_REQUEST_VALIDITY_SECONDS, // 10min for PUT / DELETE
	})

	if (requestMethod === "GET") {
		// Strip authentication for GET requests
		const objectUrl = new URL(presignedUrl)
		const { pathname: s3Pathname } = objectUrl
		const resolvedUrl = `${S3_ORIGIN_PROTOCOL}://${S3_ORIGIN}${s3Pathname}`
		return resolvedUrl
	}

	return presignedUrl
}

export async function cleanupS3Requests() {
	const updateBatch = await db.s3Request.updateMany({
		where: {
			requestExpiryTimestamp: {
				lt: new Date(),
			},
			requestStatus: S3RequestStatus.Pending,
		},
		data: {
			requestStatus: S3RequestStatus.Error,
		},
	})
	return updateBatch.count
}
