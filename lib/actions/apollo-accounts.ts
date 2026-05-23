"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { encrypt } from "@/lib/crypto"
import { db } from "@/lib/db"
import { apolloAccounts } from "@/lib/db/schema"
import type { ActionResult } from "@/lib/types"

export type ApolloAccountPublic = {
  id: string
  account: string
}

export async function listApolloAccountsAdmin(): Promise<
  ActionResult<ApolloAccountPublic[]>
> {
  try {
    const rows = await db
      .select({
        id: apolloAccounts.id,
        account: apolloAccounts.account,
      })
      .from(apolloAccounts)

    return { ok: true, data: rows }
  } catch {
    return { ok: false, error: "Failed to load Apollo accounts" }
  }
}

export async function addApolloAccount(
  account: string,
  apiKey: string,
): Promise<ActionResult<ApolloAccountPublic>> {
  const name = account.trim()
  const key = apiKey.trim()

  if (!name) {
    return { ok: false, error: "Account name is required" }
  }

  if (!key) {
    return { ok: false, error: "API key is required" }
  }

  try {
    const existing = await db
      .select({ id: apolloAccounts.id })
      .from(apolloAccounts)
      .where(eq(apolloAccounts.account, name))
      .limit(1)

    if (existing[0]) {
      return { ok: false, error: "An account with this name already exists" }
    }

    const [row] = await db
      .insert(apolloAccounts)
      .values({
        account: name,
        encryptedKey: encrypt(key),
      })
      .returning({
        id: apolloAccounts.id,
        account: apolloAccounts.account,
      })

    revalidatePath("/")
    revalidatePath("/api")

    return { ok: true, data: row }
  } catch {
    return { ok: false, error: "Failed to add Apollo account" }
  }
}

export async function removeApolloAccount(
  id: string,
): Promise<ActionResult<void>> {
  if (!id.trim()) {
    return { ok: false, error: "Account id is required" }
  }

  try {
    const deleted = await db
      .delete(apolloAccounts)
      .where(eq(apolloAccounts.id, id))
      .returning({ id: apolloAccounts.id })

    if (!deleted[0]) {
      return { ok: false, error: "Account not found" }
    }

    revalidatePath("/")
    revalidatePath("/api")

    return { ok: true, data: undefined }
  } catch {
    return { ok: false, error: "Failed to remove Apollo account" }
  }
}
