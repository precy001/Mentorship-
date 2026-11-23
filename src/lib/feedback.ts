import { useCallback, useEffect, useRef, useState } from "react";
import { AppAlert } from "./alert";

import { ApiError } from "./api";

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError && error.status === 401) return "Your session has expired. Please sign in again.";
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function isSessionExpired(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Mentorship+ confirmation dialog as a promise. Resolves false when cancelled or dismissed. */
export function confirmAction(options: {
  title: string;
  message: string;
  confirmText?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    AppAlert.alert(
      options.title,
      options.message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: options.confirmText ?? "Confirm",
          style: options.destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export type ToastState = { id: number; message: string; tone: "success" | "error" } | null;

/** Short-lived, non-blocking status message for low-impact confirmations. */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (message: string, tone: "success" | "error" = "success") => {
      if (timer.current) clearTimeout(timer.current);
      counter.current += 1;
      setToast({ id: counter.current, message, tone });
      timer.current = setTimeout(() => setToast(null), tone === "error" ? 6000 : 3500);
    },
    [],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { toast, show, hide };
}
