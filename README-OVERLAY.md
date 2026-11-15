# Applying `mentorship-plus-service-areas-fix.zip`

1. **Back up** `C:\Users\Anita Nwaobi\Documents\Projects\mentorship-plus` (copy the folder, or commit to git).
2. **Extract** the ZIP into the `mentorship-plus` folder and choose *Replace the files in the destination*. Only the files in `CHANGELOG.md` are touched. No `.env` files or `node_modules` are included. No new dependencies.
3. **Apply the migration (this restores the areas).** From the project root, with `api/.env` pointing at the database you want to fix:
   ```
   npm run api:db:generate
   npm run api:db:migrate
   ```
   Do this for **production too**: run `npx prisma migrate deploy` with the production `DATABASE_URL` (or make sure your Render start/build step runs it). It only inserts missing rows; it never deletes data, never overwrites rows that exist, and can be run any number of times. `npm run api:db:seed` is optional and equally repeatable.
4. **Validate:**
   ```
   npx tsc --noEmit
   npm run api:build
   npm run api:test
   npm run api:db:validate
   ```
5. **Deploy** the API, then publish the app (no native change, so an OTA update is enough).
6. **Check:** open registration, pick an LGA, confirm only its LCDAs appear. In Admin → Platform → LGA/LCDA access management, disable an LCDA and reopen the LCDA list in registration; it is gone.

Note: `20261113120000_phase5_activity_records` and `20261113130000_phase5_admin_platform` both create the same tables. An existing database is unaffected, but a brand-new empty database would fail at the second one. I did not edit applied migrations; see the notes in the delivery message.
