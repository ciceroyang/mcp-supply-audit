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

## What this does and does not measure

This is a recall check against labels the project wrote. It cannot measure false positives: no benign project corpus is published, so the false-positive side of the comparison stays unmeasured. A hand-written best-practice `.mcp.json` (absolute interpreter path, pinned local script, no shell metacharacters) still produced one finding, `AAK-MCP-ATTEST-001` (medium), a policy rule that fires unless attestation metadata is present. That is a design choice, not a defect, but it means "no findings" is not the default outcome for a clean project.

AAK is an artifact scanner and ATR is a content pattern set, so the two numbers in [rule-set-comparison.md](rule-set-comparison.md) are not the same kind of measurement. What the two now share is a method: run each project against its own published ground truth.

## Note

Two defects were found in 0.6.5. Both are held for coordinated disclosure and are deliberately not described here.
