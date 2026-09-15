# Where this work has been published

A living list of the public outputs, newest first. Each entry says what was contributed and where it lives, so the repository can be read as a portfolio rather than a pile of notes.

## Upstream, on other people's trackers

- **2026-09-15 — `modelcontextprotocol/registry#1404`** (comment). A concrete failure mode for the security-scan receipt design in that PR: a scanner that crashes can still produce a clean report and a passing CI run, which is exactly what an evidence-scoped `clean` field has to prevent. Suggests recording which components actually ran and making an incomplete state unable to coexist with `clean`.
- **2026-09-15 — `sattyamjjain/agent-audit-kit#743`** (issue). Scanner crash passes the run (fail-open), and `filesScanned` counts rule identifiers as files. Reproduction, root cause and suggested fixes. Written up in [findings/agentauditkit-0.6.5-scanner-fail-open.md](findings/agentauditkit-0.6.5-scanner-fail-open.md).
- **2026-09-15 — `Agent-Threat-Rule/agent-threat-rules#568`** (comment). Correction of my own earlier numbers in that thread, with the full-corpus measurement that replaced them. The earlier figures came from a hand-rolled YAML scanner that kept only the double-quoted third of the catalogue; see [notes/atr-coverage.md](notes/atr-coverage.md) for the corrected method and results.

## Rolls and artifacts on this repository

- Release **`mcp-census`** — the registry census, rebuilt daily from the public registry.
- Release **`rule-coverage`** — the ATR rule-set measurement, rebuilt weekly from a fresh checkout of the rule catalogue.

## In this repository

See [README.md](README.md) for the index of notes, findings and scripts, and the root [README](../README.md) for how to reproduce each one.
