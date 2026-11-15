# Mentorship+ UI/UX overlay: how to apply

This ZIP contains only new and modified files, at their exact project-relative paths. It touches `app/` and `src/` only (23 files). No backend, database, config or dependency changes, so no `npm install` is needed.

## 1. Back up
From the project root (`C:\Users\Anita Nwaobi\Documents\Projects\mentorship-plus`):

```powershell
git status                      # commit or stash anything pending
git checkout -b uiux-upgrade    # recommended: work on a branch
```
No git? Copy the `app` and `src` folders somewhere safe first.

## 2. Extract
Extract `mentorship-plus-uiux-updates.zip` **into the project root** and choose "Replace" when prompted. Or:

```powershell
Expand-Archive -Path .\mentorship-plus-uiux-updates.zip -DestinationPath . -Force
```
You should see `CHANGELOG.md` and `README-OVERLAY.md` appear in the root. They are documentation and can be deleted.

## 3. Validate
```powershell
npx tsc --noEmit
node --test src/lib/validation.test.ts
npx expo start -c
```
Backend commands (`npm run api:build`, `npm run api:test`) are not affected.

## 4. Manual checks (not possible to run in the build environment)
- Sign in as **member, counsellor, admin and super admin**: each lands on the right dashboard.
- Register end to end: LGA, then LCDA, then profile (use the date-of-birth year picker), then email verification.
- Student: save and unsave an item, complete a goal, book and cancel an appointment, start a discussion, send a message, close it and rate it.
- Counsellor: switch availability, confirm / complete / no-show an appointment, reply in a discussion.
- Admin: switch every tab; create, edit, unpublish and delete a resource and a scholarship (including image upload); moderate a rating; auto-assign a discussion; invite a counsellor.
- Check on a small phone, a notched phone and a tablet or the web build. Turn on large system text and a screen reader (TalkBack / VoiceOver) once.

## Roll back
`git checkout -- app src` (or restore your backup copy), then delete `src/lib/format.ts`.
