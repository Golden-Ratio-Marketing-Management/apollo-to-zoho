import "server-only"

import crypto from "node:crypto"
import { cache } from "react"
import { and, eq, gt } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { sessions, users } from "@/lib/db/schema"

const sessionCookieName = "apollo_zoho_session"
const sessionDurationMs = 1000 * 60 * 60 * 24 * 7

export type UserRole = "admin" | "user"

export type CurrentUser = {
  id: string
  email: string
  name: string
  role: UserRole
}

export function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("base64url")
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + sessionDurationMs)

  await db.insert(sessions).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  })

  const cookieStore = await cookies()
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(sessionCookieName)?.value

  if (token) {
    await db
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashSessionToken(token)))
  }

  cookieStore.delete(sessionCookieName)
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(sessionCookieName)?.value

  if (!token) {
    return null
  }

  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      revokedAt: users.revokedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1)

  const row = rows[0]

  if (!row || row.revokedAt) {
    return null
  }

  return {
    id: row.userId,
    email: row.email,
    name: row.name,
    role: row.role,
  }
})

export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  return user
}

export async function requireAdmin() {
  const user = await requireUser()

  if (user.role !== "admin") {
    redirect("/importer")
  }

  return user
}
