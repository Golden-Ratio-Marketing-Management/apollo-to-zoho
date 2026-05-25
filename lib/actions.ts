"use server"

import { eq } from "drizzle-orm"
import { decrypt } from "@/lib/crypto"
import { normalizeApolloContact } from "@/lib/contacts"
import {
  APOLLO_CONTACT_MODALITY,
  MAX_ZOHO_BATCH,
} from "@/lib/constants"
import { db } from "@/lib/db"
import { apolloAccounts } from "@/lib/db/schema"
import type {
  ActionResult,
  ApolloContactRaw,
  ApolloLabel,
  ContactsPage,
  SelectOption,
  ZohoCampaignPicklistResponse,
  ZohoGrantResult,
  ZohoItem,
} from "@/lib/types"

let zohoAccessToken: string | null = null
let expiresAt = 0

function apolloHeaders(apiKey: string) {
  return {
    "Cache-Control": "no-cache",
    "Content-Type": "application/json",
    accept: "application/json",
    "x-api-key": apiKey,
  }
}

async function getApolloApiKey(
  accountId: string,
): Promise<ActionResult<string>> {
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
  } catch {
    return { ok: false, error: "Failed to load Apollo account credentials" }
  }
}

export async function fetchApolloAccounts(): Promise<
  ActionResult<SelectOption[]>
> {
  try {
    const rows = await db
      .select({
        id: apolloAccounts.id,
        account: apolloAccounts.account,
      })
      .from(apolloAccounts)

    return {
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        label: row.account,
      })),
    }
  } catch {
    return { ok: false, error: "Failed to load Apollo accounts" }
  }
}

export async function fetchApolloLists(
  accountId: string,
): Promise<ActionResult<SelectOption[]>> {
  try {
    const keyResult = await getApolloApiKey(accountId)
    if (!keyResult.ok) return keyResult

    const res = await fetch(`${process.env.APOLLO_API_URL}/labels`, {
      headers: apolloHeaders(keyResult.data),
      cache: "no-cache",
    })

    if (!res.ok) {
      return { ok: false, error: "Failed to load Apollo lists" }
    }

    const labels = (await res.json()) as ApolloLabel[]

    return {
      ok: true,
      data: labels
        .filter((label) => label.modality === APOLLO_CONTACT_MODALITY)
        .map((label) => ({
          id: label.id,
          label: label.name,
        })),
    }
  } catch {
    return { ok: false, error: "Failed to load Apollo lists" }
  }
}

export async function fetchApolloContacts(
  accountId: string,
  listId: string,
  page: number,
  perPage: number,
): Promise<ActionResult<ContactsPage>> {
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
        per_page: perPage,
      }),
    })

    if (!res.ok) {
      return { ok: false, error: "Failed to load contacts" }
    }

    const data = (await res.json()) as {
      contacts: ApolloContactRaw[]
      pagination: {
        page: number
        per_page: number
        total_entries: number
        total_pages: number
      }
    }

    return {
      ok: true,
      data: {
        contacts: (data.contacts ?? []).map(normalizeApolloContact),
        pagination: {
          page: data.pagination.page,
          perPage: data.pagination.per_page,
          totalEntries: data.pagination.total_entries,
          totalPages: data.pagination.total_pages,
        },
      },
    }
  } catch {
    return { ok: false, error: "Failed to load contacts" }
  }
}

export async function fetchZohoTokensUsingGrantToken(grantToken:string) {
  try {
    const formData = new FormData();

    formData.append("client_id", process.env.ZOHO_CLIENT_ID!);
    formData.append("client_secret", process.env.ZOHO_CLIENT_SECRET!);
    formData.append("redirect_uri", process.env.BASE_URL!);
    formData.append("code", grantToken);
    formData.append("grant_type", "authorization_code");

    const res = await fetch(`${process.env.ZOHO_OAUTH_URL}/token`, {
      method: "POST",
      body: formData,
      cache: "no-cache",
    })

    const data = await res.json()

    if (!res.ok) {
      return { ok: false, error: "Failed to fetch Zoho access token using grant token" }
    }

    const result:ZohoGrantResult = data

    const accessToken = result.access_token
    const refreshToken = result.refresh_token
    const scope = result.scope

    return { ok: true, data: { accessToken, refreshToken, expiresAt, scope } }
  } catch {
    return { ok: false, error: "Failed to fetch Zoho access token using grant token" }
  }
}

export async function fetchZohoToken(): Promise<ActionResult<string>> {
  try {
    const now = Date.now()

    if (zohoAccessToken && now < expiresAt) {
      return { ok: true, data: zohoAccessToken }
    }

    const params = new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      grant_type: "refresh_token",
    })

    const res = await fetch(`${process.env.ZOHO_OAUTH_URL}/token`, {
      method: "POST",
      body: params,
      cache: "no-cache",
    })

    const data = await res.json()

    if (!res.ok) {
      return { ok: false, error: "Failed to fetch Zoho access token" }
    }

    const accessToken = data.access_token as string
    zohoAccessToken = accessToken
    expiresAt = now + (data.expires_in - 60) * 1000

    return { ok: true, data: accessToken }
  } catch {
    return { ok: false, error: "Failed to fetch Zoho access token" }
  }
}

export async function fetchCampaigns(): Promise<ActionResult<string[]>> {
  try {
    const tokenResult = await fetchZohoToken()
    if (!tokenResult.ok) return tokenResult

    const res = await fetch(
      `${process.env.ZOHO_API_URL}/settings/global_picklists/6968892000004029154`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${tokenResult.data}`,
        },
        cache: "no-cache",
      },
    )

    if (!res.ok) {
      return { ok: false, error: "Failed to fetch campaigns" }
    }

    const data = (await res.json()) as ZohoCampaignPicklistResponse

    return {
      ok: true,
      data: data.global_picklists[0].pick_list_values
        .filter((value) => value.type === "used")
        .map((value) => value.display_value),
    }
  } catch {
    return { ok: false, error: "Failed to fetch campaigns" }
  }
}

async function pushZohoBatch(
  accessToken: string,
  contacts: ZohoItem[],
): Promise<ActionResult> {
  const res = await fetch(`${process.env.ZOHO_API_URL}/Leads/upsert`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: contacts }),
    cache: "no-cache",
  })

  if (!res.ok) {
    return { ok: false, error: "Failed to push contacts to Zoho" }
  }

  return { ok: true, data: undefined }
}

export async function pushToZoho(
  contacts: ZohoItem[],
): Promise<ActionResult<{ pushed: number }>> {
  try {
    if (contacts.length === 0) {
      return { ok: false, error: "No contacts selected to push" }
    }

    const tokenResult = await fetchZohoToken()
    if (!tokenResult.ok) return tokenResult

    for (let index = 0; index < contacts.length; index += MAX_ZOHO_BATCH) {
      const batch = contacts.slice(index, index + MAX_ZOHO_BATCH)
      const result = await pushZohoBatch(tokenResult.data, batch)
      if (!result.ok) return result
    }

    return { ok: true, data: { pushed: contacts.length } }
  } catch {
    return { ok: false, error: "Failed to push contacts to Zoho" }
  }
}
