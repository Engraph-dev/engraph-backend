import db from "@/util/db"
import {
	HeartbeatCheckResponse,
	StatusCodes,
} from "@/util/defs/engraph-backend/common"
import { requestHandler } from "@/util/http/wrappers"

/**
 * Heartbeat check
 * Use this endpoint to check if the server and database connection is up and running.
 */
export const heartbeatCheck = requestHandler(async (req, res) => {
	await db.$queryRaw`SELECT 1`

	res.status(StatusCodes.OK).json<HeartbeatCheckResponse>({
		responseStatus: "SUCCESS",
		heartbeatTimestamp: new Date().toISOString(),
	})
})

/**
 * Metrics check
 * Use this endpoint to get the metrics data of the database.
 */
export const metricsCheck = requestHandler(async (req, res) => {
	const dbMetrics = await db.$metrics.json()

	res.status(StatusCodes.OK).json<{ metricsData: typeof dbMetrics }>({
		responseStatus: "SUCCESS",
		metricsData: dbMetrics,
	})
})
