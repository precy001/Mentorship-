# Mentorship+ — Phase 3 Authentication Overlay

This is an incremental patch for the existing `mentorship-plus` workspace. It is not a replacement project. It adds authentication files and a new Prisma migration; keep the existing mobile app and current database configuration.

## What is included

- Member registration and bcrypt password hashing
- Email verification with random, expiring, single-use tokens stored as SHA-256 hashes
- Login with 15-minute signed JWT access tokens
- Password reset with expiring, single-use tokens
- Current-user endpoint (`GET /api/v1/auth/me`)
- JWT authentication guard, role decorator, and role guard for future protected modules
- Auth audit events
- SMTP email sender; development without SMTP logs the action link to the API terminal only
- Additive Prisma migration; no database reset

## Apply this to your existing workspace

1. Stop the API terminal with `Ctrl+C`.
2. Extract this ZIP somewhere temporary.
3. Copy/merge the `api` folder from this ZIP into your existing workspace's `api` folder. Allow the included files to overwrite matching files. Do not replace the root mobile `app`, `src`, `assets`, or root `package.json` folders/files.
4. Open the existing workspace root in VS Code, not the temporary extracted folder.
5. Open `api/.env`. Keep the working `DATABASE_URL` and all existing values. Add a new `JWT_ACCESS_SECRET` value and the other optional settings below. Do not paste your real secrets into chat or commit `.env`.

Generate a secret in PowerShell from the workspace root:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Add to `api/.env` (use the generated value for the secret):

```dotenv
JWT_ACCESS_SECRET="PASTE_YOUR_GENERATED_SECRET_HERE"
AUTH_ACTION_BASE_URL="mentorshipplus://auth"
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
```

6. From the existing workspace root, install dependencies in the API package only:

```powershell
npm --prefix api install
```

7. Regenerate Prisma Client to match the updated schema:

```powershell
npm run api:db:validate
npm run api:db:generate
```

8. Apply the new additive migration. Do not run `prisma migrate reset` and do not delete the database:

```powershell
npm run api:db:migrate
```

9. Start the API:

```powershell
npm run api:dev
```

The existing root-level `api:dev` command should continue to run the API from the same workspace.

## Endpoints

All paths use the configured API prefix, default `api/v1`:

- `POST /api/v1/auth/register` — `{ "email": "member@example.com", "displayName": "Example Member", "password": "a-long-password", "phoneNumber": "+234..." }`
- `POST /api/v1/auth/verify-email` — `{ "token": "raw-token-from-email-link" }`
- `POST /api/v1/auth/resend-verification` — `{ "email": "member@example.com" }`
- `POST /api/v1/auth/login` — `{ "email": "member@example.com", "password": "a-long-password" }`
- `POST /api/v1/auth/forgot-password` — `{ "email": "member@example.com" }`
- `POST /api/v1/auth/reset-password` — `{ "token": "raw-token-from-reset-link", "newPassword": "another-long-password" }`
- `GET /api/v1/auth/me` — requires `Authorization: Bearer <accessToken>`

## Local verification without SMTP

In development only, if SMTP variables are not configured, the API logs the verification/reset action link to the API terminal. Use the token from that local link as the JSON `token` in the relevant POST request. The public API intentionally does not return raw verification/reset tokens. Do not enable this development fallback in production.

The `mentorshipplus://auth` action base is a placeholder deep link. The Expo app must later handle these deep links and call the verification/reset POST endpoints. Actual email delivery and mobile deep-link handling are integration work and must be completed before production launch.

## Quick smoke test

Use Postman, Insomnia, or PowerShell `Invoke-RestMethod` against `http://localhost:4000/api/v1` (adjust port/prefix if your `.env` differs):

```powershell
$body = @{ email = 'test.member@example.com'; displayName = 'Test Member'; password = 'ChangeThisPassword123!' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:4000/api/v1/auth/register' -ContentType 'application/json' -Body $body
```

Then copy the local development verification token from the API terminal and POST it to `/auth/verify-email`. Log in, copy `accessToken`, and call `/auth/me` with a Bearer authorization header. Use a fresh test email address; registration intentionally rejects duplicates.

## Important limits / next work

- The app's existing sign-in/sign-up screens are not automatically wired to these endpoints by this API-only overlay. Mobile API integration and deep-link handling should be done after backend smoke tests pass.
- Counsellor invitations, account administration, and assignment enforcement belong to the later counsellor/admin phases. Never promote a member by accepting a client-supplied `role` field; registration always creates a `MEMBER`.
- Add rate limiting, refresh-token/session revocation, production email templates/deep links, and security tests before production launch. Access tokens expire after 15 minutes; users sign in again after expiry until refresh sessions are implemented.
- This patch has been prepared to fit the Phase 2 schema and conventions, but must be compiled and smoke-tested in your actual workspace and database before treating Phase 3 as complete.
