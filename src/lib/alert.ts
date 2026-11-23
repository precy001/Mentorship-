import { useSyncExternalStore } from "react";

/**
 * Mentorship+ dialogs: a drop-in replacement for React Native's `Alert.alert` that renders the app's own
 * dialog (src/components/AlertHost.tsx) instead of the system one, so every message looks the same on Android
 * and iPhone. Same call shape: `AppAlert.alert(title, message?, buttons?, options?)`.
 *
 * Dialogs are queued: if one is already open, the next one appears when it closes.
 */
export type AlertTone = "success" | "error" | "warning" | "info" | "confirm" | "danger";
export type AppAlertButton = { text?: string; onPress?: () => void | Promise<void>; style?: "default" | "cancel" | "destructive" };
export type AppAlertOptions = {
  /** Tapping outside the dialog (or Android Back when there is no Cancel button) closes it. */
  cancelable?: boolean;
  /** Called when the dialog is closed without pressing a button. */
  onDismiss?: () => void;
  /** Overrides the look worked out from the title and buttons. */
  tone?: AlertTone;
};
export type AlertRequest = { id: number; title: string; message?: string; buttons: AppAlertButton[]; options: AppAlertOptions; tone: AlertTone };

let queue: AlertRequest[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const ERROR = /\b(unable|fail(ed)?|could ?n[o’']?t|cannot|can[’']t|unavailable|expired|invalid|denied|error)\b|\bnot (sent|saved|updated|submitted|requested|accepted|confirmed|cancelled|deleted|added|approved|rejected|moderated|assigned|verified)\b/i;
const WARNING = /^(check your (?!inbox)|choose|enter|add a|select|confirm your)|too short|don[’']?t match|\bneeded\b|\brequired\b|unsupported|\bno active\b|\blimit\b/i;
const SUCCESS = /\b(saved|updated|submitted|requested|accepted|sent|verified|published|deleted|assigned|confirmed|created|completed?|inbox|thank)/i;

/** Picks the dialog's icon and colour from what the message is about. */
export function inferTone(title: string, buttons: AppAlertButton[], explicit?: AlertTone): AlertTone {
  if (explicit) return explicit;
  if (buttons.some((button) => button.style === "destructive")) return "danger";
  if (title.trim().endsWith("?")) return "confirm";
  if (ERROR.test(title)) return "error";
  if (WARNING.test(title)) return "warning";
  if (SUCCESS.test(title)) return "success";
  return "info";
}

export function showAlert(title: string, message?: string, buttons?: AppAlertButton[], options: AppAlertOptions = {}) {
  const list = buttons && buttons.length ? buttons : [{ text: "OK" }];
  queue = [...queue, { id: nextId++, title, message, buttons: list, options, tone: inferTone(title, list, options.tone) }];
  emit();
}

/** Closes a dialog, then runs the pressed button's action (or onDismiss when no button was pressed). */
export function closeAlert(id: number, button?: AppAlertButton) {
  const request = queue.find((item) => item.id === id);
  if (!request) return;
  queue = queue.filter((item) => item.id !== id);
  emit();
  try {
    if (button) void button.onPress?.();
    else request.options.onDismiss?.();
  } catch {
    /* an action's own error handling decides what to show */
  }
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => queue;

/** The dialog currently on screen (the first in the queue), or null. */
export function useCurrentAlert(): AlertRequest | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot)[0] ?? null;
}

export const AppAlert = { alert: showAlert };
