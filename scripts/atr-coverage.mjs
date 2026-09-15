import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
// 1) fetch registry descriptions
const BASE = 'https://registry.modelcontextprotocol.io/v0/servers'
let cursor = null; const entries = []
for (let page = 0; page < 60; page += 1) {
  const url = BASE + '?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')
  let json = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45000) })
      if (res.status === 200) { json = await res.json(); break }
    } catch { await new Promise((r) => setTimeout(r, 2000)) }
  }
  if (!json) { console.error('page ' + page + ' failed; stopping'); break }
  for (const e of json.servers ?? []) { const s = e.server ?? e; entries.push({ name: s.name, title: s.title ?? null, description: s.description ?? null }) }
  cursor = json.metadata?.nextCursor ?? null
  console.error('page ' + (page + 1) + ' entries ' + entries.length)
  if (!cursor) break
}
console.error('entries:', entries.length)
writeFileSync('/tmp/mcp-descriptions.json', JSON.stringify(entries))
// 2) load the description-targeting rules and compile their regexes
const files = []
const walk = (d) => { for (const en of readdirSync(d, { withFileTypes: true })) { const p = join(d, en.name); if (en.isDirectory()) walk(p); else if (en.name.endsWith('.yaml')) files.push(p) } }
walk('/tmp/atr2/rules')
function yamlUnescape(s) {
  return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, g) => {
    if (g[0] === 'u') return String.fromCharCode(parseInt(g.slice(1), 16))
    if (g[0] === 'x') return String.fromCharCode(parseInt(g.slice(1), 16))
    if (g === 'n') return '\n'; if (g === 't') return '\t'; if (g === 'r') return '\r'
    return g
  })
}
function compile(value) {
  let body = yamlUnescape(value)
  let flags = ''
  if (body.startsWith('(?i)')) { flags += 'i'; body = body.slice(4) }
  try { return new RegExp(body, flags) } catch { return null }
}
const rules = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  if (!/field:\s*tool_description/.test(text)) continue
  const id = /^id:\s*(.+)$/m.exec(text)?.[1]?.trim()
  const title = /^title:\s*(.+)$/m.exec(text)?.[1]?.trim()
  const re = /- field:\s*tool_description\s*\n\s*operator:\s*regex\s*\n\s*value:\s*"([^"]+)"/g
  const patterns = [...text.matchAll(re)].map((m) => m[1])
  rules.push({ id, title, patterns: patterns.map((p) => ({ raw: p, re: compile(p) })) })
}
console.log('rules with tool_description conditions:', rules.length)
let bad = 0
for (const r of rules) for (const p of r.patterns) if (!p.re) bad += 1
console.log('regexes that failed to compile:', bad)
// 3) run over every registry description
const corpus = JSON.parse(readFileSync('/tmp/mcp-descriptions.json', 'utf8'))
const hits = []
for (const entry of corpus) {
  const subject = [entry.description, entry.title].filter(Boolean).join('\n')
  if (!subject) continue
  for (const rule of rules) {
    for (const p of rule.patterns) {
      if (p.re && p.re.test(subject)) hits.push({ name: entry.name, rule: rule.id, title: rule.title, pattern: p.raw.slice(0, 60), sample: subject.slice(0, 120) })
    }
  }
}
console.log('description-targeting hits across', corpus.length, 'entries:', hits.length)
for (const h of hits.slice(0, 10)) console.log('  ' + h.name + ' <- ' + h.rule + ' | ' + h.sample.replace(/\n/g, ' '))
writeFileSync('/tmp/atr-desc-hits.json', JSON.stringify(hits, null, 1))