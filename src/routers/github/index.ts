import { githubEventsHandler } from "@/controllers/github"

import { Router } from "@/util/http/router"

const githubRouter = Router()

/** This must be mounted exactly at "/webhooks"
 * Not even as a separate router "/webhooks", followed by ""
 */
githubRouter.post("/webhooks", githubEventsHandler)

export { githubRouter }
