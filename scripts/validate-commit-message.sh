#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "usage: $0 'type(scope): imperative summary'" >&2
  exit 2
fi

subject=$1

if [ "${#subject}" -gt 72 ]; then
  echo "commit subject exceeds 72 characters" >&2
  exit 1
fi

pattern='^(feat|fix|refactor|perf|test|docs|build|ci|style|chore|revert)\([a-z0-9]+([/-][a-z0-9]+)*\)!?: [a-z0-9].*[^.]$'
short_pattern='^(feat|fix|refactor|perf|test|docs|build|ci|style|chore|revert)\([a-z0-9]+([/-][a-z0-9]+)*\)!?: [a-z0-9]$'

if ! printf '%s\n' "$subject" | grep -Eq "$pattern|$short_pattern"; then
  echo "invalid commit subject: $subject" >&2
  echo "expected: type(scope): imperative summary (scope required, no trailing period)" >&2
  exit 1
fi
