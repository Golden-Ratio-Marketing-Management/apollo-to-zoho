"use server"

import { and, eq } from "drizzle-orm"
import { decrypt, encrypt } from "@/lib/crypto"
import { normalizeApolloContact } from "@/lib/contacts"
import { requireAdmin, requireUser } from "@/lib/auth"
import { APOLLO_CONTACT_MODALITY } from "@/lib/constants"
import { db } from "@/lib/db"
import { apolloAccounts, zohoSecrets } from "@/lib/db/schema"
import type {
  ActionResult,
  ApolloContactRaw,
  ApolloLabel,
  ContactsPage,
  SelectOption,
  ZohoCampaignPicklistResponse,
  ZohoItem,
  ZohoResultItem
} from "@/lib/types"

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

export async function fetchZohoToken(): Promise<ActionResult<string>> {
  await requireUser()

  try {
    const now = Date.now()
    const [secret] = await db.select().from(zohoSecrets).limit(1)

    if (!secret) {
      return { ok: false, error: "Zoho credentials are not configured" }
    }

    if (secret.accessTokenExpiresAt.getTime() > now + 60_000) {
      return { ok: true, data: decrypt(secret.encryptedAccessToken) }
    }

    const clientId = decrypt(secret.encryptedClientId)
    const clientSecret = decrypt(secret.encryptedClientSecret)
    const refreshToken = decrypt(secret.encryptedRefreshToken)

    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token"
    })

    const res = await fetch(`${process.env.ZOHO_OAUTH_URL}/token`, {
      method: "POST",
      body: params,
      cache: "no-cache"
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("fetchZohoToken refresh failed:", res.status, res.statusText, data)
      return { ok: false, error: "Failed to fetch Zoho access token" }
    }

    const accessToken = data.access_token as string
    const accessTokenExpiresAt = new Date(now + (data.expires_in - 60) * 1000)

    const updated = await db
      .update(zohoSecrets)
      .set({
        encryptedAccessToken: encrypt(accessToken),
        accessTokenExpiresAt,
        updatedAt: new Date()
      })
      .where(and(eq(zohoSecrets.id, secret.id), eq(zohoSecrets.updatedAt, secret.updatedAt)))
      .returning({ updatedAt: zohoSecrets.updatedAt })

    if (updated.length === 0) {
      const [refreshed] = await db
        .select()
        .from(zohoSecrets)
        .where(eq(zohoSecrets.id, secret.id))
        .limit(1)

      if (!refreshed) {
        return { ok: false, error: "Failed to fetch Zoho access token" }
      }

      return { ok: true, data: decrypt(refreshed.encryptedAccessToken) }
    }

    return { ok: true, data: accessToken }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to fetch Zoho access token" }
  }
}

export async function resetZohoToken(): Promise<ActionResult<void>> {
  await requireAdmin()

  try {
    await db.update(zohoSecrets).set({
      accessTokenExpiresAt: new Date(0),
      updatedAt: new Date()
    })

    return { ok: true, data: undefined }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to reset Zoho token" }
  }
}

