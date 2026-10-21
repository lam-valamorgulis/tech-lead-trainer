# Weekly feedback triage

The Feedback button (#95, design 9 rule 15) saves a learner's note with the screen it came from. Once a week an agent reads the open notes and turns them into GitHub issues. This file says how.

## When

Once a week, for example on Monday. The owner does not need to start it: any factory session that runs on a Monday does it before its first ticket.

## Steps

1. Print the open notes from the live project:

   ```sh
   npm run feedback -- --live
   ```

   The list is Markdown, one section per screen, the busiest screen first. Each line is `#<id>, <date>: <note>`.

2. Group the notes into problems. One problem is one thing to change, on one screen or across screens. Two notes that ask for the same change are one problem. A note that asks for two changes is two problems.

3. Before you open an issue, search the open issues (`gh issue list --state open --search "<words>"`). If the problem already has an issue, add a comment with the note ids and the words of the notes instead.

4. Open one issue per new problem:

   ```sh
   gh issue create --label needs-triage --title "<the problem in a few words>" --body "<body>"
   ```

   The body has:
   - the screen, as the note gives it (`map`, `session`, …);
   - each note quoted word for word, with its id and date;
   - one line on what the learner seems to want. Mark it "(guess)" when the note does not say it.

   Do not add `ready-for-agent`. Triage decides that later (`docs/agents/triage-labels.md`). Do not put the issue in a milestone or on the board.

5. Mark the notes done, with the ids of every note you handled:

   ```sh
   npm run feedback -- --live --done 3 5 8
   ```

   A note that says nothing to act on (for example "nice app") is done too. Say so in the run summary.

6. End the run with a short summary: how many notes, how many issues opened, which issues got a comment.

## Rules

- Notes are the learner's own words. Quote them; never change them in the issue.
- Never write to the live database except with `--done`.
- A note that reports a broken screen ("the button does nothing") is still `needs-triage`. Triage can promote it to `bug`.
- Run `npm run feedback` without `--live` to try the steps on local Supabase.
