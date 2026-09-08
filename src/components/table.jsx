import { useMemo } from "react"
import { Anchor, Checkbox, Flex, Pagination, Select, Skeleton, Table } from "@mantine/core"

const COLUMN_COUNT = 7
const PER_PAGE_OPTIONS = ["15", "25", "50"]

function TableSkeleton({ rows = 5, columns = COLUMN_COUNT }) {
  return (
    <Table>
      <Table.Tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <Table.Tr key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Table.Td key={colIndex}>
                <Skeleton height={16} radius="sm" />
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}

function ContactFieldSelect({ options, value, onChange, emptyLabel, placeholder }) {
  if (options.length === 0) return emptyLabel

  return (
    <Select
      size="xs"
      data={options}
      value={value ?? null}
      onChange={onChange}
      placeholder={placeholder}
      clearable
      allowDeselect={false}
    />
  )
}

function HeaderCheckbox({ allSelected, someSelected, onToggleAll }) {
  return (
    <Checkbox
      checked={allSelected}
      indeterminate={someSelected}
      onChange={(e) => onToggleAll(e.currentTarget.checked)}
    />
  )
}

function RowCheckbox({ checked, onToggle }) {
  return <Checkbox checked={checked} onChange={(e) => onToggle(e.currentTarget.checked)} />
}

function TableFooter({
  perPage,
  setPerPage,
  totalPages,
  currentPage,
  setCurrentPage,
  disablePagination
}) {
  return (
    <Table.Tfoot>
      <Table.Tr>
        <Table.Td colSpan={COLUMN_COUNT}>
          <Flex mt="lg" gap="md">
            <Select
              data={PER_PAGE_OPTIONS}
              value={String(perPage)}
              onChange={(value) => setPerPage(Number(value))}
              size="xs"
              ml="auto"
              w={64}
              allowDeselect={false}
              comboboxProps={{ position: "top-start" }}
            />

            <Pagination
              size="sm"
              total={totalPages}
              value={currentPage}
              onChange={setCurrentPage}
              disabled={disablePagination}
            />
          </Flex>
        </Table.Td>
      </Table.Tr>
    </Table.Tfoot>
  )
}

function ContactRow({ contact, isSelected, onToggleSelected, details, onDetailChange }) {
  const officialEmailOptions = useMemo(
    () => contact.emails.filter((e) => e.value !== details?.personalEmail),
    [contact, details]
  )
  const personalEmailOptions = useMemo(
    () => contact.emails.filter((e) => e.value !== details?.officialEmail),
    [contact, details]
  )
  const mobileOptions = useMemo(
    () => contact.phoneNumbers.filter((e) => e.value !== details?.altNumber),
    [contact, details]
  )
  const altNumberOptions = useMemo(
    () => contact.phoneNumbers.filter((e) => e.value !== details?.mobile),
    [contact, details]
  )

  return (
    <Table.Tr>
      <Table.Td>
        <RowCheckbox checked={isSelected} onToggle={() => onToggleSelected(contact.id)} />
      </Table.Td>

      <Table.Td>{contact.displayName}</Table.Td>

      <Table.Td>
        <ContactFieldSelect
          options={officialEmailOptions}
          value={details?.officialEmail}
          onChange={(value) => onDetailChange(contact.id, "officialEmail", value)}
          emptyLabel="-"
          placeholder="Choose an email"
        />
      </Table.Td>

      <Table.Td>
        <ContactFieldSelect
          options={personalEmailOptions}
          value={details?.personalEmail}
          onChange={(value) => onDetailChange(contact.id, "personalEmail", value)}
          emptyLabel="-"
          placeholder="Choose an email"
        />
      </Table.Td>

      <Table.Td>
        <ContactFieldSelect
          options={mobileOptions}
          value={details?.mobile}
          onChange={(value) => onDetailChange(contact.id, "mobile", value)}
          emptyLabel="-"
          placeholder="Choose a number"
        />
      </Table.Td>

      <Table.Td>
        <ContactFieldSelect
          options={altNumberOptions}
          value={details?.altNumber}
          onChange={(value) => onDetailChange(contact.id, "altNumber", value)}
          emptyLabel="-"
          placeholder="Choose a number"
        />
      </Table.Td>

      <Table.Td>
        {contact?.status === "duplicate" ? (
          <Anchor
            href={`https://crm.zoho.com/crm/tab/Leads/${contact.existingRecordId}`}
            target="_blank"
            fz="sm"
          >
            duplicate found
          </Anchor>
        ) : (
          (contact?.status ?? "-")
        )}
      </Table.Td>
    </Table.Tr>
  )
}

export default function LeadsTable({
  loading = false,
  contacts = [],
  setContacts = () => {},
  totalPages = 0,
  currentPage = 1,
  setCurrentPage = () => {},
  perPage = 15,
  setPerPage = () => {},
  selectedContactDetails = {},
  setSelectedContactDetails = () => {},
  disablePagination = false
}) {
  if (loading) return <TableSkeleton />
  if (contacts.length === 0) return null

  const selectedOnPageCount = useMemo(() => contacts.filter((c) => c.checked).length, [contacts])
  const allSelected = contacts.length > 0 && selectedOnPageCount === contacts.length
  const someSelected = selectedOnPageCount > 0 && selectedOnPageCount < contacts.length

  function toggleAll(checked) {
    setContacts((prev) => {
      return prev.map((c) => ({ ...c, checked }))
    })
  }

  function toggleOne(id) {
    setContacts((prev) => {
      return prev.map((c) => (c.id === id ? { ...c, checked: Boolean(!c.checked) } : c))
    })
  }

  function updateContactDetail(id, field, value) {
    setSelectedContactDetails((prev) => {
      const next = new Map(prev)
      next.set(id, { ...prev.get(id), [field]: value })
      return next
    })
  }

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <HeaderCheckbox
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleAll={toggleAll}
            />
          </Table.Th>
          <Table.Th>Name</Table.Th>
          <Table.Th>Official Email</Table.Th>
          <Table.Th>Personal Email</Table.Th>
          <Table.Th>Mobile</Table.Th>
          <Table.Th>Alt. Mobile</Table.Th>
          <Table.Th>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>

      <Table.Tbody>
        {contacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            isSelected={Boolean(contact.checked)}
            onToggleSelected={toggleOne}
            details={selectedContactDetails.get(contact.id)}
            onDetailChange={updateContactDetail}
          />
        ))}
      </Table.Tbody>

      <TableFooter
        perPage={perPage}
        setPerPage={setPerPage}
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        disablePagination={disablePagination}
      />
    </Table>
  )
}
