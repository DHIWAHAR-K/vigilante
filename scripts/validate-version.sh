#!/bin/sh
set -eu

version_file=${1:-VERSION}

if [ ! -f "$version_file" ]; then
  echo "missing version file: $version_file" >&2
  exit 1
fi

version=$(sed -n '1p' "$version_file")
line_count=$(wc -l < "$version_file" | tr -d ' ')
pattern='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-(alpha|beta|rc)\.[1-9][0-9]*)?$'

if [ "$line_count" -ne 1 ] || ! printf '%s\n' "$version" | grep -Eq "$pattern"; then
  echo "invalid VERSION: expected one SemVer line such as 0.2.0-alpha.1" >&2
  exit 1
fi

printf '%s\n' "$version"
