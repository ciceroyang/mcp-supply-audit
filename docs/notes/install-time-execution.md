# Installing an MCP server is installing code

*A census of the public MCP registry, September 2026.*

The MCP registry describes a server with structured metadata: packages, transport, repository. A client reads that metadata and installs the package. For npm packages, that install runs whatever `preinstall` / `install` / `postinstall` scripts the package declares — before anyone has validated a single tool call.

We enumerated the registry and audited the npm packages it declares. Out of **245** audited packages:

- **16** run code at install time;
- **11** of those download a platform binary and execute it.

## The pattern, concretely

Eleven published packages ship a `postinstall` of `node scripts/install.js`. Fetched from the published package and read statically, the script:

1. resolves a platform-specific archive from a GitHub release;
2. downloads it over HTTPS;
3. downloads a SHA-256 sidecar from the **same origin** and verifies the archive;
4. extracts it (`tar`, `unzip`, or PowerShell `Expand-Archive`) and installs the binary into the package.

Nothing here is hidden, and the author verifies checksums — this is a carefully built installer. Two properties are still worth stating precisely:

- **A same-origin checksum is an integrity check, not an authenticity check.** It detects a corrupted download; it does not detect a compromised release origin, because the expected hash comes from the same base URL as the artifact.
- **The download location is configurable at install time.** `LABBY_RELEASE_BASE_URL`, `LABBY_REPO` and `LABBY_VERSION` override the base URL, the repository and the version. If any of those are redirected, the checksum is fetched from the same redirected location, so verification adds no protection on that path.

For a user, the consequence is simple: choosing a server in a client, or running `npx`, silently becomes *download and run a platform binary*. No npm metadata field surfaces that, and the registry schema has no place to express it.

## What we are not claiming

- This is a statement about **published metadata**, not evidence of malicious intent. Install hooks are ordinary npm practice, and this installer verifies checksums.
- No endpoint was contacted, nothing was installed or executed, and no credentials were used. The analysis is read-only against public registries.
- A static finding is not proof of exploitability.

## A negative result, recorded

We also looked for registry namespace squatting — lookalike server names, generic slugs (`slack`, `postgres`, `gmail`) claimed by unrelated namespaces, edit-distance-1 slug pairs. Across 2,142 server names we found **no evidence of it**: the near-duplicates are coincidences (`docs`/`dock`, `exa`/`vexa`), and the generic slugs are held by a single aggregator that lists them legitimately. Naming in the registry is noisy, not deceptive.

## Appendix: the detector was wrong twice, and that matters

Publishing a scan verdict without saying how the scanner changed is how security tooling loses trust. Ours changed three times in one day against real artifacts:

- **v0** treated any `node -e` install hook as a shell pipeline. On real artifacts its critical tier had **precision 0/3** — two install banners and a build step.
- **v0.1** required fetch/spawn/decode evidence and added content inspection of scripts referenced by a hook. It found the binary-download pattern above, but it also flagged **string literals**: a notice containing a URL, and a warning message containing `curl ... | sh`.
- **v0.2** matches a `postinstall` command raw (the quoted argument of `node -e "..."` is the executed code) and a referenced script after stripping strings and comments (quoted text there is data), with module names matched before stripping. A hand-labeled corpus of 8 samples — four of them the real false positives above — guards precision and recall in the test suite.

The lesson generalizes: an install-time signal is only usable if the verdict is bound to the scanner version, the rule set and the artifact digest that produced it. That is precisely the shape proposed for the registry's security-scan receipt in modelcontextprotocol/registry#1404, which is why we contributed this data there.

## Reproduce

```sh
git clone https://github.com/ciceroyang/mcp-supply-audit
node mcp-audit.mjs --max 6000 --out census.json --markdown census.md
```

Full report: [docs/census-2026-09.md](../census-2026-09.md). Rolling data: https://github.com/ciceroyang/mcp-supply-audit/releases/tag/mcp-census.
