# Feeding the census into agent-guard

*First run of the combined pipeline, September 2026.*

The census in this repository enumerates the MCP registry and reports per-server metadata findings. It is deliberately shallow — registry documents, not package manifests. [agent-guard](https://github.com/ciceroyang/agent-guard) carries the supply-chain rules. `scripts/guard-scan.mjs` joins them: it takes the packages the census resolved, reads each published npm manifest, and runs agent-guard's manifest checks over it, so the two projects share one implementation of those rules rather than two that drift.

Read-only throughout: registry metadata plus the published manifest. No tarball is downloaded, no package is installed, nothing is executed.

```sh
node scripts/guard-scan.mjs --census census.json --out guard-scan.json --summary guard-scan.md
# agent-guard is found at ../agent-guard, or pass --agent-guard <path>
```

## Result

- packages considered: **245**
- clean: **216**
- with findings: **7**
- **metadata unavailable: 22** — fetched from the registry, not from the package, so the manifest could not be read. Counted as unmeasured, never as clean.

| rule | severity | packages | example |
| --- | --- | --- | --- |
| `AG-SUPPLY-001` | medium | 5 | `@clawfetch/mcp@0.2.2` — devDependency resolves to `file:../clawfetch-sdk` |
| `AG-INSTALL-001` | critical | 2 | `@buywhere/mcp-server@0.3.1` — the `postinstall` script evaluates inline code |
| `AG-SUPPLY-002` | low | 2 | `@circulara/plugin@0.1.2` — devDependency floats on `*` |

## What the join shows

The census already reports install-time execution through its own hook analysis. Running the same manifests through agent-guard adds two things the census does not say on its own: dependency specifications that resolve to a mutable source (`file:`, git, raw http) rather than a registry version, and versions that float on `*`.

It also exposed a refinement, which is now made. Every `AG-SUPPLY-001` hit above is a **devDependency**, and a dev or peer dependency never reaches someone who installs the package — only its maintainer. agent-guard now reports those fields at a lower severity than a runtime one: `AG-SUPPLY-001` drops from high to medium and `AG-SUPPLY-002` from medium to low, with `(dev-only)` appended to the message. The finding stays, because the statement is still true; only its weight changed.

A package whose manifest could not be fetched stays visible as `metadata-unavailable`. Folding those 22 into "clean" would have made the pipeline report 238 clean packages instead of 216, and that number would have been wrong.
