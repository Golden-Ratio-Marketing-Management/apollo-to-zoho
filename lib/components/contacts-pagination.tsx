"use client"

import { getPaginationRange } from "@/lib/pagination-range"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/lib/components/ui/pagination"

type ContactsPaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function ContactsPagination({
  page,
  totalPages,
  onPageChange,
  className,
}: ContactsPaginationProps) {
  if (totalPages <= 0) return null

  const pageNumbers = getPaginationRange(page, totalPages)

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (page > 1) onPageChange(page - 1)
            }}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        {pageNumbers.map((pageNumber, index) =>
          pageNumber === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                href="#"
                isActive={pageNumber === page}
                onClick={(event) => {
                  event.preventDefault()
                  onPageChange(pageNumber)
                }}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (page < totalPages) onPageChange(page + 1)
            }}
            aria-disabled={page >= totalPages}
            className={
              page >= totalPages ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
