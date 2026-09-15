# AgentAuditKit 0.6.5: a crashed scanner passes the scan

*Found 2026-09-15 against `agent-audit-kit` 0.6.5 (commit `3930c868`). Reported upstream as [sattyamjjain/agent-audit-kit#743](https://github.com/sattyamjjain/agent-audit-kit/issues/743).*

AgentAuditKit is a static scanner for MCP-connected agent pipelines. When one of its scanners raises an exception, the engine catches it, records an `AAK-INTERNAL-SCANNER-FAIL` finding at INFO severity, and continues with the rest. INFO is below the default reporting floor and below every value `--fail-on` accepts, so in the default run and in CI the crash is neither visible nor fatal.

## Reproduce

A single file is enough. This one is not valid UTF-8:

```sh
python3 -m venv venv && venv/bin/pip install agent-audit-kit
mkdir -p /tmp/p && cd /tmp/p
printf '{"mcpServers": {"a": "\xff\xfe bad"}}' > .mcp.json

venv/bin/agent-audit-kit scan . --format json -o out.json; echo "exit=$?"
venv/bin/agent-audit-kit scan . --ci; echo "ci exit=$?"
venv/bin/agent-audit-kit scan . --format json --severity info -o all.json
```

## What the report says

`exit=0` and `ci exit=0`. The default summary is self-contradictory:

```json
{"critical":0,"high":0,"medium":0,"low":0,"info":4,"total":4,"reported":0,"minSeverity":"low",...}
```

`info: 4` records four crashed scanners; `reported: 0` is what a consumer reads, and the findings array is empty. The four are `MCP configuration`, `Supply chain`, `Tool poisoning` and `Transport security`, all `UnicodeDecodeError`. Every MCP config rule is therefore skipped for that project, and:

- `--score` still returns `100 A`
- `--format sarif` emits zero results, so the GitHub code-scanning view shows nothing
- `--fail-on low`, `medium`, `high` and `critical` all exit 0
- `--fail-on` does not accept `info`, so no flag combination makes a crashed scanner fail the build

`--severity info` is the only way to see the crashes. Without it, "a scanner crashed" and "the project is clean" look identical in the output people read.

It is not specific to encoding. This config crashes the composition scanner with `TypeError: 'int' object is not iterable`:

```json
{"mcpServers": {"a": {"command": "node", "args": 42}}}
```

## Root cause

`agent_audit_kit/engine.py` wraps each scanner in a broad handler:

```python
except Exception as exc:
    all_findings.append(_scanner_fail_finding(reg.name, exc))
    continue
```

`_scanner_fail_finding()` (engine.py:198) hardcodes `severity=Severity.INFO`. Nothing else in the package special-cases `AAK-INTERNAL-SCANNER-FAIL` — `grep -rn` finds it only in `engine.py` and in its own definition in `rules/builtin.py`. The gate then applies the ordinary threshold (`commands/scan.py:455-472`) and the reporter applies the ordinary minimum-severity filter, which defaults to `low`. In `Severity.numeric()`, INFO is 1 and LOW is 2.

## A second defect in the same summary

`summary.filesScanned` counts rule identifiers as files. An empty directory reports 15 files scanned; one file reports 16; three report 18.

```sh
mkdir -p /tmp/e && cd /tmp/e
venv/bin/agent-audit-kit scan . --format json -o o.json
python3 -c "import json;print(json.load(open('o.json'))['summary']['filesScanned'])"   # 15
```

`engine.py:287` sets `result.files_scanned = len(all_scanned_files)`, the union of the second return value of every scanner. Eight scanners return the rule ids they evaluated there rather than the files they read, and their own docstrings say so ("set of rule ids this scanner evaluates"). The 15 ids across those eight scanners are exactly the offset. It feeds the reported number only, not detection, but it is the number that claims how much of a project was inspected.

## Suggested fix

- Give scanner failure its own exit path, or an opt-out flag, so `--ci` cannot pass with a crashed scanner.
- Lift `AAK-INTERNAL-SCANNER-FAIL` above the default reporting floor, or exempt it from the severity filter.
- Return real files from those eight scanners, or widen the return value so files and evaluated rules both survive.
- Cheap regression tests: an empty directory should report `filesScanned == 0`, and malformed UTF-8 should exit non-zero under `--ci`.

## Method

Read-only inspection of the published wheel and its public repository. The crashing inputs were crafted and run only in throwaway directories under `/tmp`; no third-party system was contacted and nothing was installed from the scanned projects. Both defects reproduce from the commands above; they were checked with a script that asserts the outputs shown here (15 assertions, all passing) rather than from reading the source alone.
