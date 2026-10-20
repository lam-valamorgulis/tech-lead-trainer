# Factory operations

How the agent factory runs. The per-ticket steps are in `CLAUDE.md`; this file covers the cases that only some runs reach.

## Picking the next ticket

When `/implement` gets no ticket number, a bug found on production goes first. That is an open issue labelled `bug` and `ready-for-agent`, in any open milestone. Lowest issue number first.

Otherwise take the **frontier**: open `ready-for-agent` issues in the earliest open sprint milestone. Skip any issue with an open blocker (`issue_dependencies_summary.blocked_by` is not 0). Lowest issue number first. Issues labelled `ready-for-human` belong to the owner.

## Content tickets

Content tickets (town content, battle scenarios, weekend packs) are drafted in simple English from the primary sources in `research/roadmap-sources.md`. Every fact is traceable to its cited source. How to write and fact-check them: `docs/agents/content-authoring.md`. A content PR merges on green CI after that fact check, like any other ticket. It needs no "approved" comment. Keep each content PR readable on a phone, because the owner may read it to learn.

## Ship

Ship a sprint when its milestone has no open `ready-for-agent` ticket left. The owner can also say **"ship"** earlier.

1. Move every open ticket left in the milestone to the next milestone. Create that milestone when it does not exist.
2. Run the production export and note its date. A production schema change always comes after a fresh export.
3. Apply pending migrations to production.
4. Merge `sprint-N` into `main` with a merge commit. Wait for the production deploy. Then check a real sign-in on production, not only an open page (#56):
   - `npm run check:live-code` must pass: the live code has the length the screen accepts.
   - A person signs in on the production URL with a code from a real email. They see the home screen. The agent cannot read the owner's inbox. So its last message asks the owner to do this sign-in on the iPhone. The ship does not wait for it: a failed sign-in comes back as a problem report.
5. Close the milestone and create `sprint-(N+1)` from `main`.
6. Ask the owner to run `/mattpocock-skills:retro` in the same session.

## Problem reports

When the owner reports a problem, open one ticket per problem. Label it `bug` and `ready-for-agent`, put it in the earliest open sprint milestone and on the board. It goes first (see "Picking the next ticket").

## Monthly content cadence

In week 1 of town month N (counted from the owner's program start date), the owner runs `/mattpocock-skills:to-tickets` for town N+1: its content, its battles and its new game twist. Issues #10, #18, #36 and #37 show the shape. Content exists only for the current town and the next one (design section 14, rule 4).

## Guard rules

Design section 14 holds the guard rules. The one the factory checks itself: if the Sprint 1 app is still not usable on the owner's iPhone on day 8 (2026-10-27), stop building new features and tell the owner.
