import dotenv from "dotenv"

dotenv.config()

export function envVar(envKey: keyof typeof process.env) {
	const envVal = process.env[envKey]
	if (envVal === undefined) {
		throw new Error(`Environment variable ${envKey} is undefined!`)
	}
	return envVal
}
