import { indexRouter } from "@/routers"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import express from "express"
import cron from "node-cron"

import { cleanupXSRFTokens } from "@/util/app/helpers/http"
import { cleanupS3Requests } from "@/util/app/helpers/s3"
import { API_VERSION, PORT, XSRF_TIMEOUT_SECONDS } from "@/util/config/http"
import { S3_REQUEST_VALIDITY_SECONDS } from "@/util/config/s3"
import { StatusCodes } from "@/util/defs/engraph-backend/common"
import {
	actionRateLimiter,
	authParser,
	corsHelper,
	devRequestLogger,
	getRateLimiter,
	xsrfParser,
} from "@/util/http/middleware"
import { requestHandler } from "@/util/http/wrappers"
import { LogLevel, log } from "@/util/log"

dotenv.config()

const app = express()

cron.schedule(`*/${S3_REQUEST_VALIDITY_SECONDS / 60} * * * *`, async () => {
	const requestCount = await cleanupS3Requests()
	log("s3", LogLevel.Debug, `Cleaned up ${requestCount} expired S3 requests`)
})

cron.schedule(`*/${XSRF_TIMEOUT_SECONDS / 60} * * * *`, async () => {
	const deletedTokens = await cleanupXSRFTokens()
	log(
		"xsrf",
		LogLevel.Debug,
		`Cleaned up ${deletedTokens.count} expired XSRF Tokens`,
	)
})

app.set("etag", false)
app.set("trust proxy", true)
app.disable("x-powered-by")

// Content Parsing
app.use(bodyParser.json())
// Cookie Parsing
app.use(cookieParser())

// Dev Mode Logging Only
app.use(devRequestLogger)
// Fails when incorrect Origin header supplied
app.use(corsHelper)
// Rate limiters
app.use(getRateLimiter)
app.use(actionRateLimiter)
// Auth Cookie Parsing
app.use(authParser)
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
	log("http", LogLevel.Info, `Server running on port: ${PORT}`)
})
