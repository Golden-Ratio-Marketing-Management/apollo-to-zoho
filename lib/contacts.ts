import type { ApolloContactRaw, NormalizedContact, ZohoItem } from "@/lib/types"

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
    alternatePhone: phones[1],
    organizationName:
      contact.organization_name?.trim() || contact.organization?.name?.trim() || undefined,
    organizationWebsite: contact.organization?.website_url?.trim() || undefined,
    organizationLinkedin: contact.organization?.linkedin_url?.trim() || undefined,
    personalEmail: extractPersonalEmail(contact)
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
  if (contact.organizationName) item.Company = contact.organizationName
  if (contact.organizationWebsite) item.Website = contact.organizationWebsite
  if (contact.organizationLinkedin) {
    item.Company_LinkedIn_Profile = contact.organizationLinkedin
  }

  return item
}
