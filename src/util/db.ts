import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

export { db }

export default db
