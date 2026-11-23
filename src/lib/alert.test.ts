import assert from "node:assert/strict";
import test from "node:test";
import { closeAlert, inferTone, showAlert } from "./alert.ts";

test("every dialog in the app gets a sensible look from its title", () => {
  const expected: Record<string, string> = {
    "Profile picture updated": "success", "Profile saved": "success", "Registration submitted": "success", "Check your inbox": "success",
    "Password updated": "success", "New time sent": "success", "Appointment requested": "success", "Invitation accepted": "success",
    "Unable to sign in": "error", "Upload failed": "error", "Rating not submitted": "error", "Message not sent": "error",
    "Could not save check-in": "error", "Counselling unavailable": "error", "Session expired": "error", "Invalid link": "error",
    "Check your email": "warning", "Choose your LGA": "warning", "Password too short": "warning", "Passwords don't match": "warning",
    "Photo access needed": "warning", "Sign in required": "warning", "Add a goal": "warning", "At your caseload limit": "warning",
    "Sign out?": "confirm", "Close discussion?": "confirm",
  };
  for (const [title, tone] of Object.entries(expected)) assert.equal(inferTone(title, [{ text: "OK" }]), tone, title);
  assert.equal(inferTone("Log out?", [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive" }]), "danger");
  assert.equal(inferTone("Anything", [{ text: "OK" }], "info"), "info");
});

test("closing a dialog runs the pressed button's action, or onDismiss when no button was pressed", () => {
  const order: string[] = [];
  const next = { text: "Next", onPress: () => { order.push("button pressed"); } };
  showAlert("First", "one", [next]);
  showAlert("Second", undefined, undefined, { onDismiss: () => order.push("dismissed") });
  // Ids are sequential from 1 in a fresh module.
  closeAlert(1, next);
  closeAlert(2);
  closeAlert(2); // closing twice does nothing
  assert.deepEqual(order, ["button pressed", "dismissed"]);
});
