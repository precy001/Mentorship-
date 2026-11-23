# Overlay: admin-only invitations, message ticks, sounds, News & updates, Policy & Guidelines

**This ZIP is cumulative.** It contains every change since the project you uploaded:
- this update;
- the back buttons, WhatsApp invitations and check-your-inbox screen;
- the custom dialogs;
- grants, NIN and the audit.

Apply only this one. If you already applied `mentorship-plus-full-update.zip`, extracting this over it is safe. No
feature was removed. The one deliberate change of behaviour is that counsellors can no longer invite counsellors;
administrators do it instead, which is what you asked for.

The ZIP holds only new and changed files, at their exact paths inside `mentorship-plus`. App files are at the top
level and API files are under `api/`. Read `DESIGN.md` for the engineering decisions, and `CHANGELOG.md` for the
full list of changes.

## 1. Install
1. Commit or back up the project.
2. Extract the ZIP **into the project root** (`C:\Users\Anita Nwaobi\Documents\Projects\mentorship-plus`) and
   choose **Replace** for every file.
3. Install the one new package (`expo-audio`, already listed in `package.json` and `package-lock.json`):
   ```
   npm install
   ```
4. Check that the files landed. In PowerShell, from the project folder:
   ```
   Test-Path "app\news\index.tsx"
   Test-Path "assets\sounds\message-sent.wav"
   Test-Path "api\prisma\migrations\20261124090000_message_receipts\migration.sql"
   Select-String -Path "package.json" -Pattern "expo-audio"
   ```
   The three `Test-Path` lines each print `True`, and the last line prints one matching line.
5. Start once with a clean cache. This also refreshes the route types, so `npx tsc --noEmit` stays clean:
   ```
   npx expo start -c
   ```

## 2. Deploy the API first (important)
The app sends new data (message ids, receipts). The new app also copes with the old API, but deploying the API first
gives everyone the full feature straight away.

1. Push the code so Render rebuilds the API.
2. Back up the database, then apply the migrations:
   ```
   npm --prefix api run prisma:migrate:deploy
   ```
   If your Render build already runs `prisma migrate deploy`, this happens automatically. There are three new
   migrations. All of them are additive and safe to run twice:
   - **Message receipts:** new columns on messages. Existing messages that already have a reply are marked as seen.
   - **News posts:** a new table.
   - **Admin-only invitations:** closes WhatsApp invitations that counsellors shared and nobody accepted. No rows are
     deleted.
3. Check that `https://mentorship-x1fa.onrender.com/api/v1/health/ready` responds, then sign in to the app as usual.

## 3. Update the app

**Over the air (all features except sound):**
```
eas update --channel preview --message "Admin-only invites, message ticks, News & updates, Policy & Guidelines"
```
Testers close and reopen the app, possibly twice.

**New APK (needed for message sounds):** `expo-audio` is native code, so sounds only play in an APK built from this
version. Older APKs get everything else and simply stay silent; they don't crash.
```
eas build -p android --profile preview
```
Install the new APK on the test phones. You only need to do this once; later updates can go over the air again.

## 4. What to test
1. **Admin invites by WhatsApp:**
   - In Admin → Accounts → Invite a counsellor, choose **WhatsApp**, enter a number and a topic, and tap
     **Invite on WhatsApp**. WhatsApp opens with the message; tap Send.
   - On the invited phone, signed in as a member, tap the link → **Open in Mentorship+** → **Accept invitation**.
   - They become a counsellor straight away. There's no approval step for admin invitations.
2. **Admin invites by email:** the same card with **Email** selected works as before.
3. **Counsellors can't invite:** the counsellor workspace no longer has the invite card.
4. **Ticks** (member on one phone, counsellor on another):
   - Send a message: a clock, then ✓.
   - When the other phone's app is open: ✓✓ grey.
   - When they open the conversation: ✓✓ blue, within a few seconds.
   - Tap the time on your message to see Message info.
   - Turn off the internet and send: the message turns red ("Not sent"). Turn it back on and tap it → Try again.
     It's sent once, never twice.
5. **Unread badge:** a new reply shows a number on the conversation in Support (member) and in the counsellor inbox.
   Opening the conversation clears it.
6. **Sounds (new APK):** sending plays a drop sound, and a reply arriving while the conversation is open plays a
   softer pop. With the phone on silent or vibrate, there's no sound. The speaker button at the top of the
   conversation turns sounds off and on.
7. **News & updates:**
   - In Admin → News, post an update (try a picture, a link and Pin).
   - As a member, it shows on Home with **New**; See all opens the feed, and the post opens with Read more and Share.
   - As a counsellor, it shows in the workspace.
   - Try Save as draft (hidden from everyone), Publish, Unpin and Delete.
8. **Policy & Guidelines:** open it from Profile (member), the counsellor workspace, and Admin → Platform. It says
   "Coming soon".

## Notes
- **Admin → Counselling → Counsellor requests** only appears if someone accepted a counsellor-shared invitation
  before this update. Approve or decline those as before; no new ones will appear.
- **iPhone testing with Expo Go** still needs SDK 58 (see the earlier note); test on the Android APK.
- **Ticks while the app is closed:** "Delivered" happens when the recipient's app is open or next opened. Ticks that
  go grey while the app is closed need push notifications, which aren't set up yet (see `DESIGN.md`).

## Rollback
1. Restore your backup (or `git checkout` the listed files) and delete the new files.
2. Run `npm install` to drop `expo-audio`.

The migrations are additive, so the new columns and table can stay if you roll back the code. The invitations they
closed would need re-sending.
