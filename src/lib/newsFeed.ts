/**
 * News & updates: pure helpers (no React or app imports) for the feed and its "new" markers.
 * "New" = published after the newest post this person had already seen on this phone.
 */

export type NewsLike = { id: string; publishedAt: string | null };

const time = (value: string | null | undefined) => (value ? new Date(value).getTime() : Number.NaN);

export function isNewPost(post: NewsLike, lastSeenAt: string | null): boolean {
  const published = time(post.publishedAt);
  if (Number.isNaN(published)) return false;
  const seen = time(lastSeenAt);
  return Number.isNaN(seen) || published > seen;
}

export function unseenCount(posts: NewsLike[], lastSeenAt: string | null): number {
  return posts.filter((post) => isNewPost(post, lastSeenAt)).length;
}

export function newestPublishedAt(posts: NewsLike[]): string | null {
  let newest: string | null = null;
  for (const post of posts) {
    if (post.publishedAt && (newest === null || time(post.publishedAt) > time(newest))) newest = post.publishedAt;
  }
  return newest;
}

/** Adds the next page, skipping anything already shown (a post published between two page loads shifts the list). */
export function appendPage<T extends { id: string }>(existing: T[], page: T[]): T[] {
  const known = new Set(existing.map((post) => post.id));
  return [...existing, ...page.filter((post) => !known.has(post.id))];
}

/** A one-paragraph preview: whitespace collapsed, cut at a word boundary. */
export function excerpt(body: string, max = 160): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, "")}…`;
}
