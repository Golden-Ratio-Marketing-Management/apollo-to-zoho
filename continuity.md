# Project Continuity

## Purpose

This project is an internal Apollo-to-Zoho importer with local app authentication. It lets authenticated users choose an Apollo account, choose one of that account's contact lists, select a Zoho client campaign, pick qualifying contacts, and push those contacts into Zoho CRM.

All Apollo and Zoho API work must happen on the backend through server actions/server functions. API keys, Zoho credentials, tokens, and decrypted secrets should never be exposed to the browser.

## Current Stack

- Next.js `16.2.6` with App Router and React Server Components enabled.
- React `19.2.4`.
- Tailwind CSS v4.
- shadcn/ui using `base-nova`, Base UI primitives, and lucide icons.
- Drizzle ORM with libSQL/Turso.
- First-party email/password sessions stored in the database. Passwords are hashed with `scrypt`; session cookies contain random tokens and the database stores token hashes.

Important repo instruction: before writing Next-specific code, read the relevant local docs in `node_modules/next/dist/docs/` because this Next version may differ from older conventions.

## Product Decisions Confirmed

- The Apollo account display name comes from `apolloAccounts.account`; older references to `name` were a TODO mistake.
- Apollo list options should only include labels where `modality === "contacts"`.
- `APOLLO_API_URL` already includes the Apollo `/api/v1` base.
- Contacts are paginated.
- Default rows per page is `15`.
- User can choose up to `100` rows per page because Zoho accepts up to 100 rows per batch.
- Changing the Apollo account clears selected list, contacts, checked rows, and list/contact/push state.
- Changing the Apollo account does not clear the selected campaign.
- Changing the Apollo list clears contacts and checked rows.
- Apollo and Zoho operational failures should be shown inline with alerts/toasts.
- Unexpected server load failures can bubble to `app/error.tsx`.
- DaisyUI references in old notes are stale; prefer shadcn components and patterns.
- `/` is now login / first-admin bootstrap.
- `/admin` is admin-only management for Apollo keys, Zoho credentials, and users.
- `/importer` is the authenticated importer UI.
- `/api` redirects to `/admin` for compatibility, but is no longer the management route.
- The first admin can only be created while no admin exists and requires `BOOTSTRAP_ADMIN_TOKEN`.
- `BOOTSTRAP_ADMIN_TOKEN` is temporary and can be removed after first admin creation.
- If the only admin password is forgotten, use `npm run admin:reset -- admin@example.com new-temporary-password`.
- Admins can create/revoke users and configure secrets.
- Users can only use the importer.
- Apollo API keys are associated to the admin that created them through `apolloAccounts.adminId`.
- Zoho Client ID, Client Secret, refresh token, and access token are encrypted in the DB. The grant token is exchanged and not stored.
- Secret encryption uses AES-256-GCM with `SECRET_KEY` as the root key material.
- Audit rows are written for sign-in, first-admin bootstrap, user creation/revocation, Apollo account creation/removal, Zoho configuration, Zoho pushes, and reset-script password resets.

## Contact Rules

Rows qualify for selection only when all of these exist:

- `first_name`
- `last_name`
- primary `email`

The table displays Apollo's primary `name` when present, falling back to first and last name.

Checkbox identity should use the Apollo contact `id`.

The header checkbox should only select or deselect qualifying contacts on the current page.

Checked contacts are currently tracked by id and can persist across pages.

## Apollo to Zoho Mapping

Required Zoho fields:

- `First_Name`: Apollo `first_name`
- `Last_Name`: Apollo `last_name`
- `Lead_Source`: `"Apollo.io"`
- `Lead_Status`: `"Not Contacted"`
- `Client_Campaign`: selected campaign
- `Email`: Apollo primary `email`

Optional Zoho fields should only be included when source values exist:

- `Designation`: Apollo `title`
- `Mobile`: Apollo `sanitized_phone` or first usable phone number
- `Alternate_Number`: additional phone number when available
- `LinkedIn_Profile`: Apollo `linkedin_url`
- `Company`: Apollo `organization_name` or `organization.name`
- `Website`: Apollo `organization.website_url`
- `Company_LinkedIn_Profile`: Apollo `organization.linkedin_url`
- `Personal_Email`: an Apollo `contact_emails` value that is not the primary `email`

## Key Files

- `app/page.tsx`: login or first-admin bootstrap.
- `app/admin/page.tsx`: admin management page.
- `app/importer/page.tsx`: loads Apollo accounts and renders the importer.
- `app/api/page.tsx`: redirects to `/admin`.
- `app/error.tsx`: unexpected error boundary UI.
- `lib/actions.ts`: Apollo list/contact actions, Zoho campaign/token/push actions.
- `lib/actions/auth.ts`: sign in/out, first-admin bootstrap, user creation/revocation, user listing.
- `lib/actions/apollo-accounts.ts`: add, remove, and list Apollo accounts.
- `lib/auth.ts`: current-user/session helpers and route/action authorization helpers.
- `lib/passwords.ts`: password hashing and verification.
- `lib/audit.ts`: audit log writer.
- `lib/components/auth-forms.tsx`: login and bootstrap UI.
- `lib/components/admin-dashboard.tsx`: admin page UI.
- `lib/components/importer.tsx`: main client importer workflow.
- `lib/components/contacts-table.tsx`: contact table and checkbox behavior.
- `lib/components/contacts-pagination.tsx`: paginated navigation.
- `lib/components/option-select.tsx`: shared select wrapper.
- `lib/components/apollo-accounts-manager.tsx`: `/api` page client UI.
- `lib/contacts.ts`: Apollo normalization, row qualification, Zoho payload conversion.
- `lib/db/schema.ts`: `apolloAccounts` schema.
- `scripts/reset-admin-password.ts`: server-side admin password reset script.
- `lib/db/index.ts`: shared Drizzle database instance.
- `lib/crypto.ts`: Apollo API key encryption/decryption.

## Current Health Notes

- Working tree was clean before this continuity note was added.
- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes when network access is available for the configured Google font.
- The shadcn CLI registry lookup requires network access and failed under the sandbox. Local `components.json` and installed component source are usable for project context.

## Implementation Preferences

- Keep code modular.
- Put reusable components in `lib/components/`.
- Reuse the shared Drizzle instance from `lib/db/index.ts`.
- Reuse existing Zoho actions instead of creating separate API wrappers.
- Use server actions/server functions for backend work.
- Use client components only where browser interactivity is required.
- Preserve user changes and avoid unrelated refactors.
