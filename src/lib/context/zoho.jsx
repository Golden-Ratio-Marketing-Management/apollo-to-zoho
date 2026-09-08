import { createContext, useEffect, useState } from "react"
import toast from "react-hot-toast"

export const ZohoContext = createContext(null)

export function ZohoProvider({ children }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!window.ZOHO) {
      console.error("ZOHO SDK not found")
      toast.error("Failed to load.")
      return
    }

    console.log("ZOHO SDK found")

    window.ZOHO.embeddedApp.on("PageLoad", () => {
      setIsReady(true)
    })

    window.ZOHO.embeddedApp.init()
  }, [])

  return (
    <ZohoContext.Provider
      value={{
        zoho: window.ZOHO,
        isReady
      }}
    >
      {children}
    </ZohoContext.Provider>
  )
}
