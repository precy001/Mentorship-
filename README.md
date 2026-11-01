# Mentorship+ — Unified Mobile + Backend Workspace

This repository contains the existing Mentorship+ Expo mobile application and the NestJS backend foundation in one workspace. Open the **`mentorship-plus` root folder** in VS Code. The mobile app remains at the root; the API is in `api/`. This layout avoids rebuilding or moving the existing mobile screens.

> **Current phase status:** Phase 2 backend foundation. The API scaffold and database schema exist, but authentication, role guards, counselling assignment APIs, and production mobile-to-API integration are not implemented yet. Until those later phases are complete, the mobile app may still use its existing local demo state.

## Requirements

- Node.js 22 LTS recommended for the Expo mobile app (the API requires Node.js 20.11+).
- npm (included with Node.js).
- A PostgreSQL database. Supabase is the recommended managed option; a local PostgreSQL installation also works.
- Git and a GitHub account for version control.
- VS Code (recommended).

## One-workspace setup in VS Code

1. Extract the ZIP to a folder such as `C:\Projects\mentorship-plus`.
2. Open VS Code → **File → Open Folder** → select the `mentorship-plus` folder (not `api`).
3. Use two integrated terminals: one for the mobile app at the workspace root, and one for the API using the root scripts below.
4. Do not move the existing `app/`, `src/`, or `assets/` folders during this phase.

## Install dependencies

In Terminal 1, at the workspace root:

```powershell
npm install
```

In Terminal 2, also at the workspace root:

```powershell
npm run api:install
```

Keep both `package-lock.json` files in Git once npm generates them: the root lockfile belongs to the mobile app, and `api/package-lock.json` belongs to the backend. Do not commit either `node_modules` folder.

## Set up the database (Supabase recommended)

1. Sign in to the official Supabase dashboard and create a new project named `mentorship-plus-dev`.
2. Choose a strong database password and store it in a password manager. Do not put it in source code or send it in chat.
3. Wait until the database has finished provisioning. Open the project’s **Connect** panel or database connection settings and copy a PostgreSQL connection string. For local Prisma migration commands, use a connection method supported by Prisma CLI. If the direct connection is unreachable from your network (for example, IPv6 restrictions), use Supabase’s documented session-pooler connection details.
4. From the workspace root, create the backend environment file:

   ```powershell
   Copy-Item api/.env.example api/.env
   ```

5. Open `api/.env` and replace `DATABASE_URL` with your actual connection string. Keep the URL quoted if it contains special characters. URL-encode reserved characters in the password if required by the connection string format. Never commit `api/.env`.
6. Do not expose this connection string to the mobile app. It is a backend-only secret.

Supabase official setup guide: https://supabase.com/docs/guides/database/connecting-to-postgres

### Local PostgreSQL alternative

If PostgreSQL is installed locally, create an empty database named `mentorship_plus`, then set the URL in `api/.env` to match your local username/password, for example:

```env
DATABASE_URL="postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/mentorship_plus?schema=public"
```

Replace `YOUR_LOCAL_PASSWORD` with your actual local database password. The example is not a real credential.

## Create the database schema

Run these commands from the workspace root after setting `api/.env`:

```powershell
npm run api:db:validate
npm run api:db:generate
npm run api:db:migrate
npm run api:db:seed
```

What they do:

- `api:db:validate` checks the Prisma schema.
- `api:db:generate` generates Prisma Client.
- `api:db:migrate` applies the checked-in migrations to the configured database.
- `api:db:seed` adds reference data such as membership categories and counselling topics. It does not create demo user accounts.

The migration creates the tables; the seed script adds the initial reference records. Do not run production migrations against a database containing important data until you have reviewed the migration and taken a backup. For new schema changes during development, use `npm --prefix api run prisma:migrate:dev -- --name descriptive_change` and commit both the Prisma schema and generated migration.

## Start and verify the backend

From the workspace root:

```powershell
npm run api:dev
```

The API defaults to `http://localhost:4000`. Open these in a browser on the same computer:

- `http://localhost:4000/api/v1`
- `http://localhost:4000/api/v1/health/live`
- `http://localhost:4000/api/v1/health/ready`

The readiness endpoint should indicate that PostgreSQL is connected. If it fails, confirm the database is running, `DATABASE_URL` is correct, and your network/firewall permits the connection. Do not paste credentials into bug reports.

## Start the mobile app

In another terminal, from the workspace root:

```powershell
npm run mobile:start
```

Scan the Expo QR code using Expo Go where the installed Expo Go version supports this SDK. Keep the terminal running. If testing the app on a physical phone against a locally running API, `localhost` on the phone refers to the phone itself, not your computer. The later mobile integration phase must use your computer’s LAN IP (with both devices on the same network) or a deployed HTTPS API URL. Configure the mobile API URL only when the API client is implemented; do not put database credentials in mobile configuration.

**Important:** At this Phase 2 checkpoint, the mobile app is not yet wired to the new API. Starting both processes does not mean login, registration, or counselling data is already synchronised. That integration is scheduled for the following phases.

## Git and GitHub workflow

### 1. Install and configure Git

Install Git for Windows from https://git-scm.com/download/win. Then open a terminal and run (replace the values with your GitHub identity):

```powershell
git config --global user.name "Your Name"
git config --global user.email "your-github-email@example.com"
```

### 2. Initialise version control

From the `mentorship-plus` workspace root:

```powershell
git init
git add .
git status
git commit -m "chore: establish Mentorship+ unified workspace and phase 2 API foundation"
```

Review `git status` before committing. Confirm that `.env`, API keys, database passwords, `node_modules`, and personal files are not staged. Commit `.env.example`, not `.env`.

### 3. Create the GitHub repository

1. Go to https://github.com/new and create a **private** repository named `mentorship-plus`.
2. Do not initialise it with a README, `.gitignore`, or licence because these files already exist locally.
3. Copy the repository’s HTTPS URL, then run from the workspace root (replace the example URL with the URL GitHub gives you):

   ```powershell
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/mentorship-plus.git
   git push -u origin main
   ```

4. Sign in using Git Credential Manager if prompted. Never place a GitHub personal access token directly in a command or commit it to a file.

### 4. Normal daily workflow

Before starting work:

```powershell
git pull
git switch -c feat/short-description
```

After making and testing changes:

```powershell
git status
git add path/to/changed-file
git commit -m "feat: describe the change"
git push -u origin feat/short-description
```

Open a Pull Request on GitHub, review the diff and tests, then merge into `main` when the change is approved. Use separate branches for separate phases/features. Never force-push shared branches or commit secrets.

## Useful workspace commands

| Command | Purpose |
|---|---|
| `npm run mobile:start` | Start Expo mobile app |
| `npm run mobile:android` | Start Expo targeting Android |
| `npm run api:install` | Install backend dependencies |
| `npm run api:dev` | Start API in watch mode |
| `npm run api:build` | Compile backend |
| `npm run api:test` | Run backend tests |
| `npm run api:db:validate` | Validate Prisma schema |
| `npm run api:db:generate` | Generate Prisma Client |
| `npm run api:db:migrate` | Apply checked-in migrations |
| `npm run api:db:seed` | Seed initial reference data |

## Phase boundary and production warning

This is a unified repository/workspace, not a claim that all features are already connected. Phase 2 supplies the backend foundation and schema. Phase 3 must add authentication, session management, role guards and counsellor invitations before the app can safely use real accounts. The app should not be launched for real users until the remaining phases, security review, tests, backups and deployment checks are complete.
