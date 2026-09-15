#!/usr/bin/env node
/**
 * mcp-supply-audit — census and provenance audit for the public MCP server ecosystem.
 *
 * Primary source: the official registry (registry.modelcontextprotocol.io/v0/servers),
 * which is structured (packages, repository, transport) and far less noisy than the
 * GitHub topics. Every verdict carries the exact field/value it came from, so a reader
 * can reproduce it without trusting this tool.
 *
 * Static analysis only. The tool never contacts a server endpoint, never installs or
 * executes a package, and never sends credentials anywhere.
 *
 * @module mcp-supply-audit
 */
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const VERSION = '0.1.0'
export const SCHEMA = 'mcp-supply-audit/v1'
export const REGISTRY = 'https://registry.modelcontextprotocol.io/v0/servers'

export function defaultHttp(url, headers) {
  return fetch(url, { headers: headers || {}, redirect: 'follow', signal: AbortSignal.timeout(30000) })
    .then(async (res) => ({ status: res.status, text: res.status === 200 ? await res.text() : '' }))
    .catch(() => ({ status: 0, text: '' }))
}

/** Page through the official registry. `max` caps the number of servers read. */
export async function fetchRegistry({ http = defaultHttp, max = Infinity, pageSize = 100, maxPages = 200, onPage = null } = {}) {
  const servers = []
  let cursor = null
  let pages = 0
  for (;;) {
    const url = REGISTRY + '?limit=' + pageSize + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')
    const res = await http(url)
    if (res.status !== 200) throw new Error('registry request failed: status ' + res.status)
    const json = JSON.parse(res.text)
    for (const entry of json.servers ?? []) {
      if (servers.length >= max) break
      servers.push(entry.server ?? entry)
    }
    pages += 1
    cursor = json.metadata?.nextCursor ?? null
    if (onPage) onPage(pages, servers.length)
    if (!cursor || servers.length >= max || pages >= maxPages) break
  }
  return { servers, pages, truncated: cursor !== null }
}

/** Normalise a repository URL to `host/path` so two checkouts of the same project match. */
function repoKey(url) {
  if (!url) return null
  const cleaned = String(url).replace(/^git\+/, '').replace(/\.git$/, '').replace(/\/$/, '')
  try {
    const parsed = new URL(cleaned)
    return (parsed.hostname + parsed.pathname).toLowerCase()
  } catch {
    return null
  }
}

const INSTALL_HOOKS = ['preinstall', 'install', 'postinstall']
const SHELLISH = /(curl|wget|bash|sh\s+-c|node\s+-e|python\s+-c|chmod|eval|base64\s+-d|\|)/i

/**
 * Pure rule engine: one registry server plus whatever package metadata we could fetch.
 * Returns findings, each carrying the field and value that produced it.
 * @param {object} server - registry server.json entry.
 * @param {object|null} pkgMeta - npm document for the declared package, or null.
 * @param {{version?: string}} [declared] - the version the registry declares.
 * @returns {Array<object>} findings.
 */
