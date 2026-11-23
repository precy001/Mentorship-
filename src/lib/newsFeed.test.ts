import assert from "node:assert/strict";
import test from "node:test";
import { appendPage, excerpt, isNewPost, newestPublishedAt, unseenCount } from "./newsFeed.ts";

const post = (id: string, publishedAt: string | null) => ({ id, publishedAt });

test("everything published is new until something has been seen", () => {
  assert.equal(isNewPost(post("a", "2026-11-20T10:00:00.000Z"), null), true);
  assert.equal(isNewPost(post("draft", null), null), false);
});

test("only posts after the last one seen are new", () => {
  const seen = "2026-11-20T10:00:00.000Z";
  const posts = [post("old", "2026-11-19T10:00:00.000Z"), post("same", seen), post("newer", "2026-11-21T08:00:00.000Z")];
  assert.equal(unseenCount(posts, seen), 1);
  assert.equal(isNewPost(posts[2], seen), true);
});

test("the newest date ignores order (pinned posts come first) and drafts", () => {
  assert.equal(newestPublishedAt([post("pinned-old", "2026-11-01T00:00:00.000Z"), post("new", "2026-11-22T00:00:00.000Z"), post("d", null)]), "2026-11-22T00:00:00.000Z");
  assert.equal(newestPublishedAt([]), null);
});

test("loading more never repeats a post", () => {
  assert.deepEqual(appendPage([post("a", null), post("b", null)], [post("b", null), post("c", null)]).map((p) => p.id), ["a", "b", "c"]);
});

test("previews are short and end cleanly", () => {
  assert.equal(excerpt("  Hello\n\n world  "), "Hello world");
  const long = excerpt("word ".repeat(100), 40);
  assert.ok(long.length <= 41 && long.endsWith("…") && !long.includes("  "));
});
