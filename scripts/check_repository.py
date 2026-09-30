"""Offline foundation checks; inline Markdown paths only, not a full Markdown parser."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "README.md", "AGENTS.md", "ARCHITECTURE.md", "CONTRIBUTING.md", "SECURITY.md",
    "apps/api/AGENTS.md", "apps/web/AGENTS.md", "contracts/AGENTS.md",
    "contracts/README.md", "evals/AGENTS.md", "evals/README.md", "docs/AGENTS.md",
    "docs/ROADMAP.md", "docs/decisions/0001-runtime-and-boundaries.md",
    "docs/decisions/0002-evidence-and-debate.md", "docs/diagrams/architecture.mmd",
    "docs/diagrams/architecture.png", "docs/diagrams/README.md", "scripts/AGENTS.md",
    "scripts/check_repository.py", ".github/workflows/repository-checks.yml",
    ".github/CODEOWNERS", ".github/pull_request_template.md", ".editorconfig",
    ".gitattributes", ".gitignore",
)
TEXT_SUFFIXES = {".md", ".mmd", ".py", ".json", ".yml", ".yaml", ".toml", ".sh"}
TEXT_NAMES = {".editorconfig", ".gitattributes", ".gitignore", "CODEOWNERS"}
LINK = re.compile(r"!?\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+\"[^\"]*\")?\s*\)")
CONFLICT = re.compile(r"^(?:<{7}(?: |$)|={7}$|>{7}(?: |$))")


def local_links(path: Path, content: str) -> list[str]:
    errors = []
    fence = None
    for number, line in enumerate(content.splitlines(), 1):
        marker = re.match(r"^\s*(`{3,}|~{3,})", line)
        if marker:
            token = marker.group(1)
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence):
                fence = None
            continue
        if fence is not None:
            continue
        # Inline code examples are not rendered hyperlinks.
        line = re.sub(r"(`+).*?\1", "", line)
        for match in LINK.finditer(line):
            target = match.group(1) or match.group(2)
            try:
                parsed = urlsplit(target)
            except ValueError:
                errors.append(f"{path.relative_to(ROOT)}:{number}: invalid link target")
                continue
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            relative = unquote(parsed.path)
            destination = ((ROOT / relative.lstrip("/")) if relative.startswith("/")
                           else (path.parent / relative)).resolve()
            if not destination.is_relative_to(ROOT) or not destination.exists():
                errors.append(f"{path.relative_to(ROOT)}:{number}: missing local link: {target}")
    return errors


def main() -> int:
    errors = [f"Missing required file: {name}" for name in REQUIRED
              if not (ROOT / name).is_file()]
    try:
        listing = subprocess.run(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            cwd=ROOT, check=True, capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"Cannot enumerate repository files with Git: {exc}", file=sys.stderr)
        return 1

    names = sorted(set(listing.stdout.decode("utf-8").split("\0")) - {""})
    checked = 0
    for name in names:
        path = ROOT / name
        if not path.is_file() or path.suffix not in TEXT_SUFFIXES and path.name not in TEXT_NAMES:
            continue
        if path.is_symlink():
            errors.append(f"{name}: foundation text must not be a symlink")
            continue
        checked += 1
        try:
            raw = path.read_bytes()
            content = raw.decode("utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            errors.append(f"{name}: cannot read UTF-8 text: {exc}")
            continue
        if b"\r" in raw:
            errors.append(f"{name}: use LF line endings")
        if raw and not raw.endswith(b"\n"):
            errors.append(f"{name}: missing final newline")
        for number, line in enumerate(content.splitlines(), 1):
            if line.rstrip(" \t") != line:
                errors.append(f"{name}:{number}: trailing whitespace")
            if CONFLICT.match(line):
                errors.append(f"{name}:{number}: unresolved conflict marker")
        if path.suffix == ".md":
            errors.extend(local_links(path, content))

    if errors:
        print("Repository checks failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"Repository checks passed ({checked} text files; local paths and text hygiene).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
