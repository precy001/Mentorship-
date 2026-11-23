# Overlay: grants, audience targeting, NIN, insights fix and UX improvements

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
2. Apply the migration to the production database (back up first):
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
7. **Conversation:** open a discussion on two phones (member and counsellor). A reply appears on the other phone
   within about 15 seconds without leaving the screen.

## Placeholder grants
The 5 placeholder grants say "Mentorship+ (placeholder listing)" and explain they are placeholders. Edit them into
real opportunities, or unpublish them, in Admin → Grants before launch.

## Rollback
Restore your backup or `git checkout` the listed files, and delete the new files. The database migration is
additive. If you roll back the code, the extra columns and grants table can stay in place without harm.
