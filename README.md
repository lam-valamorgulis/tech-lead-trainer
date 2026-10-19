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
npm run db:start
npm run env:local
npm run dev
```

`npm run env:local` writes `.env.local` with the local Supabase URL and keys. It refuses to replace a file that points at a live database.

Open http://localhost:3000. To try it on an iPhone, open the preview link from the pull request. Then tap Share → Add to Home Screen.

## Local Supabase

Development and tests use only the Supabase that runs on your Mac. Never point a test at the live project.

| Command | What it does |
| --- | --- |
| `npm run db:start` | Starts local Supabase (API on port 55321, database on port 55322) |
| `npm run db:status` | Shows the local URLs and keys |
| `npm run db:reset` | Runs every migration again on an empty local database, then restarts. A plain `supabase db reset` loses the sign-in email template until the next restart |
| `npm run db:stop` | Stops it |

This project uses ports 553xx, so it can run next to another local Supabase project on 543xx.

Local emails, such as sign-in codes, never leave your Mac. Read them in Mailpit at http://127.0.0.1:55324.

To let an email sign in locally, add it to the allow list:

```sh
docker exec supabase_db_tech-lead-trainer psql -U postgres -c "insert into allowed_emails (email) values ('you@example.com')"
```

## Sign-in setup

People sign in with a 6-digit code sent by email. There are no magic links, because a link opens in Safari and not in the installed app.

The dashboard menu names below were not checked against the live dashboard. The wizard (#12) checks them.

| Rule | Local (`supabase/config.toml`) | Live project (Supabase dashboard) |
| --- | --- | --- |
| Public sign-ups are off | `[auth] enable_signup = false` | Authentication → Sign In / Providers → turn off **Allow new users to sign up** |
| Email login stays on | `[auth.email] enable_signup = true` | Authentication → Sign In / Providers → **Email** stays enabled |
| The email holds only the code | `[auth.email.template.magic_link]` uses `supabase/templates/sign-in-code.html` | Authentication → Emails → **Magic Link** template: paste the same HTML. It must use `{{ .Token }}` and no link |
| Code length | `otp_length = 6` | Email provider → **Email OTP Length** = 6 |

How it works: the server checks `allowed_emails` first. For an allowed email it creates the account, because public sign-ups are off, and then sends the code. For any other email it shows the same neutral message and sends nothing.

To invite a friend, add one row to `allowed_emails` in the live project's SQL editor. Deleting the row blocks that account: it cannot sign in, even by calling Supabase directly. Adding the row back lets it sign in again. No learning data is deleted. This was tested on local Supabase only.

The app needs these environment variables. Set them in Vercel for the live project:

| Name | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server |
| `SUPABASE_SECRET_KEY` | Server only. Never add the `NEXT_PUBLIC_` prefix |

## Tests

The tests use three seams.

| Seam | What it tests | Command | Needs |
| --- | --- | --- | --- |
| A | Game rules core: pure functions, no UI, no database | `npm test` | nothing |
| B | Storage: real calls to local Supabase | `npm run test:db` | `npm run db:start` |
| C | The real app in iPhone (WebKit) and Desktop Chrome, with an accessibility check | `npm run test:e2e` | `npm run db:start` (it starts the dev server itself) |

Seams B and C read the URL and keys from `supabase status`, not from env files. They stop with an error if the URL is not `127.0.0.1` or `localhost`. Seam C reads the sign-in code from Mailpit.

Other checks: `npm run typecheck`, `npm run lint`, `npm run content:check`. How to add content: `content/README.md`.

## CI

Every pull request runs these steps in order:

1. Content check, typecheck and lint
2. Seam A
3. Local Supabase, then build (the build needs the local URL and key)
4. Seam B, then seam C
