function titleCase(value) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function extractPhoneNumbers(contact) {
  const seen = new Set()
  const options = []

  const addOption = (value, label) => {
    const trimmed = value?.trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    options.push({ label, value: trimmed })
  }

  const workHqNumbers = new Set(
    (contact.phone_numbers ?? [])
      .filter((phone) => phone.type === "work_hq")
      .map(
        (phone) => phone.sanitized_number?.trim() || phone.raw_number?.trim()
      )
      .filter(Boolean)
  )

  if (contact.sanitized_phone?.trim()) {
    const value = contact.sanitized_phone.trim()
    if (!workHqNumbers.has(value)) {
      addOption(value, `Primary · ${value}`)
    }
  }

  for (const phone of contact.phone_numbers ?? []) {
    if (phone.type === "work_hq") continue

    const value = phone.sanitized_number?.trim() || phone.raw_number?.trim()
    if (!value) continue
    const typeLabel = phone.type ? titleCase(phone.type) : "Other"
    addOption(value, `${typeLabel} · ${value}`)
  }

  return options
}

const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "gmx.net",
  "zoho.com",
  "mail.com",
  "yandex.com",
  "qq.com",
  "163.com",
  "126.com"
])

function isPublicDomainEmail(email) {
  const domain = email.split("@")[1]?.toLowerCase()
  return !!domain && PUBLIC_EMAIL_DOMAINS.has(domain)
}

function extractEmails(contact) {
  const seen = new Set()
  const options = []

  const addOption = (value, label) => {
    const trimmed = value?.trim()
    if (!trimmed || seen.has(trimmed)) return
    if (isPublicDomainEmail(trimmed)) return
    seen.add(trimmed)
    options.push({ label, value: trimmed })
  }

  const primary = contact.email?.trim()
  if (primary) {
    addOption(primary, `Work · ${primary}`)
  }

  for (const entry of contact.contact_emails ?? []) {
    const value = entry.email?.trim()
    if (!value) continue
    addOption(
      value,
      value === primary ? `Work · ${value}` : `Personal · ${value}`
    )
  }

  return options
}

export function normalizeApolloContact(contact) {
  const firstName = contact.first_name?.trim() ?? ""
  const lastName = contact.last_name?.trim() ?? ""
  const phoneNumbers = extractPhoneNumbers(contact)
  const emails = extractEmails(contact)

  const displayName =
    contact.name?.trim() ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "—"

  return {
    id: contact.id,
    displayName,
    firstName,
    lastName,
    emails,
    title: contact.title?.trim() || undefined,
    linkedinUrl: contact.linkedin_url?.trim() || undefined,
    phoneNumbers,
    orgID: contact.account?.id,
    orgName: contact.account?.name?.trim() || undefined,
    orgWebsite: contact.account?.website_url?.trim() || undefined,
    orgLinkedin: contact.account?.linkedin_url?.trim() || undefined,
    orgCountry: contact.account?.country,
    checked: false
  }
}

export function contactToZohoItem(
  contact = {},
  campaign = "",
  ownerEmail = "",
  selected = {},
  org = {}
) {
  const emails = contact.emails ?? []
  const phoneNumbers = contact.phoneNumbers ?? []

  const otherEmails = emails
    .map((entry) => entry.value)
    .filter(
      (value) =>
        value &&
        value !== selected?.officialEmail &&
        value !== selected?.personalEmail
    )

  const otherNumbers = phoneNumbers
    .map((entry) => entry.value)
    .filter(
      (value) =>
        value && value !== selected?.mobile && value !== selected?.altNumber
    )

  const item = {
    First_Name: contact.firstName,
    Last_Name: contact.lastName,
    Lead_Source: "Apollo.io",
    Lead_Status: "Untouched",
    Client_Campaign: campaign,
    Owner: {
      email: ownerEmail
    }
  }

  if (selected?.officialEmail) item.Email = selected.officialEmail
  if (selected?.mobile) item.Mobile = selected.mobile
  if (selected?.altNumber) item.Alternate_Number = selected.altNumber

  if (otherEmails.length) item.Other_Emails = otherEmails.join("\n")
  if (otherNumbers.length) item.Other_Numbers = otherNumbers.join("\n")

  if (contact.title) item.Designation = contact.title
  if (contact.linkedinUrl) item.LinkedIn_Profile = contact.linkedinUrl
  if (contact.orgName) item.Company = contact.orgName
  if (contact.orgWebsite) item.Website = contact.orgWebsite
  if (contact.orgLinkedin) item.Company_LinkedIn_Profile = contact.orgLinkedin
  if (contact.orgCountry) item.Country = contact.orgCountry
  if (org.orgIndustry) item.Industry = org.orgIndustry
  if (org.orgSizeRange) item.Company_Size_Range = org.orgSizeRange

  return item
}

export function employeeCountToRange(count) {
  if (count == null) return
  if (count <= 10) return "1-10 employees"
  if (count <= 50) return "11-50 employees"
  if (count <= 200) return "51-200 employees"
  if (count <= 500) return "201-500 employees"
  return "500+ employees"
}

function classifyZohoItem(item) {
  if (!item) {
    return { status: "error", errors: ["No response from Zoho for this row"] }
  }

  if (item.status === "success") {
    return { status: "success", errors: undefined }
  }

  if (item.code === "DUPLICATE_DATA") {
    const field = item.details?.api_name ?? "a field"
    const existingId = item.details?.id

    return {
      status: "duplicate",
      errors: [
        `Duplicate ${field} — matches existing record${existingId ? ` ${existingId}` : ""}`
      ],
      existingRecordId: existingId
    }
  }

  const field = item.details?.api_name
  return {
    status: "error",
    errors: [
      field
        ? `${item.message ?? item.code} (${field})`
        : (item.message ?? item.code ?? "Push failed")
    ]
  }
}

export function mapZohoPushResults(rows, zohoResults) {
  const resolved = new Map()
  let successCount = 0
  let errorCount = 0
  let duplicateCount = 0

  if (zohoResults.length !== rows.length) {
    rows.forEach((row) => {
      errorCount++
      resolved.set(row.id, {
        status: "error",
        errors: [
          "Zoho returned a mismatched result count — could not confirm this row's status"
        ],
        checked: true
      })
    })
    return { resolved, successCount, errorCount, duplicateCount }
  }

  rows.forEach((row, i) => {
    const classified = classifyZohoItem(zohoResults[i])

    if (classified.status === "success") {
      successCount++
      resolved.set(row.id, { ...classified, checked: false })
    } else {
      if (classified.status === "duplicate") duplicateCount++
      else errorCount++
      resolved.set(row.id, { ...classified, checked: true })
    }
  })

  return { resolved, successCount, errorCount, duplicateCount }
}

export function normalizeZohoInsertResponse(result) {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.data)) return result.data
  return null
}
