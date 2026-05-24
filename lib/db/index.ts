import { drizzle } from "drizzle-orm/libsql"

const url = process.env.DATABASE_URL
const authToken = process.env.DATABASE_AUTH_TOKEN

if (!url) {
  throw new Error("DATABASE_URL is not set in the environment variables")
}

if (!authToken) {
  throw new Error("DATABASE_URL is not set in the environment variables")
}

export const db = drizzle({ connection: { url, authToken } })