export function auditPackage(server, pkgMeta, declared = {}) {
  const findings = []
  const add = (rule, severity, evidence) => findings.push({ rule, severity, evidence })
  const packages = Array.isArray(server?.packages) ? server.packages : []

  for (const entry of packages) {
    if (entry?.transport?.type === 'stdio') {
      add('stdio-transport', 'info', 'packages[].transport.type=stdio (runs locally as a child process)')
    }
  }

  if (!pkgMeta) {
    if (packages.length > 0) add('package-metadata-unavailable', 'unknown', 'no registry metadata fetched for ' + packages.map((p) => p.identifier).join(', '))
    return findings
  }

  const declaredVersion = declared.version ?? packages[0]?.version ?? null
  const versionDoc = declaredVersion && pkgMeta.versions ? pkgMeta.versions[declaredVersion] : null
  const latest = pkgMeta['dist-tags']?.latest ?? null

  const scripts = versionDoc?.scripts ?? pkgMeta.scripts ?? null
  if (scripts) {
    for (const hook of INSTALL_HOOKS) {
      if (typeof scripts[hook] === 'string' && scripts[hook].trim() !== '') {
        add('install-time-execution', 'high', 'scripts.' + hook + '=' + JSON.stringify(scripts[hook]))
        if (SHELLISH.test(scripts[hook])) {
          add('install-script-shell-pipeline', 'critical', 'scripts.' + hook + ' matches a shell/download pattern: ' + JSON.stringify(scripts[hook]))
        }
      }
    }
  }

  const repoUrl = versionDoc?.repository?.url ?? (typeof pkgMeta.repository === 'string' ? pkgMeta.repository : pkgMeta.repository?.url) ?? null
  const registryRepo = server?.repository?.url ?? server?.repository ?? null
  if (!repoUrl) {
    add('package-repository-missing', 'medium', 'registry document has no repository field')
  } else {
    const pkgKey = repoKey(repoUrl)
    const regKey = registryRepo ? repoKey(registryRepo) : null
    if (pkgKey && regKey && pkgKey !== regKey) {
      add('repository-mismatch', 'medium', 'package repository ' + pkgKey + ' vs registry repository ' + regKey)
    }
  }

  if (latest && declaredVersion && latest !== declaredVersion) {
    add('declared-version-not-latest', 'info', 'registry declares ' + declaredVersion + ', npm latest is ' + latest)
  }
  if (pkgMeta.deprecated) {
    add('package-deprecated', 'info', 'npm deprecation message: ' + JSON.stringify(String(pkgMeta.deprecated).slice(0, 160)))
  }

  const deps = Object.assign({}, versionDoc?.dependencies ?? {}, versionDoc?.optionalDependencies ?? {})
  const risky = Object.keys(deps).filter((name) => /(^|\/)(shelljs|execa|child_process|node-pty|cross-spawn|sudo-prompt)$/.test(name))
  if (risky.length > 0) {
    add('process-spawn-dependency', 'info', 'declared dependencies that can spawn processes: ' + risky.join(', '))
  }
  return findings
}

function npmUrl(name) {
  return 'https://registry.npmjs.org/' + name.replace('/', '%2f')
}

/** Fetch one npm document; returns null on any failure (the caller records unknown). */
export async function fetchNpmDocument(name, http = defaultHttp) {
  const res = await http(npmUrl(name))
  if (res.status !== 200) return null
  try {
    return JSON.parse(res.text)
  } catch {
    return null
  }
}

function severityRank(severity) {
  return { critical: 0, high: 1, medium: 2, info: 3, unknown: 4 }[severity] ?? 5
}

export function summarize(rows) {
  const counts = {}
  const servers = { total: rows.length, withFindings: 0, auditedNpm: 0, withPackage: 0, notAuditedPackages: 0, remoteOnly: 0 }
  const packageTypes = {}
  for (const row of rows) {
    if (row.findings.length > 0) servers.withFindings += 1
    for (const finding of row.findings) counts[finding.rule] = (counts[finding.rule] ?? 0) + 1
    if (!row.package) {
      servers.remoteOnly += 1
      continue
    }
    servers.withPackage += 1
    packageTypes[row.registryType ?? '?'] = (packageTypes[row.registryType ?? '?'] ?? 0) + 1
    if (row.audited) servers.auditedNpm += 1
    else servers.notAuditedPackages += 1
  }
  return { servers, packageTypes, ruleCounts: counts }
}

