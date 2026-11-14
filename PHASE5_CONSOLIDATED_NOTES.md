# Mentorship+ — Consolidated Phase 5 update

This package is a consolidated source update based on the supplied `Mentor.zip`. It preserves the existing app structure and UI rather than rebuilding the application.

## Included implementation

- Existing Admin and Super Admin dashboard workflows remain server-backed: account search and role management, counsellor invitations, topic assignment, service-area controls, resource and scholarship publishing, discussion auto-assignment, appointment oversight, rating moderation, and audit-log review.
- Added Admin controls for counsellor availability (Available, Offline, On leave). The API enforces the five-active-discussion capacity limit; Busy remains system-managed when the fifth active discussion is assigned.
- Added role-aware route redirects for restored sessions and direct access to the Admin and Counsellor dashboard routes.
- Discussion messages now create recipient notifications and audit entries in the same database transaction. Discussion status transitions are validated, closure releases assignments, and counsellor availability is recalculated.
- Appointment status transitions are validated. Completing or marking an appointment as a no-show before its scheduled start is rejected. Status changes, notifications and audit entries are committed together.
- Added the missing Prisma migration for platform notifications, counsellor invitations, resources, scholarships and service areas. The existing schema already defined these models, but the earlier migrations did not create their tables.
- Removed hard-coded sample university entries. The screen now clearly states that a verified directory has not yet been connected rather than showing unverified sample data.
- Existing persistent account category/subcategory switching, Activities records, discussion/appointment workflows, ratings and notifications are retained.

## Administrator account

The database promotion and email-verification SQL for `devultimate362@gmail.com` has already been applied by the project owner. Do not run the old promotion SQL again. Sign in using that existing account and its existing password after the API is deployed.

## Apply and deploy

1. Back up the project and database before applying the update.
2. Extract this ZIP over the existing project folder. Do not delete your `.env` files or replace your local secrets. This package intentionally excludes `.env`, `node_modules`, `.git`, and generated build directories.
3. Deploy the backend source and migration. In the `api` directory, run:

   ```powershell
   npm ci
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   ```

4. Configure the Render service to build from the `api` directory (or use the repository root with the `api` prefix) and start with:

   ```text
   npm run start:prod
   ```

   The production entry point is `dist/src/main.js`. Keep the existing Render environment variables, including `DATABASE_URL`, `JWT_ACCESS_SECRET`, `BREVO_API_KEY`, `EMAIL_FROM`, and the Supabase storage variables. Do not paste secrets into source files or commit them.

5. After the backend is healthy and the migration has succeeded, from the mobile project root run:

   ```powershell
   npm ci
   npx eas-cli@latest update --channel preview --environment preview --message "Consolidated Phase 5 implementation"
   ```

   This publishes the JavaScript update to compatible installed preview builds. If native dependencies or app configuration are changed later, create a new APK instead of relying on OTA.

## Acceptance checks to perform against the deployed environment

- Sign in as `devultimate362@gmail.com`; confirm the Admin dashboard opens and the account is shown as `ADMIN` and email-verified.
- Confirm a normal member cannot access Admin endpoints or view Admin data by navigating directly to the route.
- As Super Admin, promote and revoke an existing member's Admin role. Confirm an ordinary Admin cannot appoint or modify Admin accounts.
- Invite a counsellor, accept the invitation with the invited account, and confirm assigned topics persist after signing out and back in.
- Confirm counsellors only see their own assigned discussions; verify that the sixth active discussion cannot be assigned and that closing a discussion releases capacity.
- Send discussion messages from both sides and confirm the other participant receives a notification.
- Request an appointment, confirm it as the counsellor, and verify invalid status transitions and early completion/no-show are rejected.
- Create and update career assessment, wellbeing check-in and personal-goal records; confirm they persist after sign-out/sign-in.
- Switch between Education & Learning and Work & Career subcategories; confirm the selected values persist and the dashboard reflects the new selection without deleting unrelated profile data.
- Publish/unpublish a resource and scholarship; enable/disable a service area; moderate a rating; confirm each change persists and appears in the audit log.
- Check that no sample university entries or demo account records are displayed.

## Verification boundary

The source-level checks completed for this package were: TypeScript/TSX transpile parsing of all 80 source files (zero syntax diagnostics), relative-import existence checks (zero missing relative imports), JSON configuration parsing, API-client import/export checks, and Prisma schema-to-migration table and scalar-column coverage (21 models covered).

Dependency installation timed out in this environment. Therefore a full Nest build, Expo build, Jest suite, Prisma CLI validation, and live database/API acceptance tests could not be run here. Those checks must be completed in the project's normal development/deployment environment before treating this release as production-approved.

Known integrations not implemented in this phase remain explicitly unavailable rather than simulated: NIN verification, automated AI counselling, and a verified university directory. No claim is made that those external integrations are active.
