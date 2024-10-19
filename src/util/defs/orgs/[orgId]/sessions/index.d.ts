import { Session, type User } from "@prisma/client"

export type EndSessionParams = {
	sessionId: Session["sessionId"]
}

export type GetSessionResponse =
	| {
			sessionData: Omit<
				Session,
				"sessionToken" | "sessionIp" | "sessionUA"
			> & {
				sessionUser: User
				sessionOrg: Org
			}
	  }
	| {
			sessionData: null
	  }

export type GetActiveSessionsResponse = {
	activeSessions: Omit<
		Session,
		"sessionToken" | "sessionEndTimestamp" | "userId" | "orgId"
	>[]
}
