"use server"

import { ZohoCampaignPicklistResponse, ZohoItem } from "./types"

let zohoAccessToken: string | null = null
let expiresAt = 0

export async function fetchZohoToken() {
  const now = Date.now()

  if (zohoAccessToken && now < expiresAt) {
    return {
      ok: true,
      data: zohoAccessToken
    }
  }

  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    client_id: process.env.ZOHO_CLIENT_ID!,
    client_secret: process.env.ZOHO_CLIENT_SECRET!,
    grant_type: "refresh_token"
  })

  const res = await fetch(`${process.env.ZOHO_OAUTH_URL}/token`, {
    method: "POST",
    body: params,
    cache: "no-cache"
  })

  const data = await res.json()

  if (!res.ok) {
    return {
      ok: false,
      error: "Failed to fetch access token"
    }
  }

  zohoAccessToken = data.access_token
  expiresAt = now + (data.expires_in - 60) * 1000

  return {
    ok: true,
    data: zohoAccessToken
  }
}

export async function fetchCampaigns() {
  const accessToken = await fetchZohoToken()

  const res = await fetch(
    `${process.env.ZOHO_API_URL}/settings/global_picklists/6968892000004029154`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`
      }
    }
  )

  if (!res.ok) {
    return {
      ok: false,
      error: "Failed to fetch campaigns"
    }
  }

  const data = await res.json() as ZohoCampaignPicklistResponse

  return {
    ok: true,
    data: data.global_picklists[0].pick_list_values
      .filter((v) => v.type === "used")
      .map((v) => v.display_value)
  }
}

export async function pushToZoho(contacts: ZohoItem[]) {
  const accessToken = await fetchZohoToken()

  const res = await fetch(`${process.env.ZOHO_API_URL}/Leads/upsert`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`
    },
    body: JSON.stringify({ data: contacts }),
    method: "POST"
  })

  if (!res.ok) {
    return {
      ok: false,
      error: "Failed to push to Zoho"
    }
  }

  return {
    ok: true
  }
}