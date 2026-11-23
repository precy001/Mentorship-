import assert from "node:assert/strict";
import test from "node:test";
import {
  conversationSignature, makeClientId, markedSeen, newIncoming, nextPollDelay, POLL_ACTIVE_MS, POLL_IDLE_MS,
  receiptFor, sideOf, stillPending, unseenFromOtherSide, withMessage,
} from "./receipts.ts";

const msg = (id: string, author: string, extra: Record<string, unknown> = {}) => ({ id, author: { id: author }, createdAt: `2026-11-23T10:0${id.slice(-1)}:00.000Z`, ...extra });

test("ticks follow the server's receipt times", () => {
  assert.equal(receiptFor({}), "sent");
  assert.equal(receiptFor({ deliveredAt: "t" }), "delivered");
  assert.equal(receiptFor({ deliveredAt: "t", readAt: "t" }), "seen");
  assert.equal(receiptFor({ readAt: "t" }), "seen"); // seen implies delivered
});

test("the member and the staff are the two sides", () => {
  assert.equal(sideOf("m", "m"), "member");
  assert.equal(sideOf("c", "m"), "staff");
  assert.equal(sideOf(undefined, "m"), "staff");
});

test("only the other side's unseen messages are marked as seen", () => {
  const messages = [msg("1", "m"), msg("2", "c"), msg("3", "a"), msg("4", "c", { readAt: "t" })];
  assert.deepEqual(unseenFromOtherSide(messages, "m", "m").map((m) => m.id), ["2", "3"]); // member sees staff (counsellor + admin)
  assert.deepEqual(unseenFromOtherSide(messages, "c", "m").map((m) => m.id), ["1"]); // counsellor sees the member's
});

test("new incoming messages exclude my own and ones already shown", () => {
  const before = [msg("1", "m")];
  const after = [msg("1", "m"), msg("2", "m"), msg("3", "c")];
  assert.deepEqual(newIncoming(before, after, "m").map((m) => m.id), ["3"]);
});

test("a pending message disappears once the server copy arrives, so it is never shown twice", () => {
  const pending = [
    { clientId: "abc12345", body: "hi", createdAt: "t", state: "sending" as const },
    { clientId: "zzz12345", body: "yo", createdAt: "t", state: "failed" as const },
  ];
  assert.deepEqual(stillPending(pending, [{ clientId: "abc12345" }, { clientId: null }]).map((p) => p.clientId), ["zzz12345"]);
});

test("adding the sent message keeps time order and ignores one a poll already added", () => {
  const list = [msg("1", "m"), msg("3", "c")];
  assert.deepEqual(withMessage(list, msg("2", "m")).map((m) => m.id), ["1", "2", "3"]);
  assert.equal(withMessage(list, msg("1", "m")), list);
});

test("marking seen locally fills both times without overwriting existing ones", () => {
  const out = markedSeen([msg("1", "c", { deliveredAt: "early" }), msg("2", "c")], new Set(["1"]), "now");
  assert.deepEqual([out[0].deliveredAt, out[0].readAt, (out[1] as { readAt?: string }).readAt], ["early", "now", undefined]);
});

test("the signature changes when a receipt changes, not otherwise", () => {
  const a = conversationSignature("IN_PROGRESS", [msg("1", "m")]);
  assert.equal(a, conversationSignature("IN_PROGRESS", [msg("1", "m")]));
  assert.notEqual(a, conversationSignature("IN_PROGRESS", [msg("1", "m", { deliveredAt: "t" })]));
  assert.notEqual(a, conversationSignature("COMPLETED", [msg("1", "m")]));
});

test("client ids satisfy the server rule and differ between messages", () => {
  const ids = new Set(Array.from({ length: 500 }, () => makeClientId()));
  assert.equal(ids.size, 500);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9_-]{8,64}$/);
  assert.match(makeClientId(0, () => 0), /^[A-Za-z0-9_-]{8,64}$/);
});

test("checks are quicker right after activity", () => {
  const now = 1_000_000;
  assert.equal(nextPollDelay(now - 10_000, now), POLL_ACTIVE_MS);
  assert.equal(nextPollDelay(now - 10 * 60_000, now), POLL_IDLE_MS);
});
