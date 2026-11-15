# How to apply `mentorship-plus-updates.zip`

1. **Back up.** Copy `C:\Users\Anita Nwaobi\Documents\Projects\mentorship-plus` to a new folder (or `git commit` everything first).
2. **Extract.** Right-click the ZIP → *Extract All…*, choose the `mentorship-plus` folder itself (the ZIP's top level mirrors the project root: `app/`, `src/`, `api/`). Choose **Replace the files in the destination** when prompted. Only files listed in `CHANGELOG.md` are touched; no secrets or `.env` files are included.
3. **Database (safe, additive).**
   ```
   cd mentorship-plus
   npm run api:db:generate
   npm run api:db:migrate        # applies 20261114090000_content_images (adds two nullable columns)
   ```
   For production on Render, run the same `prisma migrate deploy` against the production `DATABASE_URL` before/with deploying the new API build. Never use `migrate reset`.
4. **Storage.** No new variables. Ensure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET` are set on Render and the bucket is **public** (content images are stored under `content/` in the same bucket as profile photos).
5. **Validate.**
   ```
   npx tsc --noEmit
   npm run api:build
   npm run api:test
   npm run api:db:validate
   node --test src/lib/validation.test.ts   # Node 22.18+
   ```
6. **Ship.** Deploy the API first (new endpoints), then publish the app (`eas update`; no native module was added, so no new store build is needed).
