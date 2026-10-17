# RentReel

RentReel is a Vite + React frontend with a simple Express API and an optional Prisma/Postgres layer. This prototype is intentionally unauthenticated for local development, so the app opens directly without a login flow.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Database: Prisma + PostgreSQL (optional; the app falls back to the built-in demo data store when DATABASE_URL is unset)

## Prerequisites

- Node.js 20+
- npm
- Optional: PostgreSQL if you want real Prisma persistence

## Local setup on Windows

1. Open PowerShell and move into the project folder:

```powershell
cd "D:\rantal_Zip\rentreel---scroll-into-your-next-home"
```

2. Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

3. Install dependencies:

```powershell
npm install
```

4. Start the app:

```powershell
npm run dev
```

5. Open the app in the browser. The server usually starts on `http://localhost:3000`; if that port is busy, it will use the next free port and print the actual URL in the terminal.

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

This project includes Prisma configuration for PostgreSQL. If `DATABASE_URL` is not set, the app still starts in prototype mode so the frontend can run without a database connection. In that mode, the app continues using its local JSON-backed demo data layer.

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

- If `npm run dev` fails with `ENOENT`, make sure you are running it from the project folder, not from the parent folder.
- If `DATABASE_URL` is missing, the app still starts in prototype mode, but Postgres-backed records will not persist.
- If the app picks a different local port, use the port printed by the server log.
