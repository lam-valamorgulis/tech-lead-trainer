#!/usr/bin/env bash
#
# Shell tests for the setup wizards (#76): scripts/setup-reminders.sh and scripts/setup-backup.sh.
# Each wizard runs in a temp copy of the repo, with fake CLIs (tests/shell/fake-bin) first on PATH.
# No network, no Vercel, no Supabase, no GitHub, and the real .env files are never touched.
# Run: npm run test:shell

set -uo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
FAKE_BIN="$ROOT/tests/shell/fake-bin"
PRODUCTION="https://tech-lead-trainer.vercel.app"
OLD_PREVIEW="https://tech-lead-trainer-git-sprint-1-lamvalamorgulis-projects.vercel.app"
# The fixed values the fakes make. None of the secret ones may ever show in the output.
FAKE_PUBLIC="BFakePublicKey0001"
FAKE_PRIVATE="FakePrivateKey0001"
FAKE_SECRET_HEX="5ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7"
ALL_VERCEL="VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT REMINDER_CRON_SECRET"
# What a correct setup looks like to the fakes.
READY=(FAKE_VERCEL_NAMES="$ALL_VERCEL" FAKE_PUBLIC_KEY="$FAKE_PUBLIC" FAKE_CRON_SECRET="$FAKE_SECRET_HEX")

PASSED=0
FAILED=0
TEMP_DIRS=()
trap 'for d in "${TEMP_DIRS[@]}"; do rm -rf "$d"; done' EXIT

pass() { PASSED=$((PASSED + 1)); printf 'ok    %s\n' "$1"; }
fail() { FAILED=$((FAILED + 1)); printf 'FAIL  %s\n' "$1"; }

expect_status() { # name expected
  if [[ "$STATUS" == "$2" ]]; then pass "$1"; else fail "$1 (exit $STATUS, wanted $2)"; fi
}
expect_failed() { # name
  if [[ "$STATUS" != "0" ]]; then pass "$1"; else fail "$1 (exit 0, wanted non-zero)"; fi
}
expect_out() { # name text
  if [[ "$OUT" == *"$2"* ]]; then pass "$1"; else fail "$1 (output has no: $2)"; fi
}
expect_no_out() { # name text
  if [[ "$OUT" != *"$2"* ]]; then pass "$1"; else fail "$1 (output has: $2)"; fi
}
expect_no_secrets() { # name
  local s leaked=""
  for s in "$FAKE_PRIVATE" "$FAKE_SECRET_HEX" "sb_secret_FakeKey0001" "fake-token"; do
    [[ "$OUT" == *"$s"* ]] && leaked="$leaked $s"
  done
  if [[ -z "$leaked" ]]; then pass "$1"; else fail "$1 (leaked:$leaked)"; fi
}
count_of() { # text: how many times it is in OUT
  local rest="$OUT" n=0
  while [[ "$rest" == *"$1"* ]]; do rest="${rest#*"$1"}"; n=$((n + 1)); done
  printf '%s' "$n"
}

# new_repo: a temp folder with only the wizard files, and an env file from the arguments.
new_repo() {
  REPO_DIR=$(mktemp -d)
  TEMP_DIRS+=("$REPO_DIR")
  mkdir -p "$REPO_DIR/scripts/lib" "$REPO_DIR/state"
  cp "$ROOT/scripts/setup-reminders.sh" "$ROOT/scripts/setup-backup.sh" "$REPO_DIR/scripts/"
  cp "$ROOT/scripts/lib/wizard-checks.sh" "$REPO_DIR/scripts/lib/"
  printf 'OWNER_EMAIL=owner@example.com\nAPP_URL=%s\n' "$OLD_PREVIEW" > "$REPO_DIR/.env.wizard"
}

# enter_only N: the human presses Enter N times. Then the input ends.
enter_only() { local i; for ((i = 0; i < $1; i++)); do printf '\n'; done > "$REPO_DIR/input"; }

# type_lines LINE...: what the human types, one line each. Then the input ends.
type_lines() { printf '%s\n' "$@" > "$REPO_DIR/input"; }

# run_wizard SCRIPT [FAKE_X=value...] runs it on the typed lines and sets OUT and STATUS.
run_wizard() {
  local script="$1"
  shift
  OUT=$(env PATH="$FAKE_BIN:$PATH" FAKE_STATE="$REPO_DIR/state" WIZARD_POLL_SECONDS=0 "$@" \
    bash "$REPO_DIR/scripts/$script" < "$REPO_DIR/input" 2>&1)
  STATUS=$?
}

saved_app_url() { grep -E '^APP_URL=' "$REPO_DIR/.env.wizard" | tail -n1 | cut -d= -f2-; }

echo "# setup-reminders.sh"

new_repo
enter_only 300
run_wizard setup-reminders.sh
expect_failed "Enter everywhere, nothing in Vercel: exits non-zero"
expect_no_out "Enter everywhere, nothing in Vercel: never says Setup complete" "Setup complete"
expect_out "Enter everywhere, nothing in Vercel: says NOT complete" "Setup is NOT complete"
expect_out "Vercel stage names the missing settings" "Vercel Production does not have: $ALL_VERCEL"
if (( $(count_of "Vercel Production does not have") > 1 )); then
  pass "Vercel stage checks again after Enter"
else
  fail "Vercel stage checks again after Enter"
