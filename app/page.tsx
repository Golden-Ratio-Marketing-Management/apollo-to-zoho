import { Importer } from "@/lib/components/importer"
import { Alert, AlertDescription, AlertTitle } from "@/lib/components/ui/alert"
import { fetchApolloAccounts } from "@/lib/actions"

export const dynamic = "force-dynamic"

export default async function Home() {
  const accountsResult = await fetchApolloAccounts()

  if (!accountsResult.ok) {
    throw new Error(accountsResult.error)
  }

  if (accountsResult.data.length === 0) {
    return (
      <main className="flex flex-col gap-6 p-6">
        <Alert>
          <AlertTitle>No Apollo accounts configured</AlertTitle>
          <AlertDescription>
            Add at least one Apollo account on the{" "}
            <a href="/api" className="text-primary underline-offset-4 hover:underline">
              API keys
            </a>{" "}
            page before importing contacts.
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  return (
    <main>
      <Importer accounts={accountsResult.data} />
    </main>
  )
}
