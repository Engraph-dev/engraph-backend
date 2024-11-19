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
	console[logLevel](`[${serviceName}:${logLevel}] ${data.join(" ")}`)
}
