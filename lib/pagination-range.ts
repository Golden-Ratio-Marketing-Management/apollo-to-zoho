export function getPaginationRange(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 0) return []
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: Array<number | "ellipsis"> = [1]

  if (currentPage > 3) {
    pages.push("ellipsis")
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let page = start; page <= end; page++) {
    pages.push(page)
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis")
  }

  pages.push(totalPages)

  return pages
}
