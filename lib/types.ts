export interface ZohoItem {
  First_Name: string
  Last_Name: string
  Lead_Source: "Apollo.io"
  Lead_Status: "Not Contacted"
  Client_Campaign: string
  Email: string
  Personal_Email?: string
  Designation?: string
  Mobile?: string
  Alternate_Number?: string
  LinkedIn_Profile?: string
  Company?: string
  Website?: string
  Company_LinkedIn_Profile?: string
}

export interface ZohoTokenResponse {
  access_token: string
  scope: string
  api_domain: string
  token_type: string
  expires_in: number
}

export interface ZohoCampaignPicklistResponse {
  global_picklists: {
    created_time: string
    customizable: boolean
    description: string | null
    pick_list_values_sorted_lexically: boolean
    source: string
    created_by: {
      name: string
      id: string
    }
    display_label: string
    modified_time: string
    api_name: string
    modified_by: {
      name: string
      id: string
    }
    id: string
    presence: boolean
    actual_label: string
    pick_list_values: {
      display_value: string
      sequence_number: number
      reference_value: string
      actual_value: string
      id: string
      type: "used" | "unused"
    }[]
  }[]
}

export interface SelectOption {
  id: string
  label: string
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export interface ApolloLabel {
  id: string
  name: string
  modality: string
}

export interface ApolloContactEmail {
  email?: string | null
}

export interface ApolloPhoneNumber {
  sanitized_number?: string | null
  raw_number?: string | null
}

export interface ApolloContactRaw {
  id: string
  first_name?: string | null
  last_name?: string | null
  name?: string | null
  email?: string | null
  title?: string | null
  linkedin_url?: string | null
  sanitized_phone?: string | null
  organization_name?: string | null
  contact_emails?: ApolloContactEmail[]
  phone_numbers?: ApolloPhoneNumber[]
  organization?: {
    website_url?: string | null
    linkedin_url?: string | null
    name?: string | null
  } | null
}

export interface NormalizedContact {
  id: string
  displayName: string
  firstName: string
  lastName: string
  email: string
  title?: string
  linkedinUrl?: string
  sanitizedPhone?: string
  alternatePhone?: string
  organizationName?: string
  organizationWebsite?: string
  organizationLinkedin?: string
  personalEmail?: string
}

export interface ContactsPage {
  contacts: NormalizedContact[]
  pagination: {
    page: number
    perPage: number
    totalEntries: number
    totalPages: number
  }
}
