"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"
import { configureZohoSecrets, resetZohoToken } from "@/lib/actions"
import { createUser, deleteUser, resetPassword } from "@/lib/actions/auth"
import { ApolloAccountsManager } from "@/lib/components/apollo-accounts-manager"
import { SiteHeader } from "@/lib/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/lib/components/ui/alert"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/lib/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/lib/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/lib/components/ui/tabs"
import type { CurrentUser } from "@/lib/auth"
import type { ApolloAccountPublic } from "@/lib/actions/apollo-accounts"

type AdminUser = {
  id: string
  email: string
  role: "admin" | "user"
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
  zohoStatus
}: AdminDashboardProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <SiteHeader email={currentUser.email} role={currentUser.role} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground text-sm">
          Manage service credentials and user access for the importer.
        </p>
      </div>

      <Tabs defaultValue="users" className="gap-5">
        <TabsList variant="line">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="apollo">Apollo.io</TabsTrigger>
          <TabsTrigger value="zoho">Zoho CRM</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersCard currentUserId={currentUser.id} initialUsers={initialUsers} />
        </TabsContent>
        <TabsContent value="apollo">
          <ApolloAccountsManager
            initialAccounts={initialAccounts}
            compact
            email={currentUser.email}
          />
        </TabsContent>
        <TabsContent value="zoho">
          <ZohoSecretsCard initialStatus={zohoStatus} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ZohoSecretsCard({
  initialStatus
}: {
  initialStatus: { configured: boolean; updatedAt: Date | null }
}) {
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setError(null)
    setLoading(true)

    const result = await configureZohoSecrets(
      String(formData.get("clientId") ?? ""),
      String(formData.get("clientSecret") ?? ""),
      String(formData.get("grantToken") ?? "")
    )

    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      toast.error(result.error)
      return
    }

    form.reset()
    setStatus({ configured: true, updatedAt: new Date() })
    toast.success("Zoho credentials configured")
  }

  async function handleResetToken() {
    setResetting(true)
    const result = await resetZohoToken()
    setResetting(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success("Zoho token reset — will refresh on next use")
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
      <CardContent className="flex flex-col gap-4">
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
          <Button disabled={loading} type="submit" className="w-fit">
            {loading ? (
              <>
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Zoho credentials"
            )}
          </Button>
        </form>

        {status.configured && (
          <div className="sm:max-w-md">
            <div className="flex flex-col gap-1.5 border-t pt-4">
              <p className="text-sm font-medium">Reset access token</p>
              <p className="text-muted-foreground text-sm">
                Forces a fresh token refresh on the next API call. Use this if requests are failing
                with invalid token errors.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={resetting}
                onClick={handleResetToken}
                className="mt-1 w-fit"
              >
                {resetting ? (
                  <>
                    <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset token"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UsersCard({
  currentUserId,
  initialUsers
}: {
  currentUserId: string
  initialUsers: AdminUser[]
}) {
  const [users, setUsers] = useState(initialUsers)
  const [role, setRole] = useState<"admin" | "user">("user")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setError(null)
    setLoading(true)

    const result = await createUser(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
      role
    )

    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      toast.error(result.error)
      return
    }

    form.reset()
    setRole("user")
    setUsers((current) => [...current, result.data])
    toast.success(`Created ${result.data.email}`)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteUser(id)
    setDeletingId(null)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    setUsers((current) => current.filter((user) => user.id !== id))
    toast.success("User deleted")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Only email addresses associated with the GoldenRatio Zoho CRM organization can be used
          with the importer and should be entered here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:max-w-md">
          <SecretField id="email" label="Email" type="email" />
          <SecretField id="password" label="Password" />
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              items={[
                { value: "user", label: "User" },
                { value: "admin", label: "Admin" }
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
          <Button disabled={loading} type="submit" className="w-fit">
            Create user
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function UserRow({
  user,
  currentUserId,
  onDelete,
  deletingId
}: {
  user: AdminUser
  currentUserId: string
  onDelete: (id: string) => void
  deletingId: string | null
}) {
  const [resetting, setResetting] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleResetPassword() {
    setError(null)
    setResetting(true)
    const result = await resetPassword(user.id, password)
    setResetting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setPassword("")
    setShowReset(false)
    toast.success(`Password reset for ${user.email}`)
  }

  return (
    <>
      <TableRow>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.role}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowReset((v) => !v)
                setError(null)
                setPassword("")
              }}
            >
              Reset password
            </Button>
            {user.id !== currentUserId && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={deletingId === user.id}
                onClick={() => onDelete(user.id)}
              >
                {deletingId === user.id ? <Loader2Icon className="animate-spin" /> : "Delete"}
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {showReset && (
        <TableRow>
          <TableCell colSpan={4}>
            <div className="flex flex-col gap-2 py-1 sm:max-w-sm">
              <Input
                type="password"
                placeholder="New password (min. 12 characters)"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={resetting || password.length < 12}
                  onClick={handleResetPassword}
                >
                  {resetting ? (
                    <>
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save password"
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReset(false)
                    setError(null)
                    setPassword("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function SecretField({
  id,
  label,
  type = "password"
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
