"use client"

import { Checkbox } from "@/lib/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/lib/components/ui/table"
import { isQualifyingContact } from "@/lib/contacts"
import type { NormalizedContact } from "@/lib/types"

type ContactsTableProps = {
  contacts: NormalizedContact[]
  checkedIds: Set<string>
  onCheckedChange: (contact: NormalizedContact, checked: boolean) => void
  onToggleAllQualifying: (checked: boolean) => void
}

export function ContactsTable({
  contacts,
  checkedIds,
  onCheckedChange,
  onToggleAllQualifying
}: ContactsTableProps) {
  const qualifying = contacts.filter(isQualifyingContact)
  const qualifyingIds = qualifying.map((contact) => contact.id)
  const selectedQualifyingCount = qualifyingIds.filter((id) => checkedIds.has(id)).length

  const allQualifyingChecked =
    qualifying.length > 0 && selectedQualifyingCount === qualifying.length
  const someQualifyingChecked = selectedQualifyingCount > 0 && !allQualifyingChecked

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allQualifyingChecked}
              indeterminate={someQualifyingChecked}
              disabled={qualifying.length === 0}
              onCheckedChange={(checked) => onToggleAllQualifying(checked === true)}
              aria-label="Select all qualifying contacts on this page"
            />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => {
          const qualifies = isQualifyingContact(contact)

          return (
            <TableRow key={contact.id}>
              <TableCell>
                <Checkbox
                  checked={checkedIds.has(contact.id)}
                  disabled={!qualifies}
                  onCheckedChange={(checked) => onCheckedChange(contact, checked === true)}
                  aria-label={`Select ${contact.displayName}`}
                />
              </TableCell>
              <TableCell>{contact.displayName}</TableCell>
              <TableCell className="text-muted-foreground">{contact.email || "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {contact.sanitizedPhone || "—"}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
