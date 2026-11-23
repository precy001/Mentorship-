# Fix: chat spacing on iPhone and missing message sounds

Extract into the project root (`mentorship-plus`) and choose **Replace**. Only these files change:

- `app/discussion/[id].tsx`
- `src/components/UI.tsx`
- `src/lib/sounds.ts`
- `src/lib/soundPlayer.ts` (new) and `src/lib/soundPlayer.test.ts` (new)
- `src/lib/receipts.ts` and `src/lib/receipts.test.ts`

Then restart with a clean cache: `npx expo start -c`. Over the air: `eas update --channel preview`.

## What was wrong
1. **Big empty space above the message box (iPhone).** The conversation screen made room for the keyboard twice:
   once by moving the screen up, and again by padding the message list. Now only the screen moves. The newest
   message sits just above the message box, and it stays in view when the keyboard opens.
2. **Every second message had no sound.** After a sound finishes, the player is left at the end. The rewind takes
   a moment, and play was pressed before it finished, so every second play started at the end (silence). Now the
   player rewinds as soon as a sound ends, and waits for the rewind before playing. `soundPlayer.test.ts`
   reproduces the old on/off pattern and checks the fix.
3. **Found while testing.** A message you had just sent could briefly disappear if an automatic check crossed paths
   with the send. New messages from the server are now merged with what's on screen instead of replacing it.