export function renderMarkdown(payload) {
  const s = payload.summary
  const lines = []
  lines.push('# MCP supply-chain census')
  lines.push('')
  lines.push('Generated ' + payload.generatedAt + ' from ' + payload.source + '.')
  lines.push('')
  lines.push('Enumerated **' + s.servers.total + '** registry servers. **' + s.servers.withPackage + '** declare a package (' + Object.entries(s.packageTypes).map(([type, count]) => type + ' ' + count).join(', ') + '); **' + s.servers.remoteOnly + '** are remote-only (no package, out of scope for this audit).')
  lines.push('')
  lines.push('Audited: **' + s.servers.auditedNpm + '** npm packages. **' + s.servers.notAuditedPackages + '** package-declaring servers use a registry this version does not audit yet and are **not** reported as clean.')
  lines.push('')
  lines.push('| rule | servers |', '| --- | --- |')
  for (const [rule, count] of Object.entries(s.ruleCounts).sort((a, b) => b[1] - a[1])) lines.push('| ' + rule + ' | ' + count + ' |')
  lines.push('')
  const notable = payload.rows
    .filter((row) => row.findings.some((f) => f.severity === 'critical' || f.severity === 'high'))
    .slice(0, 25)
  if (notable.length > 0) {
    lines.push('## Servers with high-severity findings')
    lines.push('')
    lines.push('| server | package | finding | evidence |')
    lines.push('| --- | --- | --- | --- |')
    for (const row of notable) {
      for (const finding of row.findings.filter((f) => f.severity === 'critical' || f.severity === 'high')) {
        lines.push('| ' + row.server + ' | ' + (row.package ?? '-') + ' | ' + finding.rule + ' (' + finding.severity + ') | ' + finding.evidence.replace(/\|/g, '\\|').slice(0, 160) + ' |')
      }
    }
    lines.push('')
  }
  lines.push('## Method and limits')
  lines.push('')
  lines.push('- Source: the official MCP registry; package metadata from the npm registry document of the declared version.')
  lines.push('- Static only: no endpoint is contacted, nothing is installed or executed, no credentials are used.')
  lines.push('- A finding is about the published metadata, not proof of exploitability. `unknown` means the metadata needed to decide was unavailable.')
  lines.push('- Reproduce with `node mcp-audit.mjs --max <n> --out census.json`.')
  return lines.join('\n') + '\n'
}

export function parseArgs(argv) {
  const args = { max: 200, out: null, markdown: null, concurrency: 8, json: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--max') args.max = Number(argv[++i])
    else if (arg === '--out') args.out = argv[++i]
    else if (arg === '--markdown') args.markdown = argv[++i]
    else if (arg === '--concurrency') args.concurrency = Number(argv[++i])
    else if (arg === '--json') args.json = true
    else if (arg === '--help') { console.log('node mcp-audit.mjs [--max N] [--out census.json] [--markdown census.md] [--concurrency 8] [--json]'); process.exit(0) }
    else { console.error('unknown option ' + arg); process.exit(2) }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const registry = await fetchRegistry({ max: args.max, onPage: (page, count) => process.stderr.write('  registry page ' + page + ': ' + count + ' servers\n') })
  process.stderr.write('servers: ' + registry.servers.length + (registry.truncated ? ' (truncated at --max)' : '') + '\n')

  const rows = registry.servers.map((server) => ({
    server: server.name,
    version: server.version ?? null,
    package: Array.isArray(server.packages) && server.packages.length > 0 ? server.packages[0].identifier : null,
    registryType: Array.isArray(server.packages) && server.packages.length > 0 ? server.packages[0].registryType : null,
    repository: server.repository?.url ?? server.repository ?? null,
    audited: false,
    findings: [],
  }))

  const npmRows = rows.filter((row) => row.registryType === 'npm' && row.package)
  let cursor = 0
  const worker = async () => {
    while (cursor < npmRows.length) {
      const index = cursor
      cursor += 1
      const row = npmRows[index]
      const server = registry.servers.find((s) => s.name === row.server)
      const doc = await fetchNpmDocument(row.package)
      row.findings = auditPackage(server, doc, { version: row.version })
      row.audited = true
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, args.concurrency) }, worker))

  const payload = {
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    source: REGISTRY,
    registry: { servers: registry.servers.length, pages: registry.pages, truncated: registry.truncated },
    summary: summarize(rows),
    rows,
  }
  if (args.out) writeFileSync(args.out, JSON.stringify(payload, null, 2) + '\n')
  if (args.markdown) writeFileSync(args.markdown, renderMarkdown(payload))
  if (args.json) process.stdout.write(JSON.stringify(payload, null, 2) + '\n')
  else process.stdout.write(renderMarkdown(payload))
  const critical = payload.rows.filter((r) => r.findings.some((f) => f.severity === 'critical')).length
  process.stderr.write('servers with critical findings: ' + critical + '\n')
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) main().catch((error) => { console.error('mcp-supply-audit: ' + error.message); process.exit(1) })