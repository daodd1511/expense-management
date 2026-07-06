// Generates specs/INDEX.md from every specs/*/PLAN.md + EXECUTION.md.
// Contract: EXECUTION.md STATUS blocks must match the canonical format documented in
// specs/spec-index/PLAN.md — this parser is deliberately strict and exits nonzero
// naming the offending file rather than rendering a silently wrong board.
//
// Usage: node scripts/spec-index.mjs   (or: pnpm specs:index)

import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SPECS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'specs')
const STATES = ['pending', 'in-progress', 'done', 'done-with-debt']

const CURRENT_RE = /^- Current phase: (All phases complete|\d+ — (?:pending|in-progress|done|done-with-debt))$/
const PHASE_RE = /^- Phase (\d+) — (.+): (pending|in-progress|done|done-with-debt)$/
const DEBT_RE = /^- Verification debt: (.+)$/

function fail(file, reason) {
  console.error(`spec-index: ${file}: ${reason}`)
  process.exit(1)
}

/** Extracts and validates the STATUS block; returns { phases: [{n, name, state}], debt }. */
function parseStatus(file, text) {
  const lines = text.split('\n')
  const start = lines.indexOf('## STATUS')
  if (start === -1) fail(file, 'no "## STATUS" heading found')

  // Collect the contiguous run of "- " items after the heading (blank lines allowed
  // only between the heading and the first item).
  const items = []
  let i = start + 1
  while (i < lines.length && lines[i].trim() === '') i++
  while (i < lines.length && lines[i].startsWith('- ')) items.push(lines[i++])
  if (i < lines.length && lines[i].startsWith('  ')) {
    fail(file, `STATUS items must be single lines (continuation found: "${lines[i].trim()}")`)
  }

  if (items.length < 3) fail(file, 'STATUS block needs Current phase, at least one Phase, and Verification debt lines')
  if (!CURRENT_RE.test(items[0])) fail(file, `bad Current phase line: "${items[0]}"`)

  const debtMatch = items[items.length - 1].match(DEBT_RE)
  if (!debtMatch) fail(file, `last STATUS item must be a Verification debt line, got: "${items[items.length - 1]}"`)

  const phases = []
  for (const item of items.slice(1, -1)) {
    const m = item.match(PHASE_RE)
    if (!m) fail(file, `bad Phase line (state must be one of ${STATES.join('|')}, no backticks): "${item}"`)
    phases.push({ n: Number(m[1]), name: m[2], state: m[3] })
  }
  if (phases.length === 0) fail(file, 'STATUS block has no Phase lines')

  return { phases, debt: debtMatch[1] }
}

/** First 10 lines of PLAN.md may carry a "status: reference|done" marker for specs with no EXECUTION.md. */
function planMarker(planText) {
  const m = planText.split('\n').slice(0, 10).find((l) => /^status: (reference|done)$/.test(l.trim()))
  return m ? m.trim().split(': ')[1] : null
}

/** Description: first prose paragraph of PLAN.md (cosmetic — parsed tolerantly, truncated). */
function planDescription(planText) {
  const lines = planText.split('\n').slice(1)
  const isProse = (l) => l.trim() && !/^(#|>|\||status:|-{3,})/.test(l.trim())
  const start = lines.findIndex(isProse)
  if (start === -1) return ''
  const para = []
  for (let i = start; i < lines.length && isProse(lines[i]); i++) para.push(lines[i].trim())
  const clean = para.join(' ').replace(/\*\*/g, '').replace(/`/g, '')
  return clean.length > 100 ? `${clean.slice(0, 97).replace(/\s+\S*$/, '')}…` : clean
}

function specStatus(phases) {
  if (phases.every((p) => p.state === 'done' || p.state === 'done-with-debt')) return 'Done'
  if (phases.every((p) => p.state === 'pending')) return 'Pending'
  return 'In progress'
}

const rows = []
const referenceRows = []

for (const slug of readdirSync(SPECS_DIR).sort()) {
  const dir = join(SPECS_DIR, slug)
  const planPath = join(dir, 'PLAN.md')
  if (!existsSync(planPath)) continue

  const planText = readFileSync(planPath, 'utf8')
  const description = planDescription(planText)
  const link = `[${slug}](${slug}/PLAN.md)`
  const marker = planMarker(planText)

  if (marker === 'reference') {
    referenceRows.push(`| ${link} | ${description} |`)
    continue
  }

  const execPath = join(dir, 'EXECUTION.md')
  if (!existsSync(execPath)) {
    const status = marker === 'done' ? 'Done' : 'Not started'
    rows.push({ slug, status, phases: '—', debt: '—', description, link })
    continue
  }

  const { phases, debt } = parseStatus(`specs/${slug}/EXECUTION.md`, readFileSync(execPath, 'utf8'))
  const doneCount = phases.filter((p) => p.state === 'done' || p.state === 'done-with-debt').length
  const hasDebt = !debt.startsWith('none')
  rows.push({
    slug,
    status: specStatus(phases),
    phases: `${doneCount}/${phases.length}`,
    debt: hasDebt ? `⚠ ${debt}` : '—',
    description,
    link,
  })
}

const ORDER = { 'In progress': 0, Pending: 1, 'Not started': 2, Done: 3 }
rows.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.slug.localeCompare(b.slug))

const out = [
  '# Specs Index',
  '',
  '_Generated by `pnpm specs:index` — do not edit. Derived report only: on any conflict,_',
  '_git and `EXECUTION.md` STATUS blocks win._',
  '',
  '| Spec | Status | Phases | Debt | Description |',
  '|------|--------|--------|------|-------------|',
  ...rows.map((r) => `| ${r.link} | ${r.status} | ${r.phases} | ${r.debt} | ${r.description} |`),
]
if (referenceRows.length > 0) {
  out.push('', '## Reference', '', '| Doc | Description |', '|-----|-------------|', ...referenceRows)
}
out.push('')

writeFileSync(join(SPECS_DIR, 'INDEX.md'), out.join('\n'))
console.log(`spec-index: wrote specs/INDEX.md (${rows.length} specs, ${referenceRows.length} reference)`)
