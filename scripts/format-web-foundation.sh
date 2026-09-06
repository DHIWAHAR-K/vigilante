#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

mode="${1:-check}"
case "$mode" in
  check)
    prettier_mode="--check"
    ;;
  write)
    prettier_mode="--write"
    ;;
  *)
    echo "usage: $0 [check|write]" >&2
    exit 2
    ;;
esac

files='
.github/workflows/governance.yml
.env.example
CHANGELOG.md
docs/DEVELOPMENT.md
docs/PROJECT_PLAN.md
docs/decisions/0002-web-v1-runtime-and-deployment.md
docs/decisions/0003-web-v1-auth-and-data.md
docs/decisions/0004-web-v1-ai-and-retrieval.md
eslint.config.mjs
next-env.d.ts
next.config.ts
package.json
playwright.config.ts
prettier.config.mjs
src
supabase
tsconfig.json
vitest.config.ts
vitest.setup.ts
'

# shellcheck disable=SC2086
npx prettier "$prettier_mode" --ignore-unknown $files
