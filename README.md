# Tech Lead Trainer

A pixel-art learning game for one year of tech lead practice. It runs as an iPhone Home Screen app (PWA) and in a desktop browser.

The confirmed design is `docs/design-v1.4.md`. Agent rules are in `CLAUDE.md`.

## What you need

- Node.js 24 or newer
- Docker Desktop, running (local Supabase uses it)

```sh
npm install
npx playwright install webkit chromium
```

## Run the app

```sh
npm run dev
```

Open http://localhost:3000. To try it on an iPhone, open the preview link from the pull request. Then tap Share → Add to Home Screen.

## Local Supabase

Development and tests use only the Supabase that runs on your Mac. Never point a test at the live project.

| Command | What it does |
| --- | --- |
| `npm run db:start` | Starts local Supabase (API on port 55321, database on port 55322) |
| `npm run db:status` | Shows the local URLs and keys |
| `npm run db:stop` | Stops it |

This project uses ports 553xx, so it can run next to another local Supabase project on 543xx.

## Tests

The tests use three seams.

| Seam | What it tests | Command | Needs |
| --- | --- | --- | --- |
| A | Game rules core: pure functions, no UI, no database | `npm test` | nothing |
| B | Storage: real calls to local Supabase | `npm run test:db` | `npm run db:start` |
| C | The real app in iPhone (WebKit) and Desktop Chrome, with an accessibility check | `npm run test:e2e` | nothing (starts the dev server) |

Seam B reads its URL and key from `supabase status`, not from env files. It stops with an error if the URL is not `127.0.0.1` or `localhost`.

Other checks: `npm run typecheck`, `npm run lint`, `npm run content:check`.

## CI

Every pull request runs these steps in order:

1. Content check, typecheck and lint
2. Seam A, then build
3. Local Supabase with seam B, then seam C
