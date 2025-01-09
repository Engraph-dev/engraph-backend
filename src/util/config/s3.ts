import { AWS_REGION } from "./aws"

import { envVar } from "@/util/env"

export const AWS_S3_BUCKET = envVar("AWS_S3_BUCKET")
export const CHECK_S3_OBJECT_VALIDITY = true
export const S3_REQUEST_VALIDITY_SECONDS = 600
export const S3_OBJECT_UPLOAD_MAX_SIZE_BYTES =
	1024 * 1024 * 50 /* 50 megabytes */

export const USE_CLOUDFRONT = false
export const AWS_CLOUDFRONT_BASE_URL = USE_CLOUDFRONT
	? envVar("AWS_CLOUDFRONT_BASE_URL")
	: ""

export const S3_ORIGIN_URL = USE_CLOUDFRONT
	? new URL(AWS_CLOUDFRONT_BASE_URL)
	: new URL(`https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`)
export const S3_ORIGIN = S3_ORIGIN_URL.origin
export const S3_ORIGIN_PROTOCOL = S3_ORIGIN_URL.protocol
