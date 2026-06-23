"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"
import { fetchApolloContacts, fetchApolloLists, pushToZoho } from "@/lib/actions"
import { contactToZohoItem, getZohoRowErrors, isQualifyingContact } from "@/lib/contacts"
import { SiteHeader } from "@/lib/components/site-header"
import { OptionSelect } from "@/lib/components/option-select"
import { ContactsTable } from "@/lib/components/contacts-table"
import { ContactsPagination } from "@/lib/components/contacts-pagination"
import { Alert, AlertDescription, AlertTitle } from "@/lib/components/ui/alert"
import { Button } from "@/lib/components/ui/button"
import { Spinner } from "@/lib/components/ui/spinner"
import { Skeleton } from "@/lib/components/ui/skeleton"
import { CONTACTS_PER_PAGE_OPTIONS, DEFAULT_CONTACTS_PER_PAGE } from "@/lib/constants"
import type { NormalizedContact, SelectOption, ZohoResultItem } from "@/lib/types"

type ImporterProps = {
  accounts: SelectOption[]
  campaigns: string[]
  userRole?: "admin" | "user"
  userEmail: string
}

type AsyncStatus = "idle" | "loading" | "success" | "error"

export function Importer({ accounts, campaigns, userRole, userEmail }: ImporterProps) {
  const [accountId, setAccountId] = useState("")
  const [listId, setListId] = useState("")
  const [campaign, setCampaign] = useState("")
  const [lists, setLists] = useState<SelectOption[]>([])
  const [listsStatus, setListsStatus] = useState<AsyncStatus>("idle")
  const [listsError, setListsError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<NormalizedContact[]>([])
  const [contactsStatus, setContactsStatus] = useState<AsyncStatus>("idle")
  const [contactsError, setContactsError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(DEFAULT_CONTACTS_PER_PAGE)
  const [totalPages, setTotalPages] = useState(0)
  const [totalEntries, setTotalEntries] = useState(0)
  const [pushStatus, setPushStatus] = useState<AsyncStatus>("idle")
  const [pushError, setPushError] = useState<string | null>(null)

  const checkedCount = useMemo(
    () => contacts.reduce((acc, curr) => (curr?.checked ? acc + 1 : acc), 0),
    [contacts]
  )

  const canPush =
    Boolean(accountId && listId && campaign && checkedCount > 0) && pushStatus !== "loading"

  const resetContactsState = useCallback(() => {
    setContacts([])
    setContactsStatus("idle")
    setContactsError(null)
    setPage(1)
    setTotalPages(0)
    setTotalEntries(0)
    setPushStatus("idle")
    setPushError(null)
  }, [])

  const loadLists = useCallback(async (nextAccountId: string) => {
    setListsStatus("loading")
    setListsError(null)

    const result = await fetchApolloLists(nextAccountId)

    if (!result.ok) {
      setLists([])
      setListsStatus("error")
      setListsError(result.error)
      return
    }

    setLists(result.data)
    setListsStatus("success")
  }, [])

  const loadContacts = useCallback(
    async (nextAccountId: string, nextListId: string, nextPage: number, nextPerPage: number) => {
      setContactsStatus("loading")
      setContactsError(null)

      const result = await fetchApolloContacts(nextAccountId, nextListId, nextPage, nextPerPage)

      if (!result.ok) {
        setContacts([])
        setContactsStatus("error")
        setContactsError(result.error)
        return
      }

      setContacts(result.data.contacts)
      setPage(result.data.pagination.page)
      setTotalPages(result.data.pagination.totalPages)
      setTotalEntries(result.data.pagination.totalEntries)
      setContactsStatus("success")
    },
    []
  )

  useEffect(() => {
    if (!accountId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLists(accountId)
  }, [accountId, loadLists])

  useEffect(() => {
    if (!accountId || !listId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContacts(accountId, listId, page, perPage)
  }, [accountId, listId, page, perPage, loadContacts])

  const handleAccountChange = (value: string) => {
    setAccountId(value)

    setListId("")
    setLists([])
    setListsStatus("idle")
    setListsError(null)

    resetContactsState()
  }

  const handleListChange = (value: string) => {
    setListId(value)

    setPage(1)

    setPushStatus("idle")
    setPushError(null)

    setContacts([])
    setContactsStatus("idle")
    setContactsError(null)
  }

  const handlePerPageChange = (value: string) => {
    setPerPage(Number(value))
    setPage(1)
  }

  const handleCheckedChange = (contact: NormalizedContact, checked: boolean) => {
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, checked } : c)))
  }

  const handleToggleAllQualifying = (checked: boolean) => {
    setContacts((prev) =>
      prev.map((c) => {
        return { ...c, checked }
      })
    )
  }

  const handlePush = async () => {
    if (!campaign) return

    const selectedRows = contacts.filter((c) => c.checked && isQualifyingContact(c))

    if (selectedRows.length === 0) return

    const payload = selectedRows.map((contact) => contactToZohoItem(contact, campaign, userEmail))

    setPushStatus("loading")
    setPushError(null)

    const result = await pushToZoho(payload)

    if (!result.ok) {
      setPushStatus("error")
      setPushError(result.error ?? "Push request failed")
      setContacts((prev) =>
        prev.map((c) =>
          selectedRows.some((s) => s.id === c.id)
            ? { ...c, pushStatus: "error", pushErrors: ["Request failed"] }
            : c
        )
      )
      return
    }

    const zohoResults: ZohoResultItem[] = result.data.results

    let successCount = 0
    let errorCount = 0

    const resolvedById = new Map<
      string,
      { pushStatus: "success" | "error"; pushErrors?: string[]; checked: boolean }
    >()

    zohoResults.forEach((zohoItem, index) => {
      const row = selectedRows[index]
      if (!row) return

      if (zohoItem.status === "success") {
        successCount++
        resolvedById.set(row.id, {
          pushStatus: "success",
          checked: false
        })
      } else {
        errorCount++
        resolvedById.set(row.id, {
          pushStatus: "error",
          pushErrors: getZohoRowErrors(zohoItem),
          checked: true
        })
      }
    })

    setContacts((prev) =>
      prev.map((c) => {
        const resolved = resolvedById.get(c.id)
        return resolved ? { ...c, ...resolved } : c
      })
    )

    if (successCount > 0 && errorCount === 0) {
      setPushStatus("success")
      toast.success(`Pushed ${successCount} contact(s) to Zoho`)
    } else if (successCount > 0 && errorCount > 0) {
      setPushStatus("error")
      toast.warning(
        `${successCount} pushed, ${errorCount} failed, check the Status column for details`
      )
    } else {
      setPushStatus("error")
      toast.error(`All ${errorCount} records failed, check the Status column for details`)
    }
  }

  const perPageOptions = CONTACTS_PER_PAGE_OPTIONS.map(String)

  return (
    <div className="flex flex-col gap-6 p-6">
      <SiteHeader email={userEmail} role={userRole} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Apollo to Zoho</h1>

        <p className="text-muted-foreground text-sm">
          Internal tool, do not share access, credentials, or this URL.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <OptionSelect
          label="Apollo account"
          placeholder="Select account"
          options={accounts}
          value={accountId}
          onValueChange={handleAccountChange}
          disabled={pushStatus === "loading"}
        />

        <OptionSelect
          label="Apollo list"
          placeholder={listsStatus === "loading" ? "Loading lists…" : "Select list"}
          options={lists}
          value={listId}
          onValueChange={handleListChange}
          disabled={listsStatus === "loading" || !accountId || pushStatus === "loading"}
          loading={listsStatus === "loading"}
        />

        <OptionSelect
          label="Client campaign"
          placeholder="Select campaign"
          options={campaigns}
          value={campaign}
          onValueChange={setCampaign}
          disabled={pushStatus === "loading"}
        />

        <Button className="w-full lg:w-auto" disabled={!canPush} onClick={handlePush}>
          {pushStatus === "loading" ? (
            <>
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
              Pushing…
            </>
          ) : (
            "Push to Zoho"
          )}
        </Button>
      </div>

      {listsStatus === "error" && listsError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load lists</AlertTitle>
          <AlertDescription>{listsError}</AlertDescription>
        </Alert>
      )}

      {pushStatus === "error" && pushError && (
        <Alert variant="destructive">
          <AlertTitle>Push failed</AlertTitle>
          <AlertDescription>{pushError}</AlertDescription>
        </Alert>
      )}

      {listId && (
        <section className="flex flex-col gap-4">
          {contactsStatus === "loading" && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />

              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Spinner />
                Loading contacts…
              </div>
            </div>
          )}

          {contactsStatus === "error" && contactsError && (
            <Alert variant="destructive">
              <AlertTitle>Could not load contacts</AlertTitle>
              <AlertDescription>{contactsError}</AlertDescription>
            </Alert>
          )}

          {contactsStatus === "success" && contacts.length === 0 && (
            <Alert>
              <AlertTitle>No contacts found</AlertTitle>
              <AlertDescription>
                This list has no contacts matching the current page.
              </AlertDescription>
            </Alert>
          )}

          {contactsStatus === "success" && contacts.length > 0 && (
            <ContactsTable
              contacts={contacts}
              onCheckedChange={handleCheckedChange}
              onToggleAllQualifying={handleToggleAllQualifying}
            />
          )}

          {contactsStatus === "success" && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-sm">
                Total contacts in list: {totalEntries}
                {checkedCount > 0 ? ` · ${checkedCount} selected` : ""}
              </p>

              <div className="flex items-center justify-end gap-3">
                <OptionSelect
                  label="Rows per page"
                  placeholder="15"
                  options={perPageOptions}
                  value={String(perPage)}
                  onValueChange={handlePerPageChange}
                  layout="inline"
                  className="flex-none"
                />

                {totalPages >= 1 && (
                  <ContactsPagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    className="mx-0 w-auto justify-end"
                  />
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
