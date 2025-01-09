import { Router } from "express"

import { githubEventsHandler } from "@/controllers/github"

const githubRouter = Router()

githubRouter.post("/webhooks", githubEventsHandler)

export { githubRouter }
