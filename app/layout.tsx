import type { Metadata } from "next"
import { IBM_Plex_Sans } from "next/font/google"
import { Toaster } from "@/lib/components/ui/sonner"
import { cn } from "@/lib/utils"
import "./globals.css"

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
})

export const metadata: Metadata = {
  title: "Apollo to Zoho",
  description: "Import Apollo.io contacts into Zoho CRM",
  robots: {
    index: false,
    follow: false
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", ibmPlexSans.variable)}>
      <body>
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center">
          {children}
          <Toaster richColors position="top-center" />
        </div>
      </body>
    </html>
  )
}
