# RentReel

RentReel is a Vite + React frontend with a simple Express API and a Prisma-ready Postgres data layer. This prototype is intentionally unauthenticated for local development. The app opens directly and keeps the existing rental marketplace UI without requiring a login system.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Database: Prisma + PostgreSQL (optional; the app falls back to the built-in demo data store without DATABASE_URL)

## Prerequisites

- Node.js 20+
- npm
- Optional: PostgreSQL database and DATABASE_URL if you want Prisma persistence

## Local setup on Windows

1. Open PowerShell in the project folder.
2. Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

3. Fill in the optional database values if needed in the newly created `.env` file.
4. Install dependencies:

```powershell
npm install
```

5. Start the app:

```powershell
npm run dev
```

6. Open the app in your browser:

```text
http://localhost:3000
```

## Environment variables

Create a `.env` file from `.env.example` and include values like:

```env
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rentreel?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/rentreel?schema=public
```

> Do not commit your `.env` file. Keep secrets out of Git.

## Database

This project already includes Prisma configuration for PostgreSQL. If `DATABASE_URL` is not set, the app still starts in demo mode so the frontend can run without a database connection.

If you want full persistence:

```powershell
npx prisma generate
npx prisma db push
```

## Available scripts

```powershell
npm run dev
npm run build
npm run preview
npm run lint
npm run db:generate
npm run db:push
npm run db:validate
npm run clean
```

## Production build

```powershell
npm run build
npm start
```

## Troubleshooting

- If the dev server crashes with `ENOENT`, make sure you are running the command inside the project folder.
- If `DATABASE_URL` is missing, the app still starts in prototype mode, but Postgres-backed records will not persist.
- If a Windows machine cannot run a script, use PowerShell and keep commands cross-platform.
