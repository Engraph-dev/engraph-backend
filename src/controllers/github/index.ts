import { AccessLevel, ProjectSourceType, UserRole } from "@prisma/client"

import {
	getImplicitElevatedAccessLevels,
	getImplicitElevatedUserRoles,
} from "@/util/app/helpers/orgs"
import { createGithubWorkflow } from "@/util/app/helpers/workflows"
import db from "@/util/db"
import { NoParams, StatusCodes } from "@/util/defs/engraph-backend/common"
import { requestHandler } from "@/util/http/wrappers"
import { LogLevel, log } from "@/util/log"

export const githubEventsHandler = requestHandler<NoParams, any, NoParams>(
	async (req, res) => {
		const eventType = req.headers["x-github-event"]
		const eventId = req.headers["x-github-delivery"]
		if (eventType !== "push") {
			// Ignore non-push events
			return res.status(StatusCodes.OK).json({
				responseStatus: "SUCCESS",
			})
		}

		// Automatically respond with success after 8 seconds
		// Github expects a response within 10 seconds
		setTimeout(() => {
			res.status(StatusCodes.OK).json({
				responseStatus: "SUCCESS",
			})
		}, 8000)

		const { repository, sender, pusher, after, installation, ref } =
			req.body
		const { id: repoId } = repository

		log("webhook", LogLevel.Debug, `Incoming push event ${eventId}`)

		/** Ensure that the pusher is an authenticated / authorized user */
		const pusherMail = pusher.email ?? sender?.email
		if (!pusherMail) {
			log(
				"webhook",
				LogLevel.Info,
				"Pusher email not found - webhook ignored",
			)
			// Do not start a workflow if email does not exist
			return
		}

		if (!installation) {
			log(
				"webhook",
				LogLevel.Info,
				"Pusher installation not found - webhook ignored",
			)
			// Do not do anything, where did this even pop up from?
			return
		}

		const { id: installationId } = installation

		const elevatedRoles = getImplicitElevatedUserRoles(UserRole.Developer)
		const elevatedAccessLevels = getImplicitElevatedAccessLevels(
			AccessLevel.Write,
		)

		const projectDoc = await db.project.findFirst({
			where: {
				projectSourceType: ProjectSourceType.GitHub,
				projectIdentifier: `${repoId}`,
				OR: [
					{
						projectTeams: {
							some: {
								linkedTeam: {
									teamUsers: {
										some: {
											linkedUser: {
												userMail: pusherMail,
												userRole: {
													in: elevatedRoles,
												},
											},
										},
									},
								},
								accessLevel: {
									in: elevatedAccessLevels,
								},
							},
						},
					},
					{
						projectUsers: {
							some: {
								linkedUser: {
									userMail: pusherMail,
									userRole: {
										in: elevatedRoles,
									},
								},
								accessLevel: {
									in: elevatedAccessLevels,
								},
							},
						},
					},
				],
			},
		})

		if (!projectDoc) {
			log(
				"webhook",
				LogLevel.Info,
				"Pusher project with email not found - webhook ignored",
			)
			return
		}

		createGithubWorkflow({
			commitHash: after,
			commitRef: ref,
			installationId: `${installationId}`,
			orgId: projectDoc.projectOrgId,
			projectId: projectDoc.projectId,
		})
	},
)
