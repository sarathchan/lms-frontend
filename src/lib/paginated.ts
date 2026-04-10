/** Backend paginated responses use `data`; legacy may use `items`. */
export function paginatedData<T>(
  r: { data?: T[]; items?: T[] } | undefined | null,
): T[] {
  return r?.data ?? r?.items ?? []
}
