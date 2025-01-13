import { Router } from "express"

import { githubEventsHandler } from "@/controllers/github"

const githubRouter = Router()

/** This must be mounted exactly at "/webhooks"
 * Not even as a separate router "/webhooks", followed by ""
 */
githubRouter.post("/webhooks", githubEventsHandler)

export { githubRouter }
