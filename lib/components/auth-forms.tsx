"use client"

import { useActionState } from "react"
import { createFirstAdmin, signIn } from "@/lib/actions/auth"
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

type AuthFormsProps = {
  bootstrapOpen: boolean
}

export function AuthForms({ bootstrapOpen }: AuthFormsProps) {
  const [signInState, signInAction, signInPending] = useActionState(signIn, {})
  const [bootstrapState, bootstrapAction, bootstrapPending] = useActionState(
    createFirstAdmin,
    {},
  )

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{bootstrapOpen ? "Create first admin" : "Sign in"}</CardTitle>
          <CardDescription>
            {bootstrapOpen
              ? "Bootstrap this internal tool with the temporary setup token."
              : "Use your account to access the importer."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bootstrapOpen ? (
            <form action={bootstrapAction} className="flex flex-col gap-4">
              <Field id="name" label="Name" autoComplete="name" />
              <Field id="email" label="Email" type="email" autoComplete="email" />
              <Field
                id="password"
                label="Password"
                type="password"
                autoComplete="new-password"
              />
              <Field
                id="bootstrapToken"
                label="Bootstrap token"
                type="password"
                autoComplete="off"
              />
              {bootstrapState.error && (
                <Alert variant="destructive">
                  <AlertTitle>Could not create admin</AlertTitle>
                  <AlertDescription>{bootstrapState.error}</AlertDescription>
                </Alert>
              )}
              <Button disabled={bootstrapPending} type="submit">
                {bootstrapPending ? "Creating..." : "Create admin"}
              </Button>
            </form>
          ) : (
            <form action={signInAction} className="flex flex-col gap-4">
              <Field id="email" label="Email" type="email" autoComplete="email" />
              <Field
                id="password"
                label="Password"
                type="password"
                autoComplete="current-password"
              />
              {signInState.error && (
                <Alert variant="destructive">
                  <AlertTitle>Sign in failed</AlertTitle>
                  <AlertDescription>{signInState.error}</AlertDescription>
                </Alert>
              )}
              <Button disabled={signInPending} type="submit">
                {signInPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  id,
  label,
  type = "text",
  autoComplete,
}: {
  id: string
  label: string
  type?: string
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} autoComplete={autoComplete} />
    </div>
  )
}
