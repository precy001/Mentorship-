import assert from "node:assert/strict";
import test from "node:test";
import { counsellorInvitationText, looksLikePhoneNumber, whatsAppChatUrl } from "./invitation.ts";

test("phone numbers: local and international formats pass, short ones do not", () => {
  assert.equal(looksLikePhoneNumber("0803 123 4567"), true);
  assert.equal(looksLikePhoneNumber("+234 803 123 4567"), true);
  assert.equal(looksLikePhoneNumber("12345"), false);
  assert.equal(looksLikePhoneNumber("1234567890123456"), false);
});

test("the message greets by first name and carries the link", () => {
  const text = counsellorInvitationText({ name: "  Ada Okafor ", link: "https://api.example.com/invite/abc" });
  assert.match(text, /^Hi Ada, /);
  assert.match(text, /https:\/\/api\.example\.com\/invite\/abc/);
  assert.match(counsellorInvitationText({ link: "x" }), /^Hi, /);
});

test("the WhatsApp link uses digits only and encodes the message", () => {
  assert.equal(whatsAppChatUrl("+234 803", "Hi & welcome"), "https://wa.me/234803?text=Hi%20%26%20welcome");
});
