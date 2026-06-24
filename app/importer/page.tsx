import { redirect } from "next/navigation"
import { Importer } from "@/lib/components/importer"
import { Alert, AlertDescription, AlertTitle } from "@/lib/components/ui/alert"
import { fetchApolloAccounts, fetchCampaigns } from "@/lib/actions"
import { signOut } from "@/lib/actions/auth"
import { requireUser } from "@/lib/auth"
import { Button } from "@/lib/components/ui/button"

export default async function ImporterPage() {
  const user = await requireUser()
  const [accountsResult, campaignsResult] = await Promise.all([
    fetchApolloAccounts(),
    fetchCampaigns()
  ])

  if (!accountsResult.ok) {
    throw new Error(accountsResult.error)
  }

  if (!campaignsResult.ok) {
    throw new Error(campaignsResult.error)
  }

  async function onRedirect() {
    "use server"
    redirect("/admin")
  }

  if (accountsResult.data.length === 0 && user.role === "admin") {
    return (
      <main className="flex flex-col gap-6 p-6">
        <Alert>
          <AlertTitle>No Apollo accounts configured</AlertTitle>
          <AlertDescription>
            Add at least one Apollo account before importing contacts.
          </AlertDescription>
          <Button className="mt-4" onClick={onRedirect}>
            Admin Panel
          </Button>
        </Alert>
      </main>
    )
  }

  if (accountsResult.data.length === 0 && user.role !== "admin") {
    return (
      <main className="flex flex-col gap-6 p-6">
        <Alert>
          <AlertTitle>No Apollo accounts configured</AlertTitle>
          <AlertDescription>
            Ask an admin to add at least one Apollo account before importing contacts.
          </AlertDescription>
          <Button className="mt-4" variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </Alert>
      </main>
    )
  }

  return (
    <main>
      <Importer
        accounts={accountsResult.data}
        campaigns={campaignsResult.data}
        userRole={user.role}
        userEmail={user.email}
      />
    </main>
  )
}
