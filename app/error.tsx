"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/lib/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/lib/components/ui/card"

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="border-destructive/20 w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="bg-destructive/10 mx-auto flex h-14 w-14 items-center justify-center rounded-full">
            <AlertTriangle className="text-destructive h-7 w-7" />
          </div>

          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Something went wrong
            </CardTitle>

            <p className="text-muted-foreground text-sm">
              An unexpected error occurred while loading this page.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted/40 rounded-md border p-3">
            <p className="text-muted-foreground font-mono text-sm wrap-break-word">
              {error.message || "Unknown error"}
            </p>
          </div>

          <Button onClick={reset} className="w-full gap-2" size="lg">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
