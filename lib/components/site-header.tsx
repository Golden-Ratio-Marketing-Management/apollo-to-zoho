"use client"

import Link from "next/link"
import { signOut } from "@/lib/actions/auth"
import { Button } from "@/lib/components/ui/button"
import { cn } from "@/lib/utils"
import { LogOut } from "lucide-react"

const baseLinks = [{ href: "/importer", label: "Importer" }] as const

export function SiteHeader({
  className,
  email,
  role
}: {
  className?: string
  role?: "admin" | "user"
  email: string
}) {
  const links = role === "admin" ? [...baseLinks, { href: "/admin", label: "Admin" }] : baseLinks

  return (
    <nav
      className={cn(
        "border-border flex flex-wrap items-center justify-between gap-4 border-b pb-4 text-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <form action={signOut} className="flex items-center gap-2">
        <p className="text-sm text-gray-500">
          Logged in as <span className="font-medium text-gray-700">{email}</span>
        </p>
        <Button type="submit" variant="ghost" size="icon" title="Logout">
          <LogOut />
        </Button>
      </form>
    </nav>
  )
}
