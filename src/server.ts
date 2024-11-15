import { indexRouter } from "@/routers"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import cron from "node-cron"

import { cleanupXSRFTokens } from "@/util/app/http"
import { cleanupS3Requests } from "@/util/app/s3"
import { CORS_CONFIG } from "@/util/config/auth"
import {
	API_VERSION,
	NODE_ENV,
	PORT,
	XSRF_TIMEOUT_SECONDS,
} from "@/util/config/http"
import { S3_REQUEST_VALIDITY_SECONDS } from "@/util/config/s3"
import { StatusCodes } from "@/util/defs/engraph-backend/common"
import { requestHandler, requestHelper, xsrfParser } from "@/util/http/helpers"

dotenv.config()

const app = express()

cron.schedule(`*/${S3_REQUEST_VALIDITY_SECONDS / 60} * * * *`, async () => {
	const requestCount = await cleanupS3Requests()
	if (NODE_ENV === "development") {
		console.log(`[INFO] Cleaned up ${requestCount} expired S3 requests`)
	}
})

cron.schedule(`*/${XSRF_TIMEOUT_SECONDS / 60} * * * *`, async () => {
	const deletedTokens = await cleanupXSRFTokens()
	if (NODE_ENV === "development") {
		console.log(
			`[INFO] Cleaned up ${deletedTokens.count} expired XSRF Tokens`,
		)
	}
})

app.set("etag", false)
app.set("trust proxy", true)

app.use(cors(CORS_CONFIG))

dotenv.config()
app.use(bodyParser.json())
app.use(cookieParser())

app.use(requestHelper)
app.use(xsrfParser)

app.use(`/api/${API_VERSION}`, indexRouter)

app.use(
	"*",
	requestHandler((req, res) => {
		res.status(StatusCodes.NOT_FOUND).json({
			responseStatus: "ERR_NOT_FOUND",
		})
	}),
)

app.listen(PORT, () => {
	console.log(`Server running on port: ${PORT}`)
})
