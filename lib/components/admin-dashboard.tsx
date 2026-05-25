"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"
import { configureZohoSecrets } from "@/lib/actions"
import { createUser, revokeUser } from "@/lib/actions/auth"
import { ApolloAccountsManager } from "@/lib/components/apollo-accounts-manager"
import { SiteHeader } from "@/lib/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/lib/components/ui/alert"
import { Button } from "@/lib/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/components/ui/table"
import type { CurrentUser } from "@/lib/auth"
import type { ApolloAccountPublic } from "@/lib/actions/apollo-accounts"

type AdminUser = {
  id: string
  email: string
  name: string
  role: "admin" | "user"
  revokedAt: Date | null
}

type AdminDashboardProps = {
  currentUser: CurrentUser
  initialAccounts: ApolloAccountPublic[]
  initialUsers: AdminUser[]
  zohoStatus: { configured: boolean; updatedAt: Date | null }
}

export function AdminDashboard({
  currentUser,
  initialAccounts,
  initialUsers,
  zohoStatus,
}: AdminDashboardProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <SiteHeader role={currentUser.role} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage service credentials and user access for the importer.
        </p>
      </div>

      <ZohoSecretsCard initialStatus={zohoStatus} />
      <ApolloAccountsManager initialAccounts={initialAccounts} compact />
      <UsersCard currentUserId={currentUser.id} initialUsers={initialUsers} />
    </div>
  )
}

function ZohoSecretsCard({
  initialStatus,
}: {
  initialStatus: { configured: boolean; updatedAt: Date | null }
}) {
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setError(null)

    startTransition(async () => {
      const result = await configureZohoSecrets(
        String(formData.get("clientId") ?? ""),
        String(formData.get("clientSecret") ?? ""),
        String(formData.get("grantToken") ?? ""),
      )

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      form.reset()
      setStatus({ configured: true, updatedAt: new Date() })
      toast.success("Zoho credentials configured")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zoho credentials</CardTitle>
        <CardDescription>
          {status.configured
            ? `Configured${status.updatedAt ? ` on ${status.updatedAt.toLocaleString()}` : ""}.`
            : "Not configured yet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:max-w-md">
          <SecretField id="clientId" label="Client ID" />
          <SecretField id="clientSecret" label="Client Secret" />
          <SecretField id="grantToken" label="Grant Token" />
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not configure Zoho</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button disabled={isPending} type="submit" className="w-fit">
            {isPending ? (
              <>
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Zoho credentials"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function UsersCard({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string
  initialUsers: AdminUser[]
}) {
  const [users, setUsers] = useState(initialUsers)
  const [role, setRole] = useState<"admin" | "user">("user")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setError(null)

    startTransition(async () => {
      const result = await createUser(
        String(formData.get("name") ?? ""),
        String(formData.get("email") ?? ""),
        String(formData.get("password") ?? ""),
        role,
      )

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      form.reset()
      setRole("user")
      setUsers((current) => [...current, { ...result.data, revokedAt: null }])
      toast.success(`Created ${result.data.email}`)
    })
  }

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      const result = await revokeUser(id)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === id ? { ...user, revokedAt: new Date() } : user,
        ),
      )
      toast.success("User revoked")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Create users and revoke access.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:max-w-md">
          <SecretField id="name" label="Name" type="text" />
          <SecretField id="email" label="Email" type="email" />
          <SecretField id="password" label="Temporary password" />
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              items={[
                { value: "user", label: "User" },
                { value: "admin", label: "Admin" },
              ]}
              onValueChange={(value) => {
                if (value === "admin" || value === "user") setRole(value)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not create user</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button disabled={isPending} type="submit" className="w-fit">
            Create user
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell className="text-right">
                  {user.revokedAt ? (
                    <span className="text-sm text-muted-foreground">Revoked</span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isPending || user.id === currentUserId}
                      onClick={() => handleRevoke(user.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function SecretField({
  id,
  label,
  type = "password",
}: {
  id: string
  label: string
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} autoComplete="off" />
    </div>
  )
}
