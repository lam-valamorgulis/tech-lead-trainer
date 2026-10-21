# Tech Lead Trainer

A pixel-art learning game for one year of tech lead practice. It runs as an iPhone Home Screen app (PWA) and in a desktop browser.

The confirmed design is `docs/design-v1.5.md`. Agent rules are in `CLAUDE.md`.

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
| `npm run rebuild:review-state` | Recomputes the `review_state` cache of every local user from the catch and review events |
| `npm run db:stop` | Stops it |

This project uses ports 553xx, so it can run next to another local Supabase project on 543xx.

Local emails, such as sign-in codes, never leave your Mac. Read them in Mailpit at http://127.0.0.1:55324.

To let an email sign in locally, add it to the allow list:

```sh
docker exec supabase_db_tech-lead-trainer psql -U postgres -c "insert into allowed_emails (email) values ('you@example.com')"
```

## Production setup

Run `scripts/setup-production.sh` once on your Mac. It walks you through 10 steps: the Supabase project (free plan), the migrations, sign-in with a code, the allow list, the Vercel project, and the iPhone install. It writes only public values, to `.env.wizard`. Secrets stay in Supabase and Vercel.

## Sign-in setup

People sign in with a 6-digit code sent by email. There are no magic links, because a link opens in Safari and not in the installed app.

The dashboard menu names below were not checked against the live dashboard. The wizard (#12) checks them.

| Rule | Local (`supabase/config.toml`) | Live project (Supabase dashboard) |
| --- | --- | --- |
| Public sign-ups are off | `[auth] enable_signup = false` | Authentication → Sign In / Providers → turn off **Allow new users to sign up** |
| Email login stays on | `[auth.email] enable_signup = true` | Authentication → Sign In / Providers → **Email** stays enabled |
| The email holds only the code | `[auth.email.template.magic_link]` uses `supabase/templates/sign-in-code.html` | Authentication → Emails → **Magic Link** template: paste the same HTML. It must use `{{ .Token }}` and no link |
| Code length | `otp_length = 6` | Email provider → **Email OTP Length** = 6. Check it with `npm run check:live-code` |

The live project once sent 8-digit codes, so nobody could sign in (#56). It was set to 6 through the Supabase Management API, with the token of the CLI login: `PATCH https://api.supabase.com/v1/projects/<ref>/config/auth` with the body `{"mailer_otp_length": 6}`. The dashboard field above does the same.

How it works: the server checks `allowed_emails` first. For an allowed email it creates the account, because public sign-ups are off, and then sends the code. For any other email it shows the same neutral message and sends nothing.

To invite a friend, add one row to `allowed_emails` in the live project's SQL editor. Deleting the row blocks that account: it cannot sign in, even by calling Supabase directly. Adding the row back lets it sign in again. No learning data is deleted. This was tested on local Supabase only.

The app needs these environment variables. Set them in Vercel for the live project:

| Name | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server |
| `SUPABASE_SECRET_KEY` | Server only. Never add the `NEXT_PUBLIC_` prefix |
| `VAPID_PUBLIC_KEY` | Server. The app reads it from `/api/reminders/key` |
| `VAPID_PRIVATE_KEY` | Server only. Signs each push |
| `VAPID_SUBJECT` | Server. `mailto:` plus the owner's email |
| `REMINDER_CRON_SECRET` | Server only. The notify endpoint accepts only this secret |

## Reminders

`pg_cron` calls `POST /api/reminders/notify` every 5 minutes. The app decides for each user, in the home time zone, whether the morning or the evening reminder is due. The evening one comes only when that learning day has less than 180 active seconds. After exactly one missed day, the morning text is a little stronger. The normal texts rotate among 3 styles. It sends at most one per user, learning day and kind.

Until the four reminder variables above are set, reminders stay off. Settings shows "Reminders are not set up yet." and nothing fails.

Run `scripts/setup-reminders.sh` once, after Sprint 2 ships. It makes the push keys and the cron secret, puts them in Vercel and Supabase Vault, and checks the endpoint. No secret is written to a file.

Each required stage checks its result and stays until the check passes. Type `skip` to go on without it. Then the wizard ends with "Setup is NOT complete", lists what is not done, and exits with an error. `scripts/setup-backup.sh` works the same way.

## Monthly content review

Before each monthly content review, list every open "Report wrong" from the live app:

```sh
npm run reports -- --live
```

It prints Markdown, grouped by creature or move, with each learner's message. "changed since" means the content changed after the report, so it may be fixed already. After you fix an item, mark its reports done:

```sh
npm run reports -- --live --done 3 5
```

Without `--live`, both commands use local Supabase. `--live` reads `.env.wizard` and gets the secret key through your Supabase CLI login (`npx supabase login`). It never prints the key.

## Tests

The tests use three seams.

| Seam | What it tests | Command | Needs |
| --- | --- | --- | --- |
| A | Game rules core: pure functions, no UI, no database | `npm test` | nothing |
| B | Storage: real calls to local Supabase | `npm run test:db` | `npm run db:start` |
| C | The real app in iPhone (WebKit) and Desktop Chrome, with an accessibility check | `npm run test:e2e` | `npm run db:start` (it starts the dev server itself) |

Seam C runs the app with `NEXT_PUBLIC_CONTENT_SET=fixture`: the small fixture town in `src/content/fixture-town.ts`, so tests do not change when monthly content changes. CI builds with the same setting. Vercel builds the real content.

Seams B and C read the URL and keys from `supabase status`, not from env files. They stop with an error if the URL is not `127.0.0.1` or `localhost`. Seam C reads the sign-in code from Mailpit.

Other checks: `npm run typecheck`, `npm run lint`, `npm run content:check`, and `npm run test:shell` (the setup wizards, run against fake CLIs in `tests/shell/fake-bin`). How to add content: `content/README.md`.

## CI

Every pull request runs these steps in order:

1. Content check, typecheck and lint
2. Seam A, then the shell tests of the setup wizards
3. Local Supabase, then build (the build needs the local URL and key)
4. Seam B, then seam C
