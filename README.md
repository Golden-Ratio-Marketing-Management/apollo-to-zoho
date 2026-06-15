# Apollo to Zoho Importer

A secure internal application designed to sync contacts from **Apollo.io** to **Zoho CRM**. The application is built with React Server Components using Next.js, Tailwind CSS v4, shadcn/ui, and Drizzle ORM (using libSQL/Turso). 

All API operations run strictly on the backend via server actions to ensure credentials (such as encrypted API keys and access tokens) are never exposed to the client.

---

## Prerequisites

Ensure you have the following installed on your local environment:
- **Node.js** (v18.x or v20.x recommended)
- **npm** (comes with Node.js)
- A running **libSQL/Turso** database instance (or a local SQLite setup)

---

## Getting Started

### 1. Clone & Install Dependencies

Clone this repository and install the required dependencies:

```bash
git clone <repository-url>
cd apollo-to-zoho
npm install
```

### 2. Configure Environment Variables

Create your local environment file by copying the example:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure the following variables:

```env
# Database Credentials
DATABASE_URL=libsql://your-database-url-here
DATABASE_AUTH_TOKEN=your-turso-auth-token-here

# API Base URLs
# (Note: APOLLO_API_URL should include the `/api/v1` suffix)
APOLLO_API_URL=https://api.apollo.io/v1
ZOHO_API_URL=https://www.zohoapis.com
ZOHO_OAUTH_URL=https://accounts.zoho.com

# Cryptography (Used to encrypt/decrypt Apollo & Zoho credentials in the DB)
# Must be a 32-byte (64 hexadecimal characters) key for AES-256-GCM.
SECRET_KEY=your-32-byte-hexadecimal-secret-key-here

# Bootstrap Admin Configuration
# Temporary token used to authenticate the creation of the very first admin account.
BOOTSTRAP_ADMIN_TOKEN=your-temporary-bootstrap-token
```

> **Security Note:** Keep the `SECRET_KEY` safe. If it is lost, any existing Apollo API keys and Zoho client secrets saved in the database can no longer be decrypted.

### 3. Initialize the Database

Apply the database schema to your Turso/libSQL database using Drizzle:

```bash
# Push your local schema to the database
npx drizzle-kit push
```

### 4. Run the Development Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## First-Time Administrator Bootstrap

Since this application uses local credentialed sessions, you must bootstrap the first administrator account:

1. Go to the root path `/` of the application (if no admin accounts exist, you will see the bootstrap page).
2. Enter your desired administrator email and password.
3. Provide the `BOOTSTRAP_ADMIN_TOKEN` that you configured in your `.env.local` file.
4. Once created, you can log in as the Administrator.
5. **Security Practice:** You may safely remove or comment out `BOOTSTRAP_ADMIN_TOKEN` from your `.env.local` file after this step.

---

## Administration & Import Workflows

- **`/` (Login / Bootstrap):** Used to log into your account.
- **`/admin` (Admin Control Panel):** Where administrators add/manage Apollo API Keys, configure Zoho Client Credentials, and invite or revoke standard user accounts.
- **`/importer` (Data Importer Dashboard):** Where authorized users select their Apollo account and contact list, view and filter qualified contacts, choose a Zoho client campaign, and batch-push records securely to Zoho CRM.

---

## Available NPM Scripts

- `npm run dev` - Runs the Next.js development server.
- `npm run build` - Builds the application for production.
- `npm run lint` - Lints the codebase for code quality issues.
- `npx tsc --noEmit` - Typechecks the TypeScript codebase.

### Resetting Admin Password

If you lose access to the sole administrator account, you can reset its password using the secure CLI fallback script:

```bash
npm run admin:reset -- admin@example.com new-temporary-password
```

---

## Mapping Reference (Apollo ➔ Zoho)

The importer only allows syncs for contacts possessing a **First Name**, **Last Name**, and a **Primary Email**.

| Zoho Field | Apollo Source Field | Type |
| :--- | :--- | :--- |
| `First_Name` | `first_name` | Required |
| `Last_Name` | `last_name` | Required |
| `Lead_Source` | Constant: `"Apollo.io"` | Required |
| `Lead_Status` | Constant: `"Not Contacted"` | Required |
| `Client_Campaign` | Selected Campaign | Required |
| `Email` | Primary `email` | Required |
| `Designation` | `title` | Optional |
| `Mobile` | `sanitized_phone` or first available | Optional |
| `Alternate_Number` | Secondary phone numbers | Optional |
| `LinkedIn_Profile` | `linkedin_url` | Optional |
| `Company` | `organization_name` or `organization.name` | Optional |
| `Website` | `organization.website_url` | Optional |
| `Company_LinkedIn` | `organization.linkedin_url` | Optional |
| `Personal_Email` | Secondary non-primary email | Optional |
