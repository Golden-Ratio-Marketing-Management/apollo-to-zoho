"use server"

import { eq, inArray } from "drizzle-orm"
import { decrypt, encrypt } from "@/lib/crypto"
import { normalizeApolloContact } from "@/lib/contacts"
import { requireAdmin, requireUser } from "@/lib/auth"
import { APOLLO_CONTACT_MODALITY } from "@/lib/constants"
import { db } from "@/lib/db"
import { apolloAccounts, apolloCompany } from "@/lib/db/schema"
import type {
  ActionResult,
  ApolloAccountRaw,
  ApolloContactRaw,
  ApolloLabel,
  CompanyInfo,
  ContactsPage,
  SelectOption
} from "@/lib/types"
import { capitalize, sleep } from "../utils"
import { revalidatePath } from "next/cache"

export type ApolloAccountPublic = {
  id: string
  account: string
}

export async function listApolloAccountsAdmin(): Promise<ActionResult<ApolloAccountPublic[]>> {
  await requireAdmin()

  try {
    const rows = await db
      .select({
        id: apolloAccounts.id,
        account: apolloAccounts.account
      })
      .from(apolloAccounts)

    return { ok: true, data: rows }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to load Apollo accounts" }
  }
}

export async function addApolloAccount(
  account: string,
  apiKey: string
): Promise<ActionResult<ApolloAccountPublic>> {
  const actor = await requireAdmin()
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
        adminId: actor.id
      })
      .returning({
        id: apolloAccounts.id,
        account: apolloAccounts.account
      })

    revalidatePath("/importer")
    revalidatePath("/admin")

    return { ok: true, data: row }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to add Apollo account" }
  }
}

export async function removeApolloAccount(id: string): Promise<ActionResult<void>> {
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

    revalidatePath("/importer")
    revalidatePath("/admin")

    return { ok: true, data: undefined }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to remove Apollo account" }
  }
}

function apolloHeaders(apiKey: string) {
  return {
    "Cache-Control": "no-cache",
    "Content-Type": "application/json",
    accept: "application/json",
    "x-api-key": apiKey
  }
}

async function getApolloApiKey(accountId: string): Promise<ActionResult<string>> {
  try {
    const rows = await db
      .select({ encryptedKey: apolloAccounts.encryptedKey })
      .from(apolloAccounts)
      .where(eq(apolloAccounts.id, accountId))
      .limit(1)

    if (!rows[0]) {
      return { ok: false, error: "Apollo account not found" }
    }

    return { ok: true, data: decrypt(rows[0].encryptedKey) }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to load Apollo account credentials" }
  }
}

export async function fetchApolloAccounts(): Promise<ActionResult<SelectOption[]>> {
  await requireUser()

  try {
    const rows = await db
      .select({
        id: apolloAccounts.id,
        account: apolloAccounts.account
      })
      .from(apolloAccounts)

    return {
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        label: row.account
      }))
    }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to load Apollo accounts" }
  }
}

