# Mentorship+ mobile/backend connection

The mobile client now calls the NestJS API for sign-in and registration. The API listens on port 4000 and uses the `api/v1` prefix.

## Required setup
1. Ensure `api/.env` has a valid `DATABASE_URL` and `JWT_ACCESS_SECRET` (at least 32 characters). Do not commit `.env`.
2. Configure SMTP credentials in `api/.env` to send actual verification emails. Without SMTP, development verification details are written to the API terminal; this is not production email delivery.
3. From the project root run `npm --prefix api run build`. Resolve any build errors before continuing.
4. Apply the Phase 3 Prisma migration only after confirming the target database and reviewing the migration. Never reset or drop an existing database.
5. Start the API with `npm --prefix api run start:dev`.
6. Start Expo in a second terminal with `npx expo start --lan`. The mobile API client tries to use the host from Expo's development URL on port 4000. If that is not your computer's reachable LAN address, create/update the root `.env` with `EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:4000/api/v1`, then restart Expo with cache clear (`npx expo start --lan --clear`).
7. Phone and computer must be on the same network; allow inbound TCP port 4000 through Windows Firewall for private networks.

## Important scope note
Authentication/registration is connected to the backend. Other product areas (content, counselling discussions, appointments, notifications, and admin management) must not display seeded data; they are now empty until their real API endpoints are implemented and wired. Email verification is required by the API. Do not describe registration as complete until the server confirms it.
