#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

required_files='README.md VERSION CHANGELOG.md CONTRIBUTING.md AGENTS.md docs/DEVELOPMENT.md docs/VERSIONING.md docs/PROJECT_PLAN.md docs/GITHUB_RULES.md docs/RELEASE_CHECKLIST.md docs/decisions/README.md docs/decisions/0000-template.md .github/pull_request_template.md .github/workflows/governance.yml .githooks/pre-commit .githooks/commit-msg .githooks/pre-push scripts/validate-commit-message.sh scripts/validate-version.sh'

for path in $required_files; do
  if [ ! -f "$path" ]; then
    echo "missing governance file: $path" >&2
    exit 1
  fi
done

./scripts/validate-version.sh VERSION >/dev/null

for path in .githooks/pre-commit .githooks/commit-msg .githooks/pre-push scripts/validate-commit-message.sh scripts/validate-version.sh scripts/validate-governance.sh; do
  if [ ! -x "$path" ]; then
    echo "expected executable file: $path" >&2
    exit 1
  fi
done

if find . -type f ! -path './.git' ! -path './.git/*' -print0 | xargs -0 grep -IEn '[[:blank:]]+$'; then
  echo "trailing whitespace detected" >&2
  exit 1
fi

echo "governance checks passed"
