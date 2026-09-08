import { useEffect, useMemo, useState } from "react"
import { Box } from "@mantine/core"
import toast from "react-hot-toast"

import { apolloURL } from "../config.json"
import { useZoho } from "../lib/hooks/useZoho"
import {
  contactToZohoItem,
  employeeCountToRange,
  mapZohoPushResults,
  normalizeApolloContact,
  normalizeZohoInsertResponse
} from "../lib/utils"
import LeadsTable from "./table"
import Toolbar from "./toolbar"

const MAX_PUSH_ROWS = 50

export default function Importer() {
  const { zoho, isReady } = useZoho()

  const [selectedList, setSelectedList] = useState(null)
  const [selectedCampaign, setSelectedCampaign] = useState(null)

  const [perPage, setPerPage] = useState(15)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState([])

  const [currentUser, setCurrentUser] = useState(null)

  const [selectedContactDetails, setSelectedContactDetails] = useState(new Map())

  const [pulling, setPulling] = useState(false)

  const checkedCount = useMemo(
    () => contacts.reduce((acc, curr) => (curr?.checked ? acc + 1 : acc), 0),
    [contacts]
  )

  const canPull =
    Boolean(selectedList && selectedCampaign) &&
    checkedCount > 0 &&
    checkedCount <= MAX_PUSH_ROWS &&
    !pulling

  async function fetchApolloContacts() {
    setLoadingContacts(true)

    try {
      const result = await zoho.CRM.CONNECTION.invoke("apollo", {
        url: apolloURL + "/contacts/search",
        method: "POST",
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
          accept: "application/json"
        },
        param_type: 2,
        parameters: {
          contact_label_ids: [selectedList],
          page: currentPage,
          per_page: perPage
        }
      })

      const data = result?.details?.statusMessage
      const contacts = (data?.contacts ?? []).map(normalizeApolloContact)

      setContacts(contacts)
      setTotalPages((prev) => data?.pagination?.total_pages || prev)
    } catch (err) {
      console.error(err)
      toast.error("Failed to fetch data from Apollo.")
      setContacts([])
      setTotalPages(1)
    } finally {
      setLoadingContacts(false)
    }
  }

  async function fetchCurrentUser() {
    try {
      const data = await zoho.CRM.CONFIG.getCurrentUser()

      setCurrentUser((prev) => {
        if (!Array.isArray(data?.users) || !data?.users?.length > 0) {
          return prev
        }

        return data.users[0]
      })
    } catch (err) {
      console.error(err)
      toast.error("Failed to access current user.")
    }
  }

  async function fetchAccountInfo(ids = []) {
    const orgIDs = Array.from(new Set(ids.filter(Boolean)))
    if (orgIDs.length === 0) return new Map()

    const settled = await Promise.allSettled(
      orgIDs.map((id) =>
        zoho.CRM.CONNECTION.invoke("apollo", {
          url: apolloURL + "/accounts/" + id,
          method: "GET"
        }).then((data) => data?.details?.statusMessage?.account || {})
      )
    )

    const results = []
    settled.forEach((s, i) => {
      if (s.status === "fulfilled") {
        results.push(s.value)
      } else {
        console.error(`Failed to fetch account info for org ${orgIDs[i]}`, s.reason)
      }
    })

    return new Map(results.filter((r) => r.id).map((r) => [r.id, r]))
  }

  async function onPull() {
    const contactsToPush = contacts.filter((c) => c.checked)

    if (contactsToPush.length === 0) return

    if (contactsToPush.length > MAX_PUSH_ROWS) {
      toast.error(`You can push at most ${MAX_PUSH_ROWS} contacts at once.`)
      return
    }

    if (!currentUser?.email) {
      toast.error("Current user hasn't loaded yet, try again in a moment.")
      return
    }

    setPulling(true)

    setContacts((prev) =>
      prev.map((c) => (c.checked ? { ...c, status: "pushing", errors: undefined } : c))
    )

    // Declared outside the inner try so both the success path and the
    // recovery-from-throw path can populate it before we get to mapping.
    let zohoResults = null
    let unrecoverable = false

    try {
      const accountsInfo = await fetchAccountInfo(contactsToPush.map((c) => c.orgID))

      // Frozen array — zip Zoho's results against this, never against live `contacts`
      const APIData = contactsToPush.map((c) => {
        const org = accountsInfo.get(c.orgID)

        return contactToZohoItem(
          c,
          selectedCampaign,
          currentUser.email,
          selectedContactDetails.get(c.id),
          org
            ? {
                orgIndustry: org?.industry,
                orgSizeRange: employeeCountToRange(org?.estimated_num_employees)
              }
            : {}
        )
      })

      try {
        const result = await zoho.CRM.API.insertRecord({ Entity: "Leads", APIData })
        zohoResults = normalizeZohoInsertResponse(result)

        if (zohoResults === null) {
          console.error("Unrecognized insertRecord response shape:", result)
          unrecoverable = true
        }
      } catch (insertErr) {
        // Some Zoho widget SDK versions reject the promise on partial failure
        // (i.e. at least one row errored) even though records were still
        // created for the successful rows. Try to recover the real per-row
        // results from the rejection reason before giving up.
        console.error("insertRecord threw:", insertErr)

        zohoResults =
          normalizeZohoInsertResponse(insertErr) ?? normalizeZohoInsertResponse(insertErr?.data)

        if (zohoResults === null) {
          console.error("Could not recover results from thrown error:", insertErr)
          unrecoverable = true
        }
      }

      if (unrecoverable) {
        toast.error("Zoho returned an unexpected response, contact admin.")
        setContacts((prev) =>
          prev.map((c) =>
            contactsToPush.some((r) => r.id === c.id)
              ? { ...c, status: "error", errors: ["Unrecognized response from Zoho"] }
              : c
          )
        )
        return
      }

      const { resolved, successCount, errorCount, duplicateCount } = mapZohoPushResults(
        contactsToPush,
        zohoResults
      )
      console.log("resolved map:", resolved, "success:", successCount, "error:", errorCount)

      setContacts((prev) =>
        prev.map((c) => {
          const patch = resolved.get(c.id)
          return patch ? { ...c, ...patch } : c
        })
      )

      const parts = []
      if (successCount > 0) parts.push(`${successCount} pushed`)
      if (duplicateCount > 0) parts.push(`${duplicateCount} already existed`)
      if (errorCount > 0) parts.push(`${errorCount} failed`)

      const message = `${parts.join(", ")}, check the Status column`
      successCount > 0 ? toast(message) : toast.error(message)
    } catch (err) {
      // Genuinely unrecoverable failure (e.g. fetchAccountInfo/contactToZohoItem
      // threw, or something outside the insertRecord call itself)
      console.error(err)
      toast.error("Failed pulling to Zoho.")

      setContacts((prev) =>
        prev.map((c) =>
          contactsToPush.some((r) => r.id === c.id)
            ? { ...c, status: "error", errors: ["Request failed"] }
            : c
        )
      )
    } finally {
      setPulling(false)
    }
  }

  useEffect(() => {
    if (!isReady) return

    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (!isReady || !selectedList) {
      setContacts([])
      setTotalPages(1)
      setCurrentPage(1)
      return
    }

    fetchApolloContacts()
  }, [selectedList, currentPage, perPage])

  return (
    <>
      <Toolbar
        selectedList={selectedList}
        setSelectedList={setSelectedList}
        selectedCampaign={selectedCampaign}
        setSelectedCampaign={setSelectedCampaign}
        onPull={onPull}
        pulling={pulling}
        disablePull={!canPull}
        disableListChange={pulling}
        checkedCount={checkedCount}
        maxPushRows={MAX_PUSH_ROWS}
      />

      <Box mt="lg">
        <LeadsTable
          loading={loadingContacts}
          perPage={perPage}
          setPerPage={setPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          contacts={contacts}
          setContacts={setContacts}
          selectedContactDetails={selectedContactDetails}
          setSelectedContactDetails={setSelectedContactDetails}
          disablePagination={pulling}
        />
      </Box>
    </>
  )
}
