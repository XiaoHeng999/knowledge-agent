#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

# jq filter to extract streaming text from assistant messages
stream_text='select(.type == "assistant").message.content[]? | select(.type == "text").text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'

# jq filter to extract final result
final_result='select(.type == "result").result // empty'

echo "=== Ralph AFK started: up to $1 iterations ==="

for ((i=1; i<=$1; i++)); do
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  ITERATION $i / $1"
  echo "╚══════════════════════════════════════╝"

  tmpfile=$(mktemp)
  trap "rm -f $tmpfile" EXIT

  commits=$(git log -n 5 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No commits found")
  issues=$(gh issue list --state open --json number,title,body,comments)
  prompt=$(cat ralph/prompt.md)

  echo ">>> Sending prompt to Claude..."
  claude \
    --print \
    --verbose \
    --output-format stream-json \
    --permission-mode acceptEdits \
    "Previous commits: $commits $issues $prompt" \
  | grep --line-buffered '^{' \
  | tee "$tmpfile" \
  | jq --unbuffered -rj "$stream_text"

  echo ""
  echo "--- Iteration $i finished, checking result ---"

  result=$(jq -r "$final_result" "$tmpfile")

  if [[ "$result" == *"<promise>NO MORE TASKS</promise>"* ]]; then
    echo ""
    echo "=== Ralph complete after $i iterations ==="
    exit 0
  fi

  echo "--- Moving to next iteration ---"
done

echo ""
echo "=== Ralph finished all $1 iterations ==="