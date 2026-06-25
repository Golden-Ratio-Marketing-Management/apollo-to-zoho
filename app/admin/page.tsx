import { AdminDashboard } from "@/lib/components/admin-dashboard"
import { listApolloAccountsAdmin } from "@/lib/actions/apollo"
import { listUsers } from "@/lib/actions/auth"
import { getZohoConfigurationStatus } from "@/lib/actions/zoho"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const user = await requireAdmin()
  const [accountsResult, usersResult, zohoResult] = await Promise.all([
    listApolloAccountsAdmin(),
    listUsers(),
    getZohoConfigurationStatus()
  ])

  if (!accountsResult.ok) throw new Error(accountsResult.error)
  if (!usersResult.ok) throw new Error(usersResult.error)
  if (!zohoResult.ok) throw new Error(zohoResult.error)

  return (
    <main>
      <AdminDashboard
        currentUser={user}
        initialAccounts={accountsResult.data}
        initialUsers={usersResult.data}
        zohoStatus={zohoResult.data}
      />
    </main>
  )
}
