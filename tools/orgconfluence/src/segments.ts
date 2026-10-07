/** `accountId` marks a person to link to their Atlassian profile, whose address only the page knows. */
export type Segment = { text: string; href?: string; accountId?: string };

export function linked(text: string, url: string | null): Segment {
  return url ? { text, href: url } : { text };
}

const ORGVIEWER_MARK = "↗";

/**
 * A person with an Atlassian account links to it by name, and to orgviewer by a small mark kept on
 * the same line as the name; anyone else links to orgviewer by name.
 */
export function person(view: { name: string; url: string | null; accountId: string | null }): Segment[] {
  if (!view.accountId) return [linked(view.name, view.url)];
  const name = { text: view.name, accountId: view.accountId };
  return view.url ? [name, { text: "\u00a0" }, { text: ORGVIEWER_MARK, href: view.url }] : [name];
}

/** Adjacent plain pieces are merged, so a consumer renders one text run between links. */
export function merged(segments: Segment[]): Segment[] {
  const result: Segment[] = [];
  for (const segment of segments) {
    const last = result.at(-1);
    const plain = (candidate: Segment) => !candidate.href && !candidate.accountId;
    if (last && plain(last) && plain(segment)) last.text += segment.text;
    else result.push({ ...segment });
  }
  return result;
}
