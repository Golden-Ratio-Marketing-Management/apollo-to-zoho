"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"
import { fetchApolloContacts, fetchApolloLists, pushToZoho } from "@/lib/actions"
import { contactToZohoItem, isQualifyingContact } from "@/lib/contacts"
import { SiteHeader } from "@/lib/components/site-header"
import { OptionSelect } from "@/lib/components/option-select"
import { ContactsTable } from "@/lib/components/contacts-table"
import { ContactsPagination } from "@/lib/components/contacts-pagination"
import { Alert, AlertDescription, AlertTitle } from "@/lib/components/ui/alert"
import { Button } from "@/lib/components/ui/button"
import { Spinner } from "@/lib/components/ui/spinner"
import { Skeleton } from "@/lib/components/ui/skeleton"
import { CONTACTS_PER_PAGE_OPTIONS, DEFAULT_CONTACTS_PER_PAGE } from "@/lib/constants"
import type { NormalizedContact, SelectOption } from "@/lib/types"

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
  const [checkedById, setCheckedById] = useState<Map<string, NormalizedContact>>(() => new Map())
  const [pushStatus, setPushStatus] = useState<AsyncStatus>("idle")
  const [pushError, setPushError] = useState<string | null>(null)

  const checkedCount = checkedById.size

  const qualifyingCheckedCount = useMemo(
    () => Array.from(checkedById.values()).filter((contact) => isQualifyingContact(contact)).length,
    [checkedById]
  )

  const canPush =
    Boolean(accountId && listId && campaign && qualifyingCheckedCount > 0) &&
    pushStatus !== "loading"

  const resetContactsState = useCallback(() => {
    setContacts([])
    setContactsStatus("idle")
    setContactsError(null)
    setPage(1)
    setTotalPages(0)
    setTotalEntries(0)
    setCheckedById(new Map())
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
    setCheckedById(new Map())

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
    setCheckedById((current) => {
      const next = new Map(current)

      if (checked) {
        next.set(contact.id, contact)
      } else {
        next.delete(contact.id)
      }

      return next
    })
  }

  const handleToggleAllQualifying = (checked: boolean) => {
    setCheckedById((current) => {
      const next = new Map(current)

      for (const contact of contacts) {
        if (!isQualifyingContact(contact)) continue

        if (checked) {
          next.set(contact.id, contact)
        } else {
          next.delete(contact.id)
        }
      }

      return next
    })
  }

  const handlePush = async () => {
    if (!campaign) return

    const payload = [...checkedById.values()]
      .filter(isQualifyingContact)
      .map((contact) => contactToZohoItem(contact, campaign, userEmail))

    setPushStatus("loading")
    setPushError(null)

    const result = await pushToZoho(payload)

    if (!result.ok) {
      setPushStatus("error")
      setPushError(result.error)
      toast.error(result.error)
      return
    }

    setPushStatus("success")
    setCheckedById(new Map())

    toast.success(`Pushed ${result.data.pushed} contact(s) to Zoho`)
  }

  const perPageOptions = CONTACTS_PER_PAGE_OPTIONS.map(String)

  return (
    <div className="flex flex-col gap-6 p-6">
      <SiteHeader email={userEmail} role={userRole} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Apollo to Zoho</h1>

        <p className="text-muted-foreground text-sm">
          A maximum of 100 records can be pushed at once.
        </p>

        <p className="text-muted-foreground text-sm">
          Internal tool only — do not share access, credentials, or this URL.
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
              checkedIds={new Set(checkedById.keys())}
              onCheckedChange={handleCheckedChange}
              onToggleAllQualifying={handleToggleAllQualifying}
            />
          )}

          {contactsStatus === "success" && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-sm">
                {totalEntries} contact
                {totalEntries === 1 ? "" : "s"} in this list
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
