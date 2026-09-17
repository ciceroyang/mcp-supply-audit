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
| CVE-backed | **154 rules** reference CVEs; **176** distinct CVEs | **153 rules** reference CVEs; **213** distinct CVEs |
| OWASP Agentic tags | all 10, heavily ASI01 (486 rules carry the tag) | all 10: ASI01 14 · ASI02 48 · ASI03 73 · ASI04 74 · ASI05 56 · ASI06 48 · ASI07 9 · ASI08 5 · ASI09 18 · ASI10 21 |
| surface fields | `content` 1417, `user_input` 977, `tool_response` 858, `tool_args` 122, `agent_output` 30, `tool_name` 21, `tool_description` 11 | config/code artifacts; scanners include taint analysis, SSRF reachability, stdio taint, hook parsing |
| beyond detection | Sigma export, Semgrep integrations, YARA compile | SBOM (CycloneDX/SPDX), OpenVEX, tool pinning + drift watch (rug pull), local MCP proxy for runtime monitoring, EU AI Act reporting, auto-fix |

## What this shows

They are not two implementations of the same thing. ATR is a **detection-pattern taxonomy** aimed at the content an agent reads and writes; AAK is an **artifact and supply-chain scanner** aimed at the code and configuration an agent runs, with CVE-backed rules and runtime tooling around it.

That matters for anyone choosing between them: the overlap is roughly MCP configuration and tool poisoning, while prompt/content detection is ATR's lane and config/code/taint plus rug-pull and SBOM work is AAK's. A deployment that installs only one of them has an unmeasured half.

## Measured on each project's own ground truth

The pattern-layer measurement in [atr-coverage.md](atr-coverage.md) found two things this comparison predicts:

- **Recall asymmetry**: with all 3,443 patterns compiled, English injection phrasings match 9–11 ATR rules and natural Chinese phrasings 1–2; the code-switched `Ignore 以上所有 instructions` matches none.
- **False-positive pressure**: over ATR's full published benign corpus (11,780 samples across 26 files) our rule-level matcher flags 39.1% of samples, yet it passes **172/172** of the samples whose own `for_rule` metadata names the rule they must not trigger. Ranking rules by benign pressure agrees with ATR's own published `fp_count` at **Spearman rho 0.952** over 793 rules. The pressure concentrates in `condition: any` rules whose fields the corpus cannot stand in for — see [atr-coverage.md](atr-coverage.md).

AAK is an artifact scanner, not a text pattern set, so the same samples do not transfer — it was measured against its own published ground truth instead, in [aak-measurement.md](aak-measurement.md): 13 labelled vulnerable configs, then 37 real `.mcp.json` files taken from public repositories. Recall on the project's own labels is 100% (73/73 expected rules, 13/13 examples). The number the labels cannot supply is the one that matters here: `AAK-MCP-ATTEST-001` fires on **30 of 37** ordinary real-world configs. It is a policy rule and not a defect, but it means the finding count is no more of a discriminator in AAK's output than match count is in ATR's.

Both notes now use the same method — run each project against ground truth it cannot have tuned to this measurement, or against artifacts it did not select — and both say where the measurement is blind. Neither number is a precision claim on the other's lane.

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
