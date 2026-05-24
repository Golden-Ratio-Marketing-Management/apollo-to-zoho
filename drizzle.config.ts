import "dotenv/config"
import { defineConfig } from "drizzle-kit"

const url = process.env.DATABASE_URL
const authToken = process.env.DATABASE_AUTH_TOKEN

if (!url) {
  throw new Error("DATABASE_URL is not set in the environment variables")
}

if (!authToken) {
  throw new Error("DATABASE_URL is not set in the environment variables")
}

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "turso",
  dbCredentials: { url, authToken }
})
