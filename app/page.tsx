import { redirect } from "next/navigation"
import { AuthForms } from "@/lib/components/auth-forms"
import { getCurrentUser } from "@/lib/auth"
import { hasAnyAdmin } from "@/lib/actions/auth"

export const dynamic = "force-dynamic"

export default async function Home() {
  const user = await getCurrentUser()

  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/importer")
  }

  const hasAdmin = await hasAnyAdmin()

  return (
    <main>
      <AuthForms bootstrapOpen={!hasAdmin} />
    </main>
  )
}
