# The trust index

*What this repository is growing into. Written down so the pieces have something to agree on.*

## The thesis

Every tool an agent runs is a supply-chain decision, and almost none of them come with evidence. A model context protocol server is introduced by pasting a command into a config file. What runs at install time, what the tool descriptions say, what permissions the agent is granted, whether the declared repository is the one that publishes the package — all of it is taken on faith.

The evidence exists. It is just scattered across registries, package manifests, repositories and config files, and it goes stale the moment anyone publishes. This project collects it continuously and states it in one place, with the exact bytes behind every claim.

Two rules the whole thing runs on:

1. **Every claim is reproducible.** A finding names the field, file or manifest it came from. A reader can re-derive it without trusting the tool.
2. **Nothing is called clean when it was not checked.** A package whose manifest could not be fetched is `unmeasured`. A repository that could not be downloaded is `unmeasured`. The verdict of an artifact with an unmeasured part is `incomplete`, never `clean`.

The second rule is the product. It is what separates a trust index from a dashboard that looks reassuring.

## The record

One normalized record per server, assembled from evidence gathered at different times by different pipelines. Each evidence block carries its own status and its own provenance, and the record-level verdict is derived, not asserted.

```jsonc
{
  "server": "acme/weather",
  "title": "Weather",
  "repository": "https://github.com/acme/weather-mcp",
  "packages": [{ "registry": "npm", "name": "@acme/weather-mcp", "version": "1.4.0" }],
  "evidence": {
    "registryDocument": { "status": "findings", "source": "mcp-census", "findings": [ /* rule, severity, evidence */ ] },
    "packageManifest":  { "status": "clean",    "source": "guard-scan", "findings": [] },
    "repository":       { "status": "unmeasured", "source": "scan-repos", "reason": "fetch-failed" }
  },
  "verdict": "incomplete",
  "generatedAt": "2026-09-15T11:00:00.000Z"
}
```

`verdict` follows the same invariant the scanner enforces locally:

- any `unmeasured` evidence → **`incomplete`**
- otherwise any finding at the index threshold → **`findings`**
- otherwise → **`clean`**

## Where the evidence comes from

| block | pipeline | artifact |
| --- | --- | --- |
| registry document | `mcp-audit.mjs` | `census.json` |
| package manifest | `guard-scan.mjs` | `guard-scan.json` |
| repository | `scan-repos.mjs` | `repo-scan.json` |

Each runs on its own schedule and publishes to a release. The index is a join, not a new scan, so a block can be refreshed without redoing the others.

## What exists today

- The three evidence pipelines above, running and publishing.
- `scripts/build-index.mjs`, which joins them into the record shape and derives the verdict.
- A scanner, [agent-guard](https://github.com/ciceroyang/agent-guard), that consumes the same rules locally.

## What it needs to become the thing it is trying to be

- **A service**, not a file: an HTTP API over the index, and a badge endpoint so a project can show its own evidence in a README.
- **Wider ingestion**: PyPI and OCI manifests, container images, and the MCP registry beyond the first `limit`.
- **History**: what changed between two index builds, and which changes were silent.
- **A client**: the CLI can already scan a local project; it should be able to ask the index about the packages it finds.

None of that changes the two rules above. They are the reason to build this instead of another scanner.
