/**
 * This straight up does not work, apparently signature verification always and always fails.
 */

// import { AccessLevel, ProjectSourceType, UserRole } from "@prisma/client"

// import {
// 	getImplicitElevatedAccessLevels,
// 	getImplicitElevatedUserRoles,
// } from "@/util/app/helpers/orgs"
// import { createGithubWorkflow } from "@/util/app/helpers/workflows"
// import {
// 	GITHUB_APP_ID,
// 	GITHUB_APP_PRIVATE_KEY,
// 	GITHUB_CLIENT_ID,
// 	GITHUB_CLIENT_SECRET,
// 	GITHUB_WEBHOOK_SECRET,
// } from "@/util/config/github"
// import { db } from "@/util/db"
// import { LogLevel, log } from "@/util/log"

// export async function getGithubApp() {
// 	const { App } = await import("@octokit/app")

// 	const ghApp = new App({
// 		appId: GITHUB_APP_ID,
// 		oauth: {
// 			clientId: GITHUB_CLIENT_ID,
// 			clientSecret: GITHUB_CLIENT_SECRET,
// 		},
// 		privateKey: GITHUB_APP_PRIVATE_KEY,
// 		webhooks: {
// 			secret: GITHUB_WEBHOOK_SECRET,
// 		},
// 		log: logOpts,
// 	})

// 	return ghApp
// }

// const logOpts = {
// 	warn: (...logData: any[]) => {
// 		log("github.app", LogLevel.Warn, ...logData)
// 	},
// 	info: (...logData: any[]) => {
// 		log("github.app", LogLevel.Info, ...logData)
// 	},
// 	error: (...logData: any[]) => {
// 		log("github.app", LogLevel.Error, ...logData)
// 	},
// 	debug: (...logData: any[]) => {
// 		log("github.app", LogLevel.Debug, ...logData)
// 	},
// }

// export async function createWebhookHandler() {
// 	const { createNodeMiddleware } = await import("@octokit/app")

// 	const engraphApp = await getGithubApp()

// 	engraphApp.webhooks.onError((errData) => {
// 		logOpts.error(errData)
// 	})

// 	engraphApp.webhooks.on("push", async (eventPayload) => {
// 		const { id: eventId, name, octokit, payload } = eventPayload
// 		const { repository, sender, pusher, after, installation, ref } = payload
// 		const { id: repoId } = repository

// 		log("webhook", LogLevel.Debug, `Incoming push event ${eventId}`)

// 		/** Ensure that the pusher is an authenticated / authorized user */
// 		const pusherMail = pusher.email ?? sender?.email
// 		if (!pusherMail) {
// 			log(
// 				"webhook",
// 				LogLevel.Info,
// 				"Pusher email not found - webhook ignored",
// 			)
// 			// Do not start a workflow if email does not exist
// 			return
// 		}

// 		if (!installation) {
// 			log(
// 				"webhook",
// 				LogLevel.Info,
// 				"Pusher installation not found - webhook ignored",
// 			)
// 			// Do not do anything, where did this even pop up from?
// 			return
// 		}

// 		const { id: installationId } = installation

// 		const elevatedRoles = getImplicitElevatedUserRoles(UserRole.Developer)
// 		const elevatedAccessLevels = getImplicitElevatedAccessLevels(
// 			AccessLevel.Write,
// 		)

// 		const projectDoc = await db.project.findFirst({
// 			where: {
// 				projectSourceType: ProjectSourceType.GitHub,
// 				projectIdentifier: `${repoId}`,
// 				OR: [
// 					{
// 						projectTeams: {
// 							some: {
// 								linkedTeam: {
// 									teamUsers: {
// 										some: {
// 											linkedUser: {
// 												userMail: pusherMail,
// 												userRole: {
// 													in: elevatedRoles,
// 												},
// 											},
// 										},
// 									},
// 								},
// 								accessLevel: {
// 									in: elevatedAccessLevels,
// 								},
// 							},
// 						},
// 					},
// 					{
// 						projectUsers: {
// 							some: {
// 								linkedUser: {
// 									userMail: pusherMail,
// 									userRole: {
// 										in: elevatedRoles,
// 									},
// 								},
// 								accessLevel: {
// 									in: elevatedAccessLevels,
// 								},
// 							},
// 						},
// 					},
// 				],
// 			},
// 		})

// 		if (!projectDoc) {
// 			log(
// 				"webhook",
// 				LogLevel.Info,
// 				"Pusher project with email not found - webhook ignored",
// 			)
// 			return
// 		}

// 		createGithubWorkflow({
// 			commitHash: after,
// 			commitRef: ref,
// 			installationId: `${installationId}`,
// 			orgId: projectDoc.projectOrgId,
// 			projectId: projectDoc.projectId,
// 		})
// 	})

// 	const githubWebhookHandler = createNodeMiddleware(engraphApp, {
// 		pathPrefix: "",
// 	})

// 	return githubWebhookHandler
// }
