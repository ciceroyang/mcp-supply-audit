# Two agent-security rule sets, measured side by side

*Agent Threat Rules (ATR) and AgentAuditKit (AAK), September 2026.*

Both projects publish rule sets for the same problem space, and both advertise full OWASP Agentic Top 10 coverage. Coverage claims are cheap; this note puts the two catalogs next to each other and names the layer each one actually occupies, so a reader can tell where they overlap and where one of them is the only option.

## Catalogs

| | Agent Threat Rules | AgentAuditKit |
| --- | --- | --- |
| rules | **825** | **348** |
| form | YAML `detection.conditions[]` — 3,443 regex conditions | Python scanners (AST / taint / config) + a JSON rule bundle |
| version measured | `main` | `agent-audit-kit` 0.6.5, bundle sha256 `f293747e…c76c3a49` |
| severity | critical 280 / high 456 / medium 86 / low 3 | critical 81 / high 160 / medium 93 / low 9 / info 5 |
| MCP-facing | 398 rules with `scan_target: mcp` | 139 rules named `AAK-MCP-*` / `AAK-STDIO-*`; `mcp-config` category 67 |
| CVE-backed | 19 rule files reference CVEs; 176 distinct CVEs across references | **153 rules** reference CVEs; **213** distinct CVEs |
| OWASP Agentic tags | all 10, heavily ASI01 (609 tag occurrences) | all 10: ASI01 14 · ASI02 48 · ASI03 73 · ASI04 74 · ASI05 56 · ASI06 48 · ASI07 9 · ASI08 5 · ASI09 18 · ASI10 21 |
| surface fields | `content` 1417, `user_input` 977, `tool_response` 858, `tool_args` 122, `agent_output` 30, `tool_name` 21, `tool_description` 11 | config/code artifacts; scanners include taint analysis, SSRF reachability, stdio taint, hook parsing |
| beyond detection | Sigma export, Semgrep integrations, YARA compile | SBOM (CycloneDX/SPDX), OpenVEX, tool pinning + drift watch (rug pull), local MCP proxy for runtime monitoring, EU AI Act reporting, auto-fix |

## What this shows

They are not two implementations of the same thing. ATR is a **detection-pattern taxonomy** aimed at the content an agent reads and writes; AAK is an **artifact and supply-chain scanner** aimed at the code and configuration an agent runs, with CVE-backed rules and runtime tooling around it.

That matters for anyone choosing between them: the overlap is roughly MCP configuration and tool poisoning, while prompt/content detection is ATR's lane and config/code/taint plus rug-pull and SBOM work is AAK's. A deployment that installs only one of them has an unmeasured half.

## Measured on ATR, and not yet on AAK

The pattern-layer measurement in [atr-coverage.md](atr-coverage.md) found two things this comparison predicts:

- **Recall asymmetry**: English injection phrasings match 1–3 ATR rules; three of four natural Chinese phrasings match none, and a code-switched `Ignore 以上所有 instructions` matches none either.
- **False-positive pressure**: 19 of 820 samples from ATR's own benign corpora fire at least one rule (2.3%, upper bound, no gates), concentrated in five rules and four classes — prose about a technique, the mitigation rather than the attack, ordinary credential handling, and localhost.

AAK has not been measured the same way here yet. Its `scan` command targets project artifacts rather than arbitrary text, so a fair run needs a constructed corpus rather than the same 820 strings; that is the next step, and until it exists this note makes no claim about AAK's precision.

## Reproduce

```sh
# ATR catalog
git clone --depth 1 --filter=blob:none --sparse https://github.com/Agent-Threat-Rule/agent-threat-rules
cd agent-threat-rules && git sparse-checkout set rules

# AAK catalog (authoritative bundle, signed format)
python3 -m venv venv && venv/bin/pip install agent-audit-kit
venv/bin/agent-audit-kit export-rules -o aak-rules.json
```

Every number above comes from those two artifacts, not from documentation.
