import assert from "node:assert/strict";
import test from "node:test";
import { restartingPlayer, type PlayerLike } from "./soundPlayer.ts";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Behaves like a native player: rewinding takes a moment, and a sound played from the end is silent. */
class FakePlayer implements PlayerLike {
  currentTime = 0;
  playing = false;
  readonly duration = 0.16;
  /** Where each play started; a start at the end means nothing was heard. */
  starts: number[] = [];
  private listeners: ((status: { didJustFinish?: boolean }) => void)[] = [];
  private readonly events: boolean;
  constructor(events = true) { this.events = events; }
  addListener(_event: "playbackStatusUpdate", listener: (status: { didJustFinish?: boolean }) => void) { if (this.events) this.listeners.push(listener); }
  play() {
    this.starts.push(this.currentTime);
    if (this.currentTime >= this.duration) return; // at the end: silence
    this.playing = true;
    setTimeout(() => { this.playing = false; this.currentTime = this.duration; this.listeners.forEach((l) => l({ didJustFinish: true })); }, 5);
  }
  pause() { this.playing = false; }
  seekTo(seconds: number) { return new Promise<void>((resolve) => setTimeout(() => { this.currentTime = seconds; resolve(); }, 2)); }
  heard() { return this.starts.map((start) => start < this.duration); }
}

test("the old way (rewind and play at the same moment) is silent every second time", async () => {
  const player = new FakePlayer();
  for (let i = 0; i < 4; i += 1) { void player.seekTo(0); player.play(); await wait(20); }
  assert.deepEqual(player.heard(), [true, false, true, false]);
});

test("every message plays its sound", async () => {
  const player = new FakePlayer();
  const sound = restartingPlayer(player);
  for (let i = 0; i < 6; i += 1) { await sound.play(); await wait(20); }
  assert.deepEqual(player.heard(), [true, true, true, true, true, true]);
});

test("works even if the player sends no 'finished' events", async () => {
  const player = new FakePlayer(false);
  const sound = restartingPlayer(player);
  for (let i = 0; i < 4; i += 1) { await sound.play(); await wait(20); }
  assert.deepEqual(player.heard(), [true, true, true, true]);
});

test("two quick messages each start from the beginning", async () => {
  const player = new FakePlayer();
  const sound = restartingPlayer(player);
  await sound.play(); await wait(20);
  await Promise.all([sound.play(), sound.play()]);
  await wait(20);
  assert.deepEqual(player.heard(), [true, true, true]);
});
