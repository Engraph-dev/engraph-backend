import { envVar } from "../env";


export const AWS_S3_BUCKET = envVar("AWS_S3_BUCKET")
export const AWS_S3_KEY_SECRET = envVar("AWS_S3_KEY_SECRET")
export const AWS_S3_KEY_ID = envVar("AWS_S3_KEY_ID")
export const AWS_S3_REGION = envVar("AWS_S3_REGION")

export const SESSION_VALIDITY_SECONDS = 7 /*d*/ * 24 /*h*/ * 60 /*m*/ * 60; /*s*/
export const CHECK_S3_OBJECT_VALIDITY = true
export const S3_REQUEST_VALIDITY_SECONDS = 600
export const S3_OBJECT_UPLOAD_MAX_SIZE_BYTES = 1024 * 1024 * 50; /* 50 megabytes */
export const USE_CLOUDFRONT = false
export const AWS_CLOUDFRONT_BASE_URL = USE_CLOUDFRONT ?
	envVar("AWS_CLOUDFRONT_BASE_URL") : ""
