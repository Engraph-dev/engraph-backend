import type { MakeOptional } from "../common"
import { S3Object, S3Request, S3RequestMethod } from "@prisma/client"

export type MediaEndpointRequestBody = S3Object & {
	requestMethod: S3RequestMethod
}

export type MediaEndpointRequestQuery = MakeOptional<{
	replaceObject: boolean
}>

export type MediaEndpointResponse = {
	requestId: S3Request["requestId"]
	objectUrl: string
}

export type MediaCallbackParams = {
	requestId: S3Request["requestId"]
}
