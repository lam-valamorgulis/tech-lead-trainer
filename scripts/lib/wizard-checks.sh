# Checks and loops shared by the setup wizards (#76). The wizards source this file after the
# wizard library, so warn, note, _clear, finish and the SKIPPED list exist.
# Every check says what is wrong and returns non-zero. No check prints a secret.
# The checks are tested in tests/shell/wizards.test.sh. Keep it bash 3.2 safe: macOS ships 3.2.

PRODUCTION_APP_URL="https://tech-lead-trainer.vercel.app"
VERCEL_CLI="vercel@64.7.0"
# Public ids of the Vercel project. With them the CLI needs no `vercel link`,
# which would also edit .env.local.
VERCEL_TEAM_ID="team_MtibJbRjCTqvfswQBUrYmhpa"
VERCEL_PROJECT_ID="prj_Atc77hq7XyiYxQbZ3Wn3yAN9cJub"

# live_sql "<sql>" runs SQL on the live project through the Supabase CLI login.
live_sql() { npx supabase db query --linked --project-ref "$SUPABASE_PROJECT_REF" "$1"; }

# live_sql_file <file> runs a SQL file, so a secret never shows in the process list.
live_sql_file() { npx supabase db query --linked --project-ref "$SUPABASE_PROJECT_REF" --file "$1"; }

# retry_or_skip ["prompt"] runs after a failed check. Enter means try again (success).
# "skip", or the end of the input, means give up (failure), so a script never loops forever.
retry_or_skip() {
  local reply=""
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to check again, or type skip:}" "$RESET"
  read -r reply || return 1
  [[ "$reply" != "skip" ]]
}

# require "what is not done" check [args...] stays until the check passes, or the human
# types skip. A skip goes on the SKIPPED list and returns 1. Call it as `if require ...`.
require() {
  local label="$1"
  shift
  until "$@"; do
    if ! retry_or_skip; then
      SKIPPED+=("$label")
      warn "Not done: $label"
      return 1
    fi
  done
}

# finish_or_fail ends a wizard. "Setup complete" only when nothing was skipped.
# Otherwise it lists what is not done and exits 1.
finish_or_fail() {
  if (( ${#SKIPPED[@]} == 0 )); then
    finish
    return 0
  fi
  _clear
  printf '\n%s%s  ✗ Setup is NOT complete%s\n' "$BOLD" "$RED" "$RESET"
  warn "Not done yet:"
  local s
  for s in "${SKIPPED[@]}"; do note "  - $s"; done
  note "Fix these, then run this wizard again."
  printf '\n'
  exit 1
}

# http_status URL [curl args...] prints the HTTP status code, or 000 when nothing answers.
http_status() {
  local url="$1"
  shift
  curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@" "$url" || true
}

# check_app_url URL passes when URL/api/reminders/key answers 200. Only the live app does.
check_app_url() {
  local url="$1" code
  if [[ ! "$url" =~ ^https://[a-z0-9.-]+$ ]]; then
    warn "\"$url\" is not an address like https://name.vercel.app (no path at the end)."
    return 1
  fi
  code=$(http_status "$url/api/reminders/key")
  if [[ "$code" != "200" ]]; then
    warn "$url/api/reminders/key answered $code, not 200. This is not the live app."
    return 1
  fi
}

# check_public_key URL KEY passes when the app shows exactly this public key.
check_public_key() {
  local url="$1" key="$2" body
  if ! body=$(curl -fsS --max-time 20 "$url/api/reminders/key" 2>/dev/null); then
    warn "Could not open $url/api/reminders/key."
    return 1
  fi
  [[ "$body" == *"\"$key\""* ]] && return 0
  if [[ "$body" == *'"publicKey":null'* ]]; then
    warn "The app shows no public key: the live deploy does not have the 4 Vercel settings yet."
    note "Redeploy production, wait until it is Ready, then check again."
  else
    warn "The app shows an older public key."
    note "Vercel still has an old VAPID_PUBLIC_KEY, or the redeploy is not Ready yet."
  fi
  return 1
}

# check_vercel_names NAME... passes when Vercel Production has every name.
# It leaves the names it did not find in MISSING_VERCEL_NAMES.
check_vercel_names() {
  local list name
  MISSING_VERCEL_NAMES=()
  if ! list=$(VERCEL_ORG_ID="$VERCEL_TEAM_ID" VERCEL_PROJECT_ID="$VERCEL_PROJECT_ID" \
    npx --yes "$VERCEL_CLI" env ls --environment production </dev/null 2>/dev/null); then
    warn "The Vercel CLI could not list the settings. Not signed in? Run: npx $VERCEL_CLI login"
    MISSING_VERCEL_NAMES=("$@")
    return 1
  fi
  # A name counts only on a row whose environments column says Production.
  for name in "$@"; do
    grep -Eq "^[[:space:]]*${name}[[:space:]].*Production" <<<"$list" || MISSING_VERCEL_NAMES+=("$name")
  done
  (( ${#MISSING_VERCEL_NAMES[@]} == 0 )) && return 0
  warn "Vercel Production does not have: ${MISSING_VERCEL_NAMES[*]}"
  note "Check that each one is saved for the Production environment."
  return 1
}

# check_vault_names NAME... passes when the live Supabase Vault has every name.
check_vault_names() {
  local out name missing=()
  if ! out=$(live_sql "select name from vault.secrets" 2>/dev/null); then
    warn "Could not read the live Vault. Not signed in? Run: npx supabase login"
    return 1
  fi
  for name in "$@"; do
    grep -q "\"$name\"" <<<"$out" || missing+=("$name")
  done
  (( ${#missing[@]} == 0 )) && return 0
  warn "The live Vault does not have: ${missing[*]}"
  return 1
}

# check_notify URL SECRET passes when the notify endpoint answers 401 without the secret
# and 200 with it. The secret goes to curl on stdin, never in the process list.
check_notify() {
  local url="$1/api/reminders/notify" secret="$2" without with ok=0
  without=$(http_status "$url" -X POST)
  with=$(printf 'authorization: Bearer %s\n' "$secret" | http_status "$url" -X POST -H @-)
  if [[ "$without" == "401" ]]; then
    printf '  %s✓%s without the secret: 401 (refused)\n' "$GREEN" "$RESET"
  else
    warn "Without the secret the endpoint answered $without. It must be 401."
    ok=1
  fi
  if [[ "$with" == "200" ]]; then
    printf '  %s✓%s with the secret: 200\n' "$GREEN" "$RESET"
  else
    warn "With the secret the endpoint answered $with. It must be 200."
    ok=1
  fi
  case "$with" in
    200) ;;
    503) note "503: the live deploy has no reminder settings. Add them in Vercel, then redeploy." ;;
    401) note "401: Vercel has a REMINDER_CRON_SECRET from an older run. Type skip, then run this wizard again." ;;
    404) note "404: this is not the live app address." ;;
    *) note "Open the newest deployment's logs in Vercel to see the error." ;;
  esac
  return "$ok"
}

# check_github_secret_names NAME... passes when the repo has every Actions secret.
check_github_secret_names() {
  local list name missing=()
  if ! list=$(gh secret list 2>/dev/null); then
    warn "gh could not list the GitHub secrets."
    return 1
  fi
  for name in "$@"; do
    grep -Eq "^${name}[[:space:]]" <<<"$list" || missing+=("$name")
  done
  (( ${#missing[@]} == 0 )) && return 0
  warn "GitHub does not have the secret(s): ${missing[*]}"
  return 1
}
