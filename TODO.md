# Apollo to Zoho Importer

## Purpose

This project is for pulling records from Apollo.io accounts into Zoho CRM via APIs provided by each respectively.

## Rules

- The project will only have a single page.
- Use DaisyUI classes whenever possible. DaisyUI is already configured in the project. Use Tailwind classes only where DaisyUI does not cover the requirement.
- Always provide clear UI feedback for async operations:
  - loading state
  - success state
  - error state
- A shared Drizzle database instance is already exported from `lib/db/index.ts`. Reuse it throughout the project instead of creating new instances.
- Apollo API requests must target `${process.env.APOLLO_API_URL}` with these headers:
  ```typescript
    {
        "Cache-Control": "no-cache"
        "Content-Type": "application/json"
        "accept": "application/json"
        "x-api-key": decryptedApiKey
    }
  ```
- The Apollo API key already exists in the database:
  - query it using Drizzle
  - schema definitions are in `lib/db/schema.ts`
  - decrypt `encrypted_key` using `decrypt()` from `lib/crypto.ts`
  - `SECRET_KEY` is already available in `.env` and loaded so don't worry about that.
- Zoho API integrations are already implemented in `lib/actions.ts`. Reuse those actions instead of creating new API wrappers.
- Existing server actions should be standardized:
  - wrap logic in `try/catch`
  - return one of the following shapes:
    - `{ ok: true, data?: ... }`
    - `{ ok: false, error: string }`
  - Decide intentionally which errors should:
    - be handled locally in the UI
    - bubble to error.tsx
- If error.tsx does not exist, create a minimal implementation.
- Reset dependent form/input state whenever the parent input changes.
  - Example: if `city` depends on `state`, changing `state` should clear `city`.
- Keep the codebase modular:
  - components → `lib/components/`
  - contexts → `lib/contexts/`
  - shared utilities → `lib/utils.ts`
- Avoid oversized components or files. Prefer small reusable modules.
- Only introduce React context where necessary. If used, wire it through the root layout.
- All interactions with the APi will have on the backend, never on the frontend. Use server actions/server functions wherever applicable.

## Goals

### Page Layout

- In `page.tsx`, render a single horizontal flex row containing:
  - Apollo Account select
  - Apollo List select
  - Client Campaign select
  - Push to Zoho button
- Render the contacts table below this row.
- The table should only render after a list has been selected.

---

### Apollo Account select

#### Initial Data Fetch

- Fetch Apollo accounts using Drizzle and the schema from `lib/db/schema.ts`.
- Query only:
  - id
  - name
- Transform the results based on `SelectOption` interface found in `lib/types.ts` where:
  - id = id assigned by db
  - label = account name

#### On Account Selection

When an account is selected:

- Query the database again using the selected account id.
- Fetch `encrypted_key`
- Decrypt the key using `decrypt()` from `lib/crypto.ts`
- Make a request to Apollo's `/labels` endpoint.
- Use the standard Apollo headers defined earlier.
- Expect the response shape documented here: `https://docs.apollo.io/reference/get-a-list-of-all-lists`
- Transform the results based on `SelectOption` interface found in `lib/types.ts` where:
  - id = Apollo list id
  - label = Apollo list name

#### State Reset Rules

When the selected Apollo account changes:

- clear selected list
- clear contacts
- clear checked rows
- clear loading/error/success states tied to lists or contacts

---

### Apollo List Select

Populate this dropdown using the transformed Apollo labels array.

#### On List Selection

- Make a request to Apollo's /contacts/search endpoint.
- Use the required Apollo headers and request body.
- Expect the response shape documented here `https://docs.apollo.io/reference/search-for-contacts`

#### Contacts Transformation

Transform the response into data suitable for:

- Rendering a table with columns:
  - row checkbox
  - Name
  - Email
- Zoho Submission. Do not immediately transform contacts into Zoho payloads. Instead:
  - store raw/normalized contact data in state
  - only prepare `ZohoItem[]` when the user clicks `Push to Zoho`.
- When building `ZohoItem`:
  - follow the interface exported from `lib/types.ts`
  - optional fields should only be added if values exist

#### State Reset Rules

When the selected list changes:

- clear all rows
- clear checked rows state
- clear any other relevant state

---

### Client Campaign Select

- Populate this dropdown using `fetchCampaigns()` from `lib/actions.ts`
- The action already returns a string array.
- Use the returned values directly as dropdown options (both for label and value).
- Track the selected campaign in state

---

### Push to Zoho Button

#### Enable/Disable Rules

The button must remain disabled until all of the following are true:

- an Apollo account is selected
- an Apollo list is selected
- a campaign is selected
- at least one qualifying row is checked

#### Row Qualification Rules

A row only qualifies for selection if:

- name exists
- email exists

##### Behavior requirements:

- non-qualifying rows cannot be checked
- the header "select all" checkbox should only toggle all qualifying rows
- checked row ids must be tracked in state

#### On Click

- Filter out all non-qualifying contacts.
- Only include checked rows.
- Transform the filtered contacts into `ZohoItem[]`.
- Add optional fields conditionally.
- Send the transformed array to `pushToZoho()` from `lib/actions.ts`

---

### Contacts Table

- Render the table only after a list has been selected.
- Include:
  - header checkbox
  - row checkbox
  - Name column
  - Email column

#### Checkbox Rules

Individual row checkboxes:

- enabled only for qualifying rows
- disabled otherwise

Header checkbox:

- only selects/deselects qualifying rows
- should reflect checked state correctly

### Empty States

Gracefully, in the ui, handle:

- no contacts found
- contacts loading
- contacts request failure
