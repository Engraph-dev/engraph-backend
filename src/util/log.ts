import { featureFlag } from "@/util/config"

export enum LogLevel {
	Debug = "debug",
	Info = "info",
	Warn = "warn",
	Error = "error",
}

export function log(serviceName: string, logLevel: LogLevel, ...data: any[]) {
	const logMessage = featureFlag(
		true,
		[LogLevel.Error, LogLevel.Warn].includes(logLevel),
	)
	if (!logMessage) {
		return
	}

	const mappedData = data.map((dataObj) => {
		if (dataObj instanceof Error) {
			return `${dataObj.name}\n${dataObj.message}\n${dataObj.stack}`
		}
		if (typeof dataObj === "object") {
			return JSON.stringify(dataObj, null, 4)
		}
		return dataObj
	})

	console[logLevel](`[${serviceName}:${logLevel}] ${mappedData.join(" ")}`)
}
