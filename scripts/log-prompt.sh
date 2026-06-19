#!/usr/bin/env bash
# Appends each user prompt to docs/devlog/prompts.log.
# Invoked by a UserPromptSubmit hook; receives hook JSON on stdin.
set -euo pipefail

LOG="docs/devlog/prompts.log"
mkdir -p "$(dirname "$LOG")"

input="$(cat)"
agent="${1:-agent}"

# Field name can differ by tool/version; falls back to raw input so nothing is lost.
prompt="$(printf '%s' "$input" | jq -r '.prompt // .user_prompt // .message // empty' 2>/dev/null || true)"
[ -z "${prompt:-}" ] && prompt="$input"

{
  printf '\n### %s — %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$agent"
  printf '%s\n' "$prompt"
} >> "$LOG"

exit 0   # empty stdout = nothing injected into the agent's context
