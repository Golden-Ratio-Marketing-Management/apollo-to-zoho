import type { Metadata } from "next"
import { IBM_Plex_Sans } from "next/font/google"
import { Toaster } from "@/lib/components/ui/sonner"
import { cn } from "@/lib/utils"
import "./globals.css"

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Apollo to Zoho",
  description: "Import Apollo.io contacts into Zoho CRM",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", "font-sans", ibmPlexSans.variable)}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
