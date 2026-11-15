// Run with: node --test src/lib/validation.test.ts   (Node 22.18+; no dependencies required)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  daysUntil, digitsOnly, endOfDayIso, formatDisplayDate, hasErrors, mimeTypeFromUri, normalizePhone,
  parseDateString, toDateString, validateChoice, validateDateString, validateEmail, validateImageMeta,
  validateInteger, validateLength, validatePhone, validateRequired,
} from "./validation.ts";

test("required and length rules trim whitespace", () => {
  assert.equal(validateRequired("   ", "Title"), "Title is required.");
  assert.equal(validateRequired(" a ", "Title"), null);
  assert.equal(validateLength("a", "Title", { min: 2, max: 10 }), "Title must be at least 2 characters.");
  assert.equal(validateLength("a".repeat(11), "Title", { min: 2, max: 10 }), "Title must be 10 characters or fewer.");
  assert.equal(validateLength("", "Notes", { max: 10, required: false }), null);
  assert.equal(validateChoice("", "Category"), "Select a category.");
});

test("email validation", () => {
  for (const ok of ["a@b.co", "first.last+tag@example.com"]) assert.equal(validateEmail(ok), null);
  for (const bad of ["", "plain", "a@b", "a b@c.com", "a@b.c", "@x.com"]) assert.notEqual(validateEmail(bad), null);
  assert.equal(validateEmail("", { required: false }), null);
});

test("phone validation accepts international and Nigerian local formats only", () => {
  for (const ok of ["+2348012345678", "08012345678", "+234 801 234 5678", "0801-234-5678", "+1 (415) 555-2671"]) {
    assert.equal(validatePhone(ok), null, ok);
  }
  for (const bad of ["", "12345", "abcdefghijk", "+0123456789", "080123456789012", "0801234567"]) {
    assert.notEqual(validatePhone(bad), null, bad);
  }
  assert.equal(validatePhone("", { required: false }), null);
  assert.equal(normalizePhone("+234 (801) 234-5678"), "+2348012345678");
});

test("numeric fields reject anything that is not a whole number in range", () => {
  assert.equal(digitsOnly("1a2-3 "), "123");
  assert.equal(validateInteger("5", "Reading time", { min: 1, max: 180 }), null);
  assert.equal(validateInteger("0", "Reading time", { min: 1, max: 180 }), "Reading time must be at least 1.");
  assert.equal(validateInteger("181", "Reading time", { min: 1, max: 180 }), "Reading time must be 180 or less.");
  assert.equal(validateInteger("5.5", "Reading time", { min: 1 }), "Reading time must be a whole number.");
  assert.equal(validateInteger("-3", "Reading time", { min: 1 }), "Reading time must be a whole number.");
  assert.equal(validateInteger("", "Reading time", { min: 1 }), "Reading time is required.");
});

test("date parsing is strict about real calendar days", () => {
  assert.ok(parseDateString("2027-02-28"));
  assert.equal(parseDateString("2027-02-30"), null);
  assert.equal(parseDateString("2027-13-01"), null);
  assert.equal(parseDateString("01/02/2027"), null);
  assert.equal(toDateString(new Date(2027, 0, 5)), "2027-01-05");
  assert.equal(validateDateString("", "Deadline"), "Choose a deadline.");
  assert.equal(validateDateString("2020-01-01", "Deadline", { min: "2026-11-14" }), "Deadline cannot be before 14 Nov 2026.");
  assert.equal(validateDateString("2026-11-14", "Deadline", { min: "2026-11-14" }), null);
  assert.equal(formatDisplayDate("2026-11-14"), "14 Nov 2026");
});

test("deadlines end at 23:59:59 local time on the chosen day", () => {
  const iso = endOfDayIso("2027-02-01");
  const local = new Date(iso);
  assert.deepEqual([local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes()], [2027, 1, 1, 23, 59]);
  assert.throws(() => endOfDayIso("nope"));
});

test("daysUntil counts calendar days", () => {
  const now = new Date(2026, 10, 14, 15, 0);
  assert.equal(daysUntil(new Date(2026, 10, 14, 23, 59).toISOString(), now), 0);
  assert.equal(daysUntil(new Date(2026, 10, 21, 1, 0).toISOString(), now), 7);
  assert.equal(daysUntil(new Date(2026, 10, 13, 10, 0).toISOString(), now), -1);
});

test("image metadata is checked for type and size", () => {
  assert.equal(validateImageMeta({ mimeType: "image/png", size: 1000 }), null);
  assert.equal(validateImageMeta({ mimeType: "image/webp" }), null);
  assert.equal(validateImageMeta({ mimeType: "image/gif", size: 10 }), "Choose a JPG, PNG or WebP image.");
  assert.match(validateImageMeta({ mimeType: "image/jpeg", size: 6 * 1024 * 1024 }) ?? "", /5 MB or smaller/);
  assert.notEqual(validateImageMeta({ mimeType: "image/jpeg", size: 0 }), null);
  assert.equal(mimeTypeFromUri("file:///a/b/photo.JPG"), "image/jpeg");
  assert.equal(mimeTypeFromUri("file:///a/b/photo.png?x=1"), "image/png");
  assert.equal(mimeTypeFromUri("file:///a/b/photo.heic"), null);
});

test("hasErrors ignores empty entries", () => {
  assert.equal(hasErrors({ a: null, b: undefined, c: "" }), false);
  assert.equal(hasErrors({ a: null, b: "Bad" }), true);
});
