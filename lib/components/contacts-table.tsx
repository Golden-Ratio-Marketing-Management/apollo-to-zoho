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
import { useMemo } from "react"

type ContactsTableProps = {
  contacts: NormalizedContact[]
  onCheckedChange: (contact: NormalizedContact, checked: boolean) => void
  onToggleAllQualifying: (checked: boolean) => void
}

export function ContactsTable({
  contacts,
  onCheckedChange,
  onToggleAllQualifying
}: ContactsTableProps) {
  const checkedCount = useMemo(() => contacts.filter((c) => c.checked).length, [contacts])
  const allQualifyingChecked = checkedCount === contacts.length
  const someQualifyingChecked = checkedCount > 0 && checkedCount !== contacts.length

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allQualifyingChecked}
              indeterminate={someQualifyingChecked}
              disabled={contacts.length === 0}
              onCheckedChange={onToggleAllQualifying}
              aria-label="Select all qualifying contacts on this page"
            />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => {
          const qualifies = isQualifyingContact(contact)

          return (
            <TableRow key={contact.id}>
              <TableCell>
                <Checkbox
                  checked={contact.checked}
                  disabled={!qualifies}
                  onCheckedChange={(checked) => onCheckedChange(contact, checked)}
                  aria-label={`Select ${contact.displayName}`}
                />
              </TableCell>
              <TableCell>{contact.displayName}</TableCell>
              <TableCell className="text-muted-foreground">{contact.email || "-"}</TableCell>
              <TableCell className="text-muted-foreground">
                {contact.sanitizedPhone || "-"}
              </TableCell>
              <TableCell>
                {contact?.pushStatus === "success"
                  ? "Success"
                  : contact?.pushErrors?.join(", ") || "-"}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
