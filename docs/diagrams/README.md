# Architecture diagram

[architecture.mmd](architecture.mmd) is the editable Mermaid source.
[architecture.png](architecture.png) is the checked-in preview embedded by
[ARCHITECTURE.md](../../ARCHITECTURE.md), so a Markdown viewer does not need to
support Mermaid to show the flowchart. The architecture also includes a text summary.

When changing the diagram, use Mermaid CLI (`mmdc`) to update the image:

```sh
mmdc -i docs/diagrams/architecture.mmd -o docs/diagrams/architecture.png -t neutral -b white -w 1000 -s 2
```

The CLI is an optional documentation tool, not an application dependency. Run the
command from the repository root after installing Mermaid CLI and its supported
browser locally. Commit the source and regenerated preview together. Check the
rendered image for legibility and run `python3 scripts/check_repository.py`.
