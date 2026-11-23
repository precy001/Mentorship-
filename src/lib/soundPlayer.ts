/**
 * Plays a short sound from the start, every time. Kept free of React Native so it can be unit tested.
 *
 * Why this exists: after a sound finishes, the audio player stays at the end. Rewinding (`seekTo(0)`) takes a
 * moment, so pressing play straight after asking for the rewind started at the end, which is silence: every
 * second message was silent. Now the player is rewound as soon as a sound finishes (so the next one starts
 * instantly), and before playing it waits for the rewind if the player isn't at the start yet. Plays go through a
 * queue, so two quick messages can't mix up one's rewind with the other's play.
 */

/** The parts of an expo-audio player this needs. */
export type PlayerLike = {
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  readonly currentTime: number;
  readonly playing: boolean;
  addListener?(event: "playbackStatusUpdate", listener: (status: { didJustFinish?: boolean }) => void): unknown;
};

/** Anything past this (in seconds) counts as "not at the start". */
const START_TOLERANCE = 0.01;

export function restartingPlayer(player: PlayerLike): { play(): Promise<void> } {
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void> | void) => {
    queue = queue.then(task).catch(() => {});
    return queue;
  };
  try {
    player.addListener?.("playbackStatusUpdate", (status) => {
      if (status?.didJustFinish) void enqueue(() => player.seekTo(0));
    });
  } catch { /* no status events: the check before each play still rewinds */ }
  return {
    play: () => enqueue(async () => {
      if (player.playing) player.pause();
      if (player.currentTime > START_TOLERANCE) await player.seekTo(0);
      player.play();
    }),
  };
}
