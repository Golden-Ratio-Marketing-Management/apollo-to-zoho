"use server"

import { count, eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { createSession, clearSession, requireAdmin } from "@/lib/auth"
import { writeAuditLog } from "@/lib/audit"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { hashPassword, verifyPassword } from "@/lib/passwords"
import type { ActionResult } from "@/lib/types"

export type AuthFormState = {
  error?: string
}

export async function hasAnyAdmin() {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "admin"))

  return (row?.value ?? 0) > 0
}

export async function signIn(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user || user.revokedAt) {
    return { error: "Invalid credentials" }
  }

  const valid = await verifyPassword(password, user.passwordHash)

  if (!valid) {
    return { error: "Invalid credentials" }
  }

  await createSession(user.id)
  await writeAuditLog({
    actorId: user.id,
    action: "auth.sign_in",
    targetType: "user",
    targetId: user.id,
  })

  redirect(user.role === "admin" ? "/admin" : "/importer")
}

export async function signOut() {
  await clearSession()
  redirect("/")
}

export async function createFirstAdmin(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (await hasAnyAdmin()) {
    return { error: "Bootstrap is closed" }
  }

  const expectedToken = process.env.BOOTSTRAP_ADMIN_TOKEN
  const submittedToken = String(formData.get("bootstrapToken") ?? "")

  if (!expectedToken || submittedToken !== expectedToken) {
    return { error: "Invalid bootstrap token" }
  }

  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") ?? "")

  const validationError = validateUserInput(name, email, password)
  if (validationError) {
    return { error: validationError }
  }

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "admin",
    })
    .returning()

  await createSession(user.id)
  await writeAuditLog({
    actorId: user.id,
    action: "auth.bootstrap_admin",
    targetType: "user",
    targetId: user.id,
  })

  redirect("/admin")
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: "admin" | "user",
): Promise<
  ActionResult<{ id: string; email: string; name: string; role: "admin" | "user" }>
> {
  const actor = await requireAdmin()
  const normalizedEmail = email.trim().toLowerCase()
  const validationError = validateUserInput(name, normalizedEmail, password)

  if (validationError) {
    return { ok: false, error: validationError }
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)

    if (existing) {
      return { ok: false, error: "A user with this email already exists" }
    }

    const [user] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: await hashPassword(password),
        role,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })

    await writeAuditLog({
      actorId: actor.id,
      action: "user.create",
      targetType: "user",
      targetId: user.id,
      metadata: { role },
    })

    return { ok: true, data: user }
  } catch {
    return { ok: false, error: "Failed to create user" }
  }
}

export async function revokeUser(id: string): Promise<ActionResult<void>> {
  const actor = await requireAdmin()

  if (id === actor.id) {
    return { ok: false, error: "You cannot revoke your own account" }
  }

  try {
    const revoked = await db
      .update(users)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id })

    if (!revoked[0]) {
      return { ok: false, error: "User not found" }
    }

    await writeAuditLog({
      actorId: actor.id,
      action: "user.revoke",
      targetType: "user",
      targetId: id,
    })

    return { ok: true, data: undefined }
  } catch {
    return { ok: false, error: "Failed to revoke user" }
  }
}

export async function listUsers(): Promise<
  ActionResult<
    {
      id: string
      email: string
      name: string
      role: "admin" | "user"
      revokedAt: Date | null
    }[]
  >
> {
  await requireAdmin()

  try {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        revokedAt: users.revokedAt,
      })
      .from(users)

    return { ok: true, data: rows }
  } catch {
    return { ok: false, error: "Failed to load users" }
  }
}

function validateUserInput(name: string, email: string, password: string) {
  if (!name.trim()) return "Name is required"
  if (!email.includes("@")) return "A valid email is required"
  if (password.length < 12) return "Password must be at least 12 characters"
  return null
}
