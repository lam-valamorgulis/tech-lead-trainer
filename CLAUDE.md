# Tech Lead Trainer

## Source of truth

`docs/design-v1.5.md` is the confirmed design (in Vietnamese, with numbered sections). It wins over spec #1 and every ticket. When they disagree, say so in the PR; a one-way gap follows step 6 below. Research notes are in `research/`.

## Factory rules

The owner does not hand-code. Each `/implement` run builds exactly one ticket. There is no daily ticket limit: when a ticket is merged, the next one can start. The owner verifies the end result only: they use the live app on an iPhone and report problems. No step waits for an owner verdict, except secrets and human-only setup (step 7). Every ticket follows these steps:

1. **Branch:** work on a ticket branch cut from `sprint-N`, where N is the ticket's milestone. Create `sprint-N` from `main` when it does not exist yet.
2. **Card:** move the ticket's board card Todo → In progress → In review → Done (commands in `docs/agents/issue-tracker.md`).
3. **Build** test-first at the spec's seams: A (game rules core), B (local Supabase), C (Playwright, iPhone and Desktop Chrome). Development and tests use local Supabase only.
4. **Gate:** typecheck, lint and every test seam are green, and `/code-review` against `sprint-N` is clean after fixes.
5. **PR** into `sprint-N`, with the body written by `/pr` in simple English (B1 level, at most 20 words per sentence) and a 2-minute check the owner can run on an iPhone. Squash-merge when CI is green, then close the ticket.
6. **Doors:** a one-way door (data model, IDs, game rules, the guard rules in design section 14) does not wait. Pick the safer default, meaning the choice that is easiest to undo and keeps every learner's data. Build it, and write the choice in the PR body under "Choices made". A two-way door (UI detail, copy, spacing) goes into the PR with a note.
7. **Secrets and human-only setup** go through `/wizard`. Secret values live only in git-ignored env files and in GitHub or Vercel secrets.

Picking the next ticket, content tickets, shipping a sprint and the monthly content cadence: see `docs/agents/factory.md`.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `lam-valamorgulis/tech-lead-trainer`, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels, unchanged: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
