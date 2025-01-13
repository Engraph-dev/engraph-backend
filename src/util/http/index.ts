import type { Org, Session, User } from "@prisma/client"
import type { Request, Response } from "express"

import type { BRAND_NAME } from "@/util/config/auth"
import {
	ReqMethod,
	ResJSON,
	StatusCode,
} from "@/util/defs/engraph-backend/common"

export type SessionJwtContent = {
	sub: Session["sessionId"]
	iat: number
	exp: number
	iss: typeof BRAND_NAME
}

export type ReqUserSession = Session & {
	sessionUser: User
	sessionOrg: Org
}

export interface IRequest<
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
> extends Request<ParamT, {}, BodyT, QueryT, {}> {
	currentSession?: ReqUserSession
	method: ReqMethod | string
	xsrfValid?: boolean
}

// @ts-expect-error
export interface IResponse<
	ParamT extends {} = {},
	BodyT extends {} = {},
	QueryT extends {} = {},
> extends Response {
	status(statusCode: StatusCode): IResponse<ParamT, BodyT, QueryT>

	json<DataT extends {}>(
		data: ResJSON<DataT, ParamT, BodyT, QueryT>,
	): IResponse<ParamT, BodyT, QueryT>
}
