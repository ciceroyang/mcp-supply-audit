# mcp-supply-audit

Census and provenance audit for the public MCP server ecosystem.

The [official MCP registry](https://registry.modelcontextprotocol.io) describes every server in a structured `server.json` — packages, transport, repository — which makes it a far better enumeration source than the GitHub topics. This tool reads that registry, resolves each declared package against its package-registry metadata, and reports findings that carry the exact field and value they came from, so a reader can reproduce every verdict without trusting the tool.

## What it checks (v0, npm packages)

| rule | severity | meaning |
| --- | --- | --- |
| `install-time-execution` | high | the declared version defines `preinstall` / `install` / `postinstall` |
| `install-hook-critical` | critical | a hook shows a fetch (`curl`, `wget`, a URL), a shell (`sh -c`, `| sh`), a process spawn (`child_process`, `execSync`, `spawn`) or decode-and-exec (`eval`, `base64 -d`) |
| `install-hook-script-inspected` | info | the hook runs a local script; the published file was fetched and statically scanned, and contained no fetch/spawn/decode pattern |
| `install-hook-script-critical` | critical | the referenced script itself matches one of the critical patterns |
| `install-hook-script-unavailable` | unknown | the hook runs a local script whose content could not be fetched — not treated as clean |
| `repository-mismatch` | medium | the package manifest and the registry entry point at different repositories |
| `package-repository-missing` | medium | the package manifest has no `repository` field (provenance is unverifiable) |
| `process-spawn-dependency` | info | declared dependencies that can spawn processes |
| `declared-version-not-latest` | info | the registry declares a version that is not the published latest |
| `package-deprecated` | info | the package is deprecated on the registry |
| `stdio-transport` | info | the server runs locally as a child process |
| `package-metadata-unavailable` | unknown | metadata could not be fetched — explicitly not reported as clean |
| `pypi-sdist-only` | medium | (PyPI) the declared version ships no wheel, so installing builds from source and executes build code |
| `pypi-install-time-unknown` | unknown | (PyPI) wheels unpack without executing code but sdist builds do, and PyPI metadata exposes no hook either way — the install-time dimension stays unknown, never clean |
| `declared-version-not-found` | unknown | (PyPI) the declared version has no files in `releases` |
| `package-yanked` | info | (PyPI) the declared version is yanked |

## Usage

```sh
git clone https://github.com/ciceroyang/mcp-supply-audit
cd mcp-supply-audit

node mcp-audit.mjs --max 400                  # bounded sample, prints a Markdown report
node mcp-audit.mjs --max 6000 --out census.json --markdown census.md
```

## Coverage is reported, not assumed

The registry contains servers that declare no package (remote-only) and packages in registries this version does not audit yet (PyPI, OCI, MCPB). The report states how many servers were enumerated, how many declare a package, how many were actually audited, and how many are therefore **not** reported as clean. `unknown` is never folded into a pass.

## What this is not

- **Not** proof of exploitability. A finding is a statement about published metadata.
- **Not** a scanner of live endpoints. The tool never contacts a server URL, never installs or executes a package, and never sends credentials anywhere. It is read-only against public registries.
- **Not** a replacement for the rule-based agent-security projects (ATR, AgentAuditKit). It is the evidence layer underneath them: a reproducible census with per-finding provenance.

## Data

A scheduled workflow refreshes the census and publishes it as a rolling release: `https://github.com/ciceroyang/mcp-supply-audit/releases/tag/mcp-census`.

The first written report, generated from that artifact, is [docs/census-2026-09.md](docs/census-2026-09.md): 6,000 entries covering 2,143 unique servers, 245 audited npm packages, 16 with install-time execution of which 3 critical.

## License

MIT. Maintained by [@ciceroyang](https://github.com/ciceroyang).