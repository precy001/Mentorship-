# Overlay: back buttons, WhatsApp counsellor invitations, check-your-inbox step, custom dialogs, grants, NIN and more

This ZIP is cumulative. It contains everything since the project you uploaded: the grants/NIN/audit update, the
custom dialogs, and the latest additions. Apply only this one. If you already applied an earlier ZIP, extracting
this one over it is safe; the shared files are the same, with the new changes added.

This ZIP holds only new and changed files, at their exact paths inside `mentorship-plus` (app files at the top
level, API files under `api/`). `AUDIT.md` has the full audit.

## 1. Install
1. Commit or back up the project.
2. Extract this ZIP **into the project root** (`C:\Users\Anita Nwaobi\Documents\Projects\mentorship-plus`) and
   choose **Replace** for every file. Don't copy files by hand, because several share names (`index.tsx`).
3. Check it landed (PowerShell, project folder):
   ```
   Test-Path "app\content\[kind]\[id].tsx"
   Test-Path "api\prisma\migrations\20261123120000_grants_and_audience\migration.sql"
   Select-String -Path "app\(student)\explore.tsx" -Pattern "Grants"
   ```
   The first two print `True`, and the last one prints matching lines.

## 2. Deploy the API first (important)
The API rejects fields it doesn't recognise. If the app update reaches phones before the new API is live,
registration fails with "property nin should not exist". So, in this order:

1. Push the code so Render rebuilds the API.
2. Apply the migrations to the production database (back up first). There are two new ones, and this single
   command applies both:
   ```
   npm --prefix api run prisma:migrate:deploy
   ```
   If your Render build command already runs `prisma migrate deploy`, this happens automatically. The migration
   adds the grants table, audience columns and 5 placeholder grants, and marks existing scholarships as "for
   students". It doesn't delete anything.
3. Check that `https://mentorship-x1fa.onrender.com/api/v1/content/grants` returns a list of 5 grants.

## 3. Then update the app
All app changes are JavaScript (no new native modules), so an over-the-air update works:
```
eas update --channel preview --message "Grants, audience targeting, NIN, insights fix"
```
Testers should close and reopen the app (possibly twice). For local testing: `npx expo start -c`.

## 4. What to test
1. **Tab bar (Android):** scroll Home over a photo. The bottom bar should be solid white, with nothing showing
   through or around it.
2. **Mood → insights:** Activities → Wellbeing check-in → save a mood. "Your week" updates straight away. Then go to
   Profile: "Mood check-ins" has gone up by one.
3. **Grants targeting:** as an admin, open Admin → Grants and publish a grant for one subcategory (for example
   Artisan). Sign in as a member in that subcategory: it shows in Explore → Grants and on Home. A student member
   shouldn't see it.
4. **Who is this for? on resources and scholarships:** create one of each for a specific group and confirm who
   can see it.
5. **NIN:** register a new account (NIN is required, 11 digits). An existing member sees "Complete your profile"
   on Home. Add the NIN in Profile → Save details, and the prompt disappears.
6. **Item page:** tap any card on Home or Explore. You should get the full text, deadline, Save, Share and (if a
   link is set) Apply.
7. **Back buttons:** open Explore, Support, Activities and Profile. Each has Back (to Home). Sign out: the sign-in
   screen has Back (to the welcome screen). As an admin, open any section: "‹ Overview" takes you back.
8. **Check your inbox:** register a new account. You should land on "Check your inbox" with the Spam reminder.
   Try signing in before verifying: you get "Verify your email first" with a Resend option.
9. **WhatsApp invitation:** as a counsellor, enter a WhatsApp number in "Invite a counsellor" and tap Invite on
   WhatsApp. WhatsApp should open with the message. On the invited phone (with the app installed and signed in as a
   member), tap the link, then Open in Mentorship+, then Accept invitation. That shows "Request sent". As an admin, go
   to Counselling → Counsellor requests and tap Approve. The invited person reopens the app and sees the counsellor
   workspace.
10. **Dialogs:** change your profile picture, log out, or submit a form with a mistake. Each message should appear in
   the new Mentorship+ dialog (rounded card with an icon), not the grey system box, on both Android and iPhone.
11. **Conversation:** open a discussion on two phones (member and counsellor). A reply appears on the other phone
   within about 15 seconds without leaving the screen.

## Placeholder grants
The 5 placeholder grants say "Mentorship+ (placeholder listing)" and explain they are placeholders. Edit them into
real opportunities, or unpublish them, in Admin → Grants before launch.

## Rollback
Restore your backup or `git checkout` the listed files, and delete the new files. The database migration is
additive. If you roll back the code, the extra columns and grants table can stay in place without harm.
