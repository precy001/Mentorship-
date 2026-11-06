# Mentorship+ profile and identity patch

## Included
- Gallery-based profile picture selection and server upload.
- Supabase Storage-backed image persistence, with the resulting URL saved on `UserProfile.avatarUrl`.
- Avatar URL returned by login and `/auth/me`, restored after app restart.
- Profile screen cleanup: removed Reset Demo Data, removed profile demo wording, retained Saved items / Help / Log out, and added Verify NIN immediately before Your Activity.
- Honest NIN state: the current repository has no NIN verification provider, endpoint, or persistence model. The button therefore reports that verification is unavailable and does not claim success.
- Splash logo container corrected to remove the dark backing around the supplied logo.

## Apply
From the project root:
```bash
git apply mentorship-plus-fixes.patch
```

## Required dependency
This patch adds `expo-image-picker` to `package.json`. Install the SDK-compatible Expo package and refresh the lockfile:
```bash
npx expo install expo-image-picker
```
This is required because the uploaded project did not contain an image-picker module. Do not use `npm ci` until the lockfile has been refreshed.

## Supabase Storage configuration
Create a **public** Supabase Storage bucket named `profile-avatars` (or set another bucket name). Configure these variables in `api/.env`:
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=profile-avatars
```
Keep the service-role key exclusively in the backend environment. Never put it in the Expo app or `EXPO_PUBLIC_*` variables. The API uses it server-side to upload images; the database stores the public object URL. Limit access to this bucket according to your privacy policy.

Apply the included Prisma migration using the project's normal deployment process:
```bash
cd api
npx prisma migrate deploy
npx prisma generate
```
Do not reset the database.

## NIN verification limitation
The inspected source contains no NIN verification API/provider or NIN verification status field. The button is present in the requested position but deliberately does not simulate verification. A provider integration, credentials, consent flow, and server-side verification contract are still required.

## Validation
The patch was generated against the uploaded ZIP's source baseline. This environment did not have the project's installed dependencies or access to the user's Supabase project, so a full Expo typecheck, Nest build, device upload, and live persistence test could not be executed here.
