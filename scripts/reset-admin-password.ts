import "dotenv/config"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { hashPassword } from "@/lib/passwords"

const [, , emailArg, passwordArg] = process.argv

async function main() {
  const email = emailArg?.trim().toLowerCase()
  const password = passwordArg ?? ""

  if (!email || !password) {
    throw new Error("Usage: npm run admin:reset -- admin@example.com new-temporary-password")
  }

  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters")
  }

  const [admin] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!admin || admin.role !== "admin") {
    throw new Error("Admin user not found")
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      updatedAt: new Date()
    })
    .where(eq(users.id, admin.id))

  console.log(`Reset password for ${email}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
