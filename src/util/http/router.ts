import { Router as ExpressRouter } from "express"

/** Extends express.Router to make `mergeParams: true` by default */
export const Router = ExpressRouter.bind(ExpressRouter, { mergeParams: true })
