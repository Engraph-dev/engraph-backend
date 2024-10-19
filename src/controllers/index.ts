import db from "@/util/db"
import { HeartbeatCheckResponse, StatusCodes } from "@/util/defs/common"
import { requestHandler } from "@/util/http/helpers"

export const heartbeatCheck = requestHandler(async (req, res) => {
	await db.$queryRaw`SELECT 1`

	res.status(StatusCodes.OK).json<HeartbeatCheckResponse>({
		responseStatus: "SUCCESS",
		heartbeatTimestamp: new Date().toISOString(),
	})
})

export const metricsCheck = requestHandler(async (req, res) => {
	const dbMetrics = await db.$metrics.json()

	res.status(StatusCodes.OK).json<{ metricsData: typeof dbMetrics }>({
		responseStatus: "SUCCESS",
		metricsData: dbMetrics,
	})
})
