import { useContext } from "react"

import { ZohoContext } from "../context/zoho"

export function useZoho() {
  const context = useContext(ZohoContext)

  if (!context) {
    throw new Error("useZoho must be used inside ZohoProvider")
  }

  return context
}
