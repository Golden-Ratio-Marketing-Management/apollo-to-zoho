import { ApolloAccountsManager } from "@/lib/components/apollo-accounts-manager"
import { listApolloAccountsAdmin } from "@/lib/actions/apollo-accounts"

export const dynamic = "force-dynamic"

export default async function ApiKeysPage() {
  const result = await listApolloAccountsAdmin()

  if (!result.ok) {
    throw new Error(result.error)
  }

  return (
    <main>
      <ApolloAccountsManager initialAccounts={result.data} />
    </main>
  )
}
