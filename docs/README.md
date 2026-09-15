# What is in here

Read-only evidence about the public MCP ecosystem. Every number is regenerated from public sources by the workflows in `.github/workflows`; nothing contacts a live server, installs a package, or sends credentials anywhere.

## The census

[`census-2026-09.md`](census-2026-09.md) reads the official MCP registry end to end and keeps the field and value behind every finding, so a reader can re-derive each verdict. Rolling artifact: release `mcp-census`, rebuilt daily.

## Rule-set measurement

The two catalogues people actually deploy, measured against their own published ground truth rather than against documentation.

- [`notes/atr-coverage.md`](notes/atr-coverage.md) — Agent Threat Rules against the registry and against its own published benign corpora, reported at pattern level and rule level. Includes a rank cross-check against ATR's own false-positive measurement: Spearman 0.952 over 793 rules.
- [`notes/rule-set-comparison.md`](notes/rule-set-comparison.md) — ATR and AgentAuditKit side by side, naming the layer each one occupies.
- [`notes/aak-measurement.md`](notes/aak-measurement.md) — AgentAuditKit run against its own labelled examples (73/73 expected rules fired) and against 37 real-world configs.
- [`notes/cross-tool-matrix.md`](notes/cross-tool-matrix.md) — ten identical artifacts pushed through both tools.
- Rolling artifact: release `rule-coverage`, rebuilt weekly.

## Combined with the scanner

- [`notes/guard-scan-2026-09.md`](notes/guard-scan-2026-09.md) — the census packages run through [agent-guard](https://github.com/ciceroyang/agent-guard)'s manifest checks, with the coverage split reported rather than assumed.
- [`notes/repo-scan-2026-09.md`](notes/repo-scan-2026-09.md) — the scanner pointed at 40 real repositories, and the three false-positive classes that came out of the run.

## The product

- [`product/b2b.md`](product/b2b.md) — the business shape: enterprise agent governance, the four parts, the open-core split, and what is honestly missing.
- [`product/trust-index.md`](product/trust-index.md) — the thesis the evidence model comes from.
- [`product/positioning.md`](product/positioning.md) — why the product is the tool supply rather than an audit report.

## The product

- [`product/trust-index.md`](product/trust-index.md) — the thesis this repository is growing into: a reproducible trust index for agent tools, where every claim is traceable and nothing is called clean when it was not checked.

## Writing

- [`articles/2026-09-scanner-that-said-clean.md`](articles/2026-09-scanner-that-said-clean.md) — the full story in one piece: the fail-open bug, the measurement I got wrong and corrected, what the two rule sets look like under their own labels, and the tool that came out of it.

## Findings

- [`notes/install-time-execution.md`](notes/install-time-execution.md) — what runs at install time in published MCP packages.
- [`findings/agentauditkit-0.6.5-scanner-fail-open.md`](findings/agentauditkit-0.6.5-scanner-fail-open.md) — AgentAuditKit 0.6.5 lets a crashed scanner pass the run, with the reproduction and root cause. Reported upstream: [sattyamjjain/agent-audit-kit#743](https://github.com/sattyamjjain/agent-audit-kit/issues/743).

## Where it has been published

[`publications.md`](publications.md) keeps the list of public outputs — the upstream issues and comments, the rolling releases, and what each one contributes.

## Reproduce

Every script lives in `scripts/`, every measured artifact is a release on this repository, and each note states the command that produced it. The root [README](../README.md) has the quick version.
