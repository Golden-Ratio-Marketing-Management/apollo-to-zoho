"use client"

import Link from "next/link"
import { signOut } from "@/lib/actions/auth"
import { Button } from "@/lib/components/ui/button"
import { cn } from "@/lib/utils"

const baseLinks = [{ href: "/importer", label: "Importer" }] as const

export function SiteHeader({
  className,
  role,
}: {
  className?: string
  role?: "admin" | "user"
}) {
  const links =
    role === "admin" ? [...baseLinks, { href: "/admin", label: "Admin" }] : baseLinks

  return (
    <nav
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 text-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </nav>
  )
}