fi
expect_out "Summary lists the Vercel settings" "Add the 4 reminder settings in Vercel for Production"
expect_out "Public key stage explains the null key" "The app shows no public key"
expect_out "Summary lists the redeploy" "must show the new public key"
expect_out "Notify stage shows the 503" "With the secret the endpoint answered 503"
expect_out "Summary lists the notify check" "The notify endpoint must answer 401 without the secret and 200 with it"
expect_no_secrets "Enter everywhere: no secret in the output"
if [[ "$(saved_app_url)" == "$PRODUCTION" ]]; then
  pass "Enter at the address replaces the old preview address with production"
else
  fail "Enter at the address replaces the old preview address with production (saved: $(saved_app_url))"
fi

new_repo
type_lines "" "$OLD_PREVIEW" skip
run_wizard setup-reminders.sh
expect_out "A typed preview address is refused (404)" "answered 404, not 200"
expect_failed "Skip at the address: exits non-zero"
expect_no_out "Skip at the address: never says Setup complete" "Setup complete"
expect_no_out "Skip at the address: stops before the push keys" "push keys made"

new_repo
type_lines "" "$PRODUCTION/settings" skip
run_wizard setup-reminders.sh
expect_out "An address with a path is refused" "is not an address like https://name.vercel.app"

new_repo
enter_only 300
run_wizard setup-reminders.sh "${READY[@]}"
expect_status "Everything set up: exits 0" 0
expect_out "Everything set up: says Setup complete" "Setup complete"
expect_no_out "Everything set up: no NOT complete" "NOT complete"
expect_out "Everything set up: the new public key is checked" "the app shows the new public key"
expect_out "Everything set up: both Vault names are checked" "both are stored"
expect_out "Everything set up: notify answers 401 without the secret" "without the secret: 401"
expect_out "Everything set up: notify answers 200 with the secret" "with the secret: 200"
expect_no_secrets "Everything set up: no secret in the output"

new_repo
enter_only 300
run_wizard setup-reminders.sh "${READY[@]}" FAKE_VERCEL_NAMES="" FAKE_VERCEL_READY_ON_CALL=2
expect_status "Vercel settings added after one check: the wizard goes on and exits 0" 0
expect_out "Vercel settings added after one check: the first check named them" "Vercel Production does not have"

new_repo
# banner, address, stage 1, email, stage 2, the 4 values, then skip at the check.
type_lines "" "" "" "" "" "" "" "" "" skip
run_wizard setup-reminders.sh
expect_out "Typing skip at the Vercel stage marks it not done" "Not done: the Vercel settings"
expect_failed "Typing skip at the Vercel stage: exits non-zero"

new_repo
enter_only 300
run_wizard setup-reminders.sh "${READY[@]}" FAKE_PUBLIC_KEY="BOldPublicKey"
expect_out "An older public key is named" "The app shows an older public key"
expect_failed "An older public key: exits non-zero"

new_repo
enter_only 300
run_wizard setup-reminders.sh "${READY[@]}" FAKE_VAULT_WRITE=fail
expect_out "Vault write refused: says so" "The live database did not take the Vault values"
expect_out "Vault write refused: listed as not done" "Store reminders_notify_url and reminders_cron_secret"
expect_failed "Vault write refused: exits non-zero"
expect_no_out "Vault write refused: never says Setup complete" "Setup complete"

new_repo
enter_only 300
run_wizard setup-reminders.sh "${READY[@]}" FAKE_CRON_SECRET="an-older-secret"
expect_out "An older cron secret in Vercel: notify answers 401" "With the secret the endpoint answered 401"
expect_failed "An older cron secret in Vercel: exits non-zero"

echo "# setup-backup.sh"

new_repo
enter_only 100
run_wizard setup-backup.sh
expect_status "Backup, everything works: exits 0" 0
expect_out "Backup, everything works: says Setup complete" "Setup complete"
expect_out "Backup, everything works: GitHub lists the 3 secrets" "GitHub lists all 3 secrets"
expect_out "Backup, everything works: restore test passed" "restore test passed"
expect_no_secrets "Backup, everything works: no secret in the output"

new_repo
enter_only 100
run_wizard setup-backup.sh FAKE_GH_SECRET_SET=fail
expect_failed "Backup, GitHub secrets refused: exits non-zero"
expect_no_out "Backup, GitHub secrets refused: never says Setup complete" "Setup complete"
expect_out "Backup, GitHub secrets refused: listed as not done" "Store the 3 GitHub secrets"

new_repo
enter_only 100
run_wizard setup-backup.sh FAKE_GH_RUN_WATCH=fail
expect_out "Backup run fails: says so" "The backup run failed"
expect_out "Backup run fails: the restore test is listed as not done" "Run the restore test after the first backup"
expect_failed "Backup run fails: exits non-zero"

new_repo
enter_only 100
run_wizard setup-backup.sh FAKE_GH_RUN_ID=""
expect_out "No backup run shows up: says so" "GitHub shows no new run yet"
if [[ "$(wc -l < "$REPO_DIR/state/gh-workflow-runs" | tr -d ' ')" == "1" ]]; then
  pass "No backup run shows up: a retry looks again, it does not start a second run"
else
  fail "No backup run shows up: a retry looks again, it does not start a second run"
fi
expect_failed "No backup run shows up: exits non-zero"

new_repo
enter_only 100
run_wizard setup-backup.sh FAKE_RESTORE_CHECK=fail
expect_out "Restore test fails: listed as not done" "Pass the restore test"
expect_failed "Restore test fails: exits non-zero"

printf '\n%s passed, %s failed\n' "$PASSED" "$FAILED"
(( FAILED == 0 ))