export async function fetchCampaigns(): Promise<ActionResult<string[]>> {
  await requireUser()

  try {
    const tokenResult = await fetchZohoToken()
    if (!tokenResult.ok) return tokenResult

    const res = await fetch(
      `${process.env.ZOHO_API_URL}/settings/global_picklists/6968892000004029154`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${tokenResult.data}`
        },
        cache: "no-cache"
      }
    )

    const data = (await res.json()) as ZohoCampaignPicklistResponse

    if (!res.ok) {
      console.error("fetchCampaigns failed:", res.status, res.statusText, data)
      return { ok: false, error: "Failed to fetch campaigns" }
    }

    return {
      ok: true,
      data: data.global_picklists[0].pick_list_values
        .filter((value) => value.type === "used")
        .map((value) => value.display_value)
    }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to fetch campaigns" }
  }
}

export async function pushToZoho(
  contacts: ZohoItem[]
): Promise<ActionResult<{ pushed: number; results: ZohoResultItem[] }>> {
  try {
    if (contacts.length === 0) {
      return { ok: false, error: "No contacts selected to push" }
    }

    const tokenResult = await fetchZohoToken()
    if (!tokenResult.ok) return tokenResult

    const res = await fetch(`${process.env.ZOHO_API_URL}/Leads`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${tokenResult.data}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ data: contacts }),
      cache: "no-cache"
    })

    const rawBody = await res.text()

    let json: { data?: ZohoResultItem[] } | null = null

    try {
      json = JSON.parse(rawBody)
    } catch {
      // ignore parse failures
    }

    if (json?.data && Array.isArray(json.data)) {
      const results = json.data
      const pushed = results.filter((r) => r.status === "success").length

      return { ok: true, data: { pushed, results } }
    }

    if (!res.ok) {
      console.error("pushToZoho failed:", res.status, res.statusText, rawBody)
      return { ok: false, error: `Zoho API error: ${res.status} ${res.statusText}` }
    }

    return { ok: false, error: "Zoho returned an unexpected response" }
  } catch (error) {
    console.error("pushToZoho failed:", error)
    return { ok: false, error: "Failed to push contacts to Zoho" }
  }
}

export async function configureZohoSecrets(
  clientId: string,
  clientSecret: string,
  grantToken: string
): Promise<ActionResult<void>> {
  const actor = await requireAdmin()
  const trimmedClientId = clientId.trim()
  const trimmedClientSecret = clientSecret.trim()
  const trimmedGrantToken = grantToken.trim()

  if (!trimmedClientId || !trimmedClientSecret || !trimmedGrantToken) {
    return { ok: false, error: "All Zoho fields are required" }
  }

  try {
    const tokenResult = await fetchZohoTokensUsingGrantToken(
      trimmedClientId,
      trimmedClientSecret,
      trimmedGrantToken
    )

    if (!tokenResult.ok) return tokenResult

    const now = new Date()
    const [existing] = await db.select({ id: zohoSecrets.id }).from(zohoSecrets).limit(1)
    const values = {
      encryptedClientId: encrypt(trimmedClientId),
      encryptedClientSecret: encrypt(trimmedClientSecret),
      encryptedRefreshToken: encrypt(tokenResult.data.refreshToken),
      encryptedAccessToken: encrypt(tokenResult.data.accessToken),
      accessTokenExpiresAt: tokenResult.data.accessTokenExpiresAt,
      configuredById: actor.id,
      updatedAt: now
    }

    if (existing) {
      await db.update(zohoSecrets).set(values).where(eq(zohoSecrets.id, existing.id))
    } else {
      await db.insert(zohoSecrets).values({ ...values, createdAt: now })
    }

    return { ok: true, data: undefined }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to configure Zoho credentials" }
  }
}

export async function fetchZohoTokensUsingGrantToken(
  clientId: string,
  clientSecret: string,
  grantToken: string
): Promise<
  ActionResult<{
    accessToken: string
    refreshToken: string
    accessTokenExpiresAt: Date
  }>
> {
  await requireAdmin()

  try {
    const now = Date.now()
    const params = new URLSearchParams({
      code: grantToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code"
    })

    const res = await fetch(`${process.env.ZOHO_OAUTH_URL}/token`, {
      method: "POST",
      body: params,
      cache: "no-cache"
    })

    const data = await res.json()

    if (!res.ok || !data.access_token || !data.refresh_token) {
      console.error("fetchZohoTokensUsingGrantToken failed:", res.status, res.statusText, data)
      return { ok: false, error: "Failed to exchange Zoho grant token" }
    }

    return {
      ok: true,
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        accessTokenExpiresAt: new Date(now + (data.expires_in - 60) * 1000)
      }
    }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to exchange Zoho grant token" }
  }
}

export async function getZohoConfigurationStatus(): Promise<
  ActionResult<{ configured: boolean; updatedAt: Date | null }>
> {
  await requireAdmin()

  try {
    const [secret] = await db
      .select({ updatedAt: zohoSecrets.updatedAt })
      .from(zohoSecrets)
      .limit(1)

    return {
      ok: true,
      data: { configured: Boolean(secret), updatedAt: secret?.updatedAt ?? null }
    }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "Failed to load Zoho configuration status" }
  }
}
