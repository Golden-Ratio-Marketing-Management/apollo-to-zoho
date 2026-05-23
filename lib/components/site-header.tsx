import Link from "next/link"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Importer" },
  { href: "/api", label: "API keys" },
] as const

export function SiteHeader({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        "flex flex-wrap items-center gap-4 border-b border-border pb-4 text-sm",
        className,
      )}
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