export async function fetchApolloLists(accountId: string): Promise<ActionResult<SelectOption[]>> {
  await requireUser()

  try {
    const keyResult = await getApolloApiKey(accountId)
    if (!keyResult.ok) return keyResult

    const res = await fetch(`${process.env.APOLLO_API_URL}/labels`, {
      headers: apolloHeaders(keyResult.data),
      cache: "no-cache"
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("fetchApolloLists failed:", res.status, res.statusText, body)
      return { ok: false, error: "Failed to load Apollo lists" }
    }

    const labels = (await res.json()) as ApolloLabel[]

    return {
      ok: true,
      data: labels
        .filter((label) => label.modality === APOLLO_CONTACT_MODALITY)
        .map((label) => ({
          id: label.id,
          label: label.name
        }))
    }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to load Apollo lists" }
  }
}

export async function fetchApolloContacts(
  accountId: string,
  listId: string,
  page: number,
  perPage: number
): Promise<ActionResult<ContactsPage>> {
  await requireUser()

  try {
    const keyResult = await getApolloApiKey(accountId)
    if (!keyResult.ok) return keyResult

    const res = await fetch(`${process.env.APOLLO_API_URL}/contacts/search`, {
      method: "POST",
      headers: apolloHeaders(keyResult.data),
      cache: "no-cache",
      body: JSON.stringify({
        contact_label_ids: [listId],
        page,
        per_page: perPage
      })
    })

    const data = (await res.json()) as {
      contacts: ApolloContactRaw[]
      pagination: {
        page: number
        per_page: number
        total_entries: number
        total_pages: number
      }
    }

    if (!res.ok) {
      console.error("fetchApolloContacts failed:", res.status, res.statusText, data)
      return { ok: false, error: "Failed to load contacts" }
    }

    return {
      ok: true,
      data: {
        contacts: (data.contacts ?? []).map(normalizeApolloContact),
        pagination: {
          page: data.pagination.page,
          perPage: data.pagination.per_page,
          totalEntries: data.pagination.total_entries,
          totalPages: data.pagination.total_pages
        }
      }
    }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to load contacts" }
  }
}

function employeeCountToRange(count?: number | null): string | undefined {
  if (count == null) return
  if (count <= 10) return "1-10 employees"
  if (count <= 50) return "11-50 employees"
  if (count <= 200) return "51-200 employees"
  if (count <= 500) return "201-500 employees"
  return "500+ employees"
}

export async function fetchCompanyInfoBatch(
  accountId: string,
  apolloCompanyIds: string[]
): Promise<ActionResult<Map<string, CompanyInfo>>> {
  await requireUser()

  if (apolloCompanyIds.length === 0) {
    return { ok: true, data: new Map() }
  }

  const uniqueIds = [...new Set(apolloCompanyIds)]

  try {
    // 1. Bulk DB lookup
    const cached = await db
      .select()
      .from(apolloCompany)
      .where(inArray(apolloCompany.apolloAccountId, uniqueIds))

    const cachedMap = new Map(cached.map((c) => [c.apolloAccountId, c]))
    const missingIds = uniqueIds.filter((id) => !cachedMap.has(id))

    // 2. Fetch missing records from Apollo
    const freshResults: CompanyInfo[] = []

    if (missingIds.length > 0) {
      const keyResult = await getApolloApiKey(accountId)
      if (!keyResult.ok) return keyResult

      for (let i = 0; i < missingIds.length; i++) {
        const companyId = missingIds[i]
        const result = await fetchSingleApolloAccount(keyResult.data, companyId)

        if (result.ok) {
          if (result.data.employeeCount != null && result.data.industry != null)
            freshResults.push(result.data)
        } else {
          console.warn(`fetchCompanyInfoBatch: skipping ${companyId} — ${result.error}`)
        }

        if (i < missingIds.length - 1) {
          await sleep(Number(process.env.APOLLO_REQUEST_DELAY_MS ?? 200))
        }
      }

      // 3. Persist to DB — ignore conflicts since data never changes
      if (freshResults.length > 0) {
        await db
          .insert(apolloCompany)
          .values(
            freshResults.map((r) => ({
              apolloAccountId: r.apolloAccountId,
              employeeCount: r.employeeCount,
              industry: r.industry
            }))
          )
          .onConflictDoNothing({
            target: apolloCompany.apolloAccountId
          })
      }
    }

    // 4. Merge cached + fresh into a single map
    const freshMap = new Map(freshResults.map((r) => [r.apolloAccountId, r]))

    const data = new Map(
      uniqueIds.flatMap((id) => {
        const record = cachedMap.get(id) ?? freshMap.get(id)
        if (!record) return []
        const next = {
          apolloAccountId: id
        } as CompanyInfo

        if (record.industry) next.industry = capitalize(record.industry)
        if (record?.employeeCount)
          next.employeeCountRange = employeeCountToRange(record?.employeeCount)
        return [[id, next]]
      })
    )

    return { ok: true, data }
  } catch (error) {
    console.error("fetchCompanyInfoBatch error:", error)
    return { ok: false, error: "Failed to fetch company information" }
  }
}

async function fetchSingleApolloAccount(
  apiKey: string,
  companyId: string
): Promise<ActionResult<CompanyInfo>> {
  try {
    const res = await fetch(`${process.env.APOLLO_API_URL}/accounts/${companyId}`, {
      headers: apolloHeaders(apiKey),
      cache: "no-cache"
    })

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After")
      console.warn(`Apollo rate limit hit for account ${companyId}. Retry-After: ${retryAfter}`)
      return { ok: false, error: "Apollo rate limit exceeded" }
    }

    if (!res.ok) {
      const body = await res.text()
      console.error(`fetchSingleApolloAccount failed [${companyId}]:`, res.status, body)
      return { ok: false, error: `Apollo returned ${res.status}` }
    }

    const json = await res.json()

    if (json.error) {
      console.warn(`fetchSingleApolloAccount [${companyId}]: ${json.error}`)
      return { ok: false, error: json.error }
    }

    const account = json.account as ApolloAccountRaw

    const data = { apolloAccountId: companyId } as CompanyInfo

    if (account.estimated_num_employees != null)
      data.employeeCount = account.estimated_num_employees
    if (account.industry) data.industry = account.industry

    return {
      ok: true,
      data
    }
  } catch (error) {
    console.error(`fetchSingleApolloAccount error [${companyId}]:`, error)
    return { ok: false, error: "Network error fetching Apollo account" }
  }
}
