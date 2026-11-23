import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { restartingPlayer, type PlayerLike } from "./soundPlayer";

/**
 * Conversation sounds: a short "drop" when your message is sent, and a softer pop when a reply arrives while the
 * conversation is open. Both are original sounds made for Mentorship+ (assets/sounds).
 *
 * Design notes
 * - Loaded lazily, on the first sound, and guarded. expo-audio is a native module: an app binary built before it
 *   was added (an older APK that receives this code as an over-the-air update) does not contain it. There, loading
 *   fails once, is remembered, and the app simply stays silent instead of crashing.
 * - `playsInSilentMode: false`: no sound when the phone is on silent or vibrate (iPhone switch, Android ringer).
 * - `mixWithOthers`: never pauses or ducks the person's music or a call; these are UI sounds, not media.
 * - People can turn conversation sounds off; the choice is kept on this phone.
 */

export type SoundName = "sent" | "received";

type Player = { play(): Promise<void> };

const PREFERENCE_KEY = "mentorship.conversationSounds";

let players: Record<SoundName, Player> | null | undefined; // undefined = not loaded yet; null = not available here
let enabled = true;
const listeners = new Set<() => void>();

// Read the saved choice once at start-up. Until it arrives the default (on) applies.
void AsyncStorage.getItem(PREFERENCE_KEY)
  .then((value) => { if (value === "off") setEnabled(false, false); })
  .catch(() => {});

function load(): Record<SoundName, Player> | null {
  if (players !== undefined) return players;
  try {
    const audio = require("expo-audio") as typeof import("expo-audio");
    void audio.setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers", shouldPlayInBackground: false }).catch(() => {});
    const sent = audio.createAudioPlayer(require("../../assets/sounds/message-sent.wav"));
    const received = audio.createAudioPlayer(require("../../assets/sounds/message-received.wav"));
    received.volume = 0.8;
    // Each play starts from the beginning (see soundPlayer.ts: without this, every second sound was silent).
    players = { sent: restartingPlayer(sent as unknown as PlayerLike), received: restartingPlayer(received as unknown as PlayerLike) };
  } catch {
    players = null; // this app build has no audio module: stay silent
  }
  return players;
}

/** Plays a conversation sound, if sounds are on and this app build can play them. Never throws. */
export function playSound(name: SoundName): void {
  if (!enabled) return;
  const player = load()?.[name];
  if (!player) return;
  void player.play().catch(() => { /* a sound is never worth an error */ });
}

/** Loads the sounds ahead of time (e.g. when a conversation opens) so the first one plays without delay. */
export function preloadSounds(): void {
  if (enabled) load();
}

export function soundsEnabled(): boolean {
  return enabled;
}

export function setEnabled(value: boolean, persist = true): void {
  if (enabled === value) return;
  enabled = value;
  if (persist) void AsyncStorage.setItem(PREFERENCE_KEY, value ? "on" : "off").catch(() => {});
  listeners.forEach((listener) => listener());
}

/** Current on/off choice for conversation sounds, for toggles. */
export function useConversationSounds(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    soundsEnabled,
    soundsEnabled,
  );
  return [value, setEnabled];
}
