function storageKeyFor(slug: string): string {
  return `orgviewer-view-query:${slug}`;
}

export function viewHref(slug: string): string {
  let search = "";
  try {
    search = localStorage.getItem(storageKeyFor(slug)) ?? "";
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the plain URL still works.
  }
  return `/views/${slug}${search.startsWith("?") ? search : ""}`;
}

export function rememberViewQuery(slug: string, search: string): void {
  try {
    if (search) localStorage.setItem(storageKeyFor(slug), search);
    else localStorage.removeItem(storageKeyFor(slug));
  } catch {
    // Same as above: losing the memory only costs the user a re-pick.
  }
}
