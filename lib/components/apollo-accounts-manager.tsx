"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import {
  addApolloAccount,
  removeApolloAccount,
  type ApolloAccountPublic
} from "@/lib/actions/apollo-accounts"
import { SiteHeader } from "@/lib/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/lib/components/ui/alert"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/lib/components/ui/table"

type ApolloAccountsManagerProps = {
  initialAccounts: ApolloAccountPublic[]
  compact?: boolean
  email: string
}

export function ApolloAccountsManager({
  initialAccounts,
  compact = false,
  email
}: ApolloAccountsManagerProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [accountName, setAccountName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setLoading(true)

    const result = await addApolloAccount(accountName, apiKey)

    setLoading(false)

    if (!result.ok) {
      setFormError(result.error)
      toast.error(result.error)
      return
    }

    setAccounts((current) => [...current, result.data])
    setAccountName("")
    setApiKey("")
    toast.success(`Added account “${result.data.account}”`)
  }

  async function handleRemove(account: ApolloAccountPublic) {
    const confirmed = window.confirm(
      `Remove “${account.account}”? The API key will be deleted from the database.`
    )
    if (!confirmed) return

    setLoading(true)

    const result = await removeApolloAccount(account.id)

    setLoading(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    setAccounts((current) => current.filter((row) => row.id !== account.id))
    toast.success(`Removed account “${account.account}”`)
  }

  return (
    <div className={compact ? "flex flex-col gap-6" : "flex flex-col gap-6 p-6"}>
      {!compact && <SiteHeader role="admin" email={email} />}

      {!compact && (
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Apollo API keys</h1>
          <p className="text-muted-foreground text-sm">
            Add or remove Apollo accounts stored in the database. API keys are encrypted at rest and
            are never shown after saving.
          </p>
          <p className="text-muted-foreground text-sm">
            Internal tool only — do not share access, credentials, or this URL.{" "}
            <Link href="/importer" className="text-primary underline-offset-4 hover:underline">
              Back to importer
            </Link>
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add Apollo account</CardTitle>
          <CardDescription>
            Enter a display name and the Apollo API key. The key is only used on the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-4 sm:max-w-md">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-name">Account name</Label>
              <Input
                id="account-name"
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="e.g. Sales team"
                disabled={loading}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="api-key">API key</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste Apollo API key"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            {formError && (
              <Alert variant="destructive">
                <AlertTitle>Could not add account</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={loading} className="w-fit">
              {loading ? (
                <>
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Add account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Apollo accounts</CardTitle>
          <CardDescription>
            {accounts.length === 0
              ? "No accounts configured yet."
              : `${accounts.length} account${accounts.length === 1 ? "" : "s"} configured.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Add an account above to use the importer.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account name</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.account}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={loading}
                        onClick={() => handleRemove(account)}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
