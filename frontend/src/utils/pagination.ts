export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): {
  pagedItems: T[];
  safePage: number;
  totalPages: number;
} {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  return {
    pagedItems: items.slice(startIdx, startIdx + pageSize),
    safePage,
    totalPages,
  };
}
