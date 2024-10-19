import type { Org, User } from "@prisma/client"

export type CreateOrgBody = Pick<Org, "orgName"> &
	Pick<User, "userMail" | "userPassword" | "userFirstName" | "userLastName">
