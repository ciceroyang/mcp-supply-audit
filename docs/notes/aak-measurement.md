# AgentAuditKit, measured on its own labelled examples

*Independent run of AgentAuditKit 0.6.5 against the examples the project publishes, September 2026.*

The rule-set comparison in [rule-set-comparison.md](rule-set-comparison.md) left AAK unmeasured, because its scanner targets project artifacts rather than arbitrary text. The project ships its own answer to that: `examples/vulnerable-configs/01..13`, each with an `expected-findings.json` naming the rules it is supposed to trigger and a minimum finding count.

## Method

Each example was copied to an isolated directory with its `expected-findings.json` removed (so the label file is not itself scanned), then scanned with the published 0.6.5 CLI:

```sh
agent-audit-kit scan <copy> --format json -o out.json
```

Reported rule ids were compared against `expectedRules` and the finding total against `expectedMinFindings`.

## Result: recall on their own labels is 100%

- **73 of 73 expected rules fired** across the 13 examples.
- **13 of 13 examples met `expectedMinFindings`.**
- 88 distinct rules were reported in total, 15 of them beyond the labels — mostly `AAK-MCP-ATTEST-001`, which appears on nearly every example, plus a few adjacent rules each example also trips.

| example | expected rules | missed | findings | minimum |
| --- | --- | --- | --- | --- |
| 01-no-auth-remote | 4 | 0 | 8 | 4 |
| 02-shell-injection | 6 | 0 | 14 | 8 |
| 03-hardcoded-secrets | 6 | 0 | 19 | 16 |
| 04-hook-exfiltration | 9 | 0 | 46 | 16 |
| 05-trust-boundary-violations | 6 | 0 | 11 | 10 |
| 06-tool-poisoning | 6 | 0 | 12 | 6 |
| 07-tainted-tool-function | 8 | 0 | 21 | 8 |
| 08-transport-insecurity | 6 | 0 | 12 | 8 |
| 09-a2a-insecure-agent | 7 | 0 | 13 | 7 |
| 10-supply-chain-risks | 6 | 0 | 12 | 10 |
| 11-legal-compliance | 3 | 0 | 3 | 3 |
| 12-colorado-admt | 3 | 0 | 5 | 3 |
| 13-eu-ai-act-art50 | 3 | 0 | 7 | 3 |

## Finding pressure on real-world configuration

To get a false-positive proxy that does not depend on labels the project wrote, 37 `.mcp.json` files were fetched from 37 distinct public repositories (template, sample, fixture and security-tooling files excluded), each placed alone in an isolated directory and scanned with the same CLI. Repository names are deliberately not recorded here; the question is what the rules do on ordinary real configs, not which projects look bad.

- **5 of 37 produced no findings at all.**
- **30 of 37 (81%) produced `AAK-MCP-ATTEST-001`** — "MCP server admitted without attestation" (medium), which wants a signed clearance assertion, a `/.well-known/mcp-clearance` URI, or a pinned trust root on the server entry. Practically no public MCP config carries that.
- Four of those were `AAK-MCP-ATTEST-001` and nothing else.
- The next most frequent rules were `AAK-MCP-006` (relative path, 12), `AAK-MCP-005` (`npx`/`uvx`, 11), `AAK-MCP-007` (10), `AAK-SUPPLY-001` (10) and `AAK-MCP-001` (9) — these read as intended detections on configs that really do use unpinned and relative commands.

These configs are unlabelled, so this is not a false-positive rate: a finding may be a genuine hardening gap in that project. What it does show is discriminating power. A rule that fires on four out of five real configs cannot separate a careless project from a careful one, and "no findings" is not the default outcome of a scan — 32 of 37 ordinary configs produce something.

## What this does and does not measure

The recall half is measured against labels the project wrote. The false-positive half cannot be measured the same way, because no benign project corpus is published; the real-world scan above is a proxy, not a substitute. A hand-written best-practice `.mcp.json` (absolute interpreter path, pinned local script, no shell metacharacters) also produced one finding, `AAK-MCP-ATTEST-001` (medium). That is a policy rule, and its near-universal behaviour on real configs is the most useful single number in this note.

AAK is an artifact scanner and ATR is a content pattern set, so the two numbers in [rule-set-comparison.md](rule-set-comparison.md) are not the same kind of measurement. What the two now share is a method: run each project against its own published ground truth.

## The defects this run surfaced, and their fix

Two defects were found in 0.6.5 and reported upstream in `sattyamjjain/agent-audit-kit#743`:

1. A scanner that raised was recorded as an `AAK-INTERNAL-SCANNER-FAIL` finding at INFO, which is below the default reporting floor and below anything `--fail-on` can express. A run in which four scanners had died and every MCP config rule was skipped exited 0, and `--score` still returned 100/100 grade A.
2. `filesScanned` counted rule ids. Eight scanners returned the set of rule ids they evaluate as their second return value, so an empty directory reported 15 files.

Both were fixed in 0.6.6, and the fix was verified independently from this side — see [findings/agentauditkit-0.6.5-scanner-fail-open.md](../findings/agentauditkit-0.6.5-scanner-fail-open.md). The same failure class was then checked in ATR, where it is still live: [findings/atr-4.0.0-config-scan-noop.md](../findings/atr-4.0.0-config-scan-noop.md).

The recall and false-positive numbers above are from 0.6.5 and are left exactly as measured. 0.6.6 changed the failure reporting, the file-count contract, and the deferred CVE rules (348 → 352 rules), so these numbers should be re-run before anyone compares them across versions.
