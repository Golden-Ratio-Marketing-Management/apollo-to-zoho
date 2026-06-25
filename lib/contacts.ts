import type { ApolloContactRaw, NormalizedContact, ZohoItem, ZohoResultItem } from "@/lib/types"

function extractPhoneNumbers(contact: ApolloContactRaw): string[] {
  const numbers: string[] = []

  if (contact.sanitized_phone?.trim()) {
    numbers.push(contact.sanitized_phone.trim())
  }

  for (const phone of contact.phone_numbers ?? []) {
    const value = phone.sanitized_number?.trim() || phone.raw_number?.trim()
    if (value && !numbers.includes(value)) {
      numbers.push(value)
    }
  }

  return numbers
}

function extractPersonalEmail(contact: ApolloContactRaw): string | undefined {
  const primary = contact.email?.trim()
  const emails = (contact.contact_emails ?? [])
    .map((entry) => entry.email?.trim())
    .filter((value): value is string => Boolean(value))

  const alternate = emails.find((value) => value !== primary)
  return alternate
}

export function normalizeApolloContact(contact: ApolloContactRaw): NormalizedContact {
  const firstName = contact.first_name?.trim() ?? ""
  const lastName = contact.last_name?.trim() ?? ""
  const email = contact.email?.trim() ?? ""
  const phones = extractPhoneNumbers(contact)

  const displayName = contact.name?.trim() || [firstName, lastName].filter(Boolean).join(" ") || "—"

  return {
    id: contact.id,
    displayName,
    firstName,
    lastName,
    email,
    title: contact.title?.trim() || undefined,
    linkedinUrl: contact.linkedin_url?.trim() || undefined,
    sanitizedPhone: contact.sanitized_phone || undefined,
    alternatePhone: phones?.[1],
    orgID: contact.account?.id,
    orgName: contact.account?.name?.trim() || undefined,
    orgWebsite: contact.account?.website_url?.trim() || undefined,
    orgLinkedin: contact.account?.linkedin_url?.trim() || undefined,
    orgCountry: contact.account?.country,
    personalEmail: extractPersonalEmail(contact),
    checked: false
  }
}

export function isQualifyingContact(contact: NormalizedContact): boolean {
  return Boolean(contact.firstName.trim() && contact.lastName.trim())
}

export function contactToZohoItem(
  contact: NormalizedContact,
  campaign: string,
  email: string
): ZohoItem {
  const item: ZohoItem = {
    First_Name: contact.firstName,
    Last_Name: contact.lastName,
    Lead_Source: "Apollo.io",
    Lead_Status: "Not Contacted",
    Client_Campaign: campaign,
    Email: contact.email,
    Owner: {
      email
    }
  }

  if (contact.personalEmail) item.Personal_Email = contact.personalEmail
  if (contact.title) item.Designation = contact.title
  if (contact.sanitizedPhone) item.Mobile = contact.sanitizedPhone
  if (contact.alternatePhone) item.Alternate_Number = contact.alternatePhone
  if (contact.linkedinUrl) item.LinkedIn_Profile = contact.linkedinUrl
  if (contact.orgName) item.Company = contact.orgName
  if (contact.orgWebsite) item.Website = contact.orgWebsite
  if (contact.orgLinkedin) item.Company_LinkedIn_Profile = contact.orgLinkedin
  if (contact.orgCountry) item.Country = contact.orgCountry
  if (contact.orgIndustry) item.Industry = contact.orgIndustry
  if (contact.orgSizeRange) item.Company_Size_Range = contact.orgSizeRange

  return item
}

export function getZohoRowErrors(item: ZohoResultItem): string[] {
  if (item.status === "success") return []

  if (item.code === "MULTIPLE_OR_MULTI_ERRORS" && item.details.errors?.length) {
    const hasDuplicate = item.details.errors.some((e) => e.code === "DUPLICATE_DATA")

    if (hasDuplicate) {
      return ["Ignored (Exists in CRM)"]
    }

    return item.details.errors.map((e) => {
      const field = e.details.api_name ?? "Unknown field"
      return `${field}: ${e.message}`
    })
  }

  const field = item.details.api_name
  if (field) {
    if (item.code === "DUPLICATE_DATA") return ["Ignored (Exists in CRM)"]
    return [`${field}: ${item.message}`]
  }

  return [item.message ?? "Unknown error"]
}
