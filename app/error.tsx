"use client"

import { Alert, AlertDescription, AlertTitle } from "@/lib/components/ui/alert"
import { Button } from "@/lib/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex flex-col gap-4 p-6">
      <Alert variant="destructive">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
