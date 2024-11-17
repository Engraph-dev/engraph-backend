import { NODE_ENV } from "@/util/config"

export enum LogLevel {
	Debug = "debug",
	Info = "info",
	Warn = "warn",
	Error = "error",
}

export function log(serviceName: string, logLevel: LogLevel, ...data: any[]) {
	if (NODE_ENV === "production") {
		if (logLevel === LogLevel.Debug || logLevel === LogLevel.Info) {
			return
		}
	}
	console[logLevel](`[${serviceName}:${logLevel}] ${data.join(" ")}`)
}
