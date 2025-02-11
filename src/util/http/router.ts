import { Router as ExpressRouter } from "express"

/** Extends express.Router to make `mergeParams: true` by default */
export function Router() {
	return ExpressRouter({ mergeParams: true })
}
