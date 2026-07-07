import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const STATES = ['pending', 'in-progress', 'done', 'done-with-debt']

const CURRENT_RE = /^- Current phase: (All phases complete|\d+ — (?:pending|in-progress|done|done-with-debt))$/
const PHASE_RE = /^- Phase (\d+) — (.+): (pending|in-progress|done|done-with-debt)$/
const DEBT_RE = /^- Verification debt: (.+)$/

export class SpecStatusError extends Error {
  constructor(file, reason) {
    super(`${file}: ${reason}`)
    this.name = 'SpecStatusError'
    this.file = file
    this.reason = reason
  }
}

function fail(file, reason) {
  throw new SpecStatusError(file, reason)
}

/** Extracts and validates the STATUS block; returns { phases: [{n, name, state}], debt }. */
export function parseStatus(file, text) {
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
export function planMarker(planText) {
  const m = planText.split('\n').slice(0, 10).find((l) => /^status: (reference|done)$/.test(l.trim()))
  return m ? m.trim().split(': ')[1] : null
}

/** Description: first prose paragraph of PLAN.md (cosmetic — parsed tolerantly, truncated). */
export function planDescription(planText) {
  const lines = planText.split('\n').slice(1)
  const isProse = (l) => l.trim() && !/^(#|>|\||status:|-{3,})/.test(l.trim())
  const start = lines.findIndex(isProse)
  if (start === -1) return ''
  const para = []
  for (let i = start; i < lines.length && isProse(lines[i]); i++) para.push(lines[i].trim())
  const clean = para.join(' ').replace(/\*\*/g, '').replace(/`/g, '')
  return clean.length > 100 ? `${clean.slice(0, 97).replace(/\s+\S*$/, '')}…` : clean
}

export function specStatus(phases) {
  if (phases.every((p) => p.state === 'done' || p.state === 'done-with-debt')) return 'Done'
  if (phases.every((p) => p.state === 'pending')) return 'Pending'
  return 'In progress'
}

export function collectSpecRecords(specsDir) {
  const rows = []
  const referenceRows = []

  for (const slug of readdirSync(specsDir).sort()) {
    const dir = join(specsDir, slug)
    const planPath = join(dir, 'PLAN.md')
    if (!existsSync(planPath)) continue

    const planText = readFileSync(planPath, 'utf8')
    const description = planDescription(planText)
    const marker = planMarker(planText)

    if (marker === 'reference') {
      referenceRows.push({ slug, description })
      continue
    }

    const execPath = join(dir, 'EXECUTION.md')
    if (!existsSync(execPath)) {
      const status = marker === 'done' ? 'Done' : 'Not started'
      rows.push({ slug, status, phases: '—', debt: '—', description, hasExecution: false })
      continue
    }

    const { phases, debt } = parseStatus(`docs/specs/${slug}/EXECUTION.md`, readFileSync(execPath, 'utf8'))
    const doneCount = phases.filter((p) => p.state === 'done' || p.state === 'done-with-debt').length
    const hasDebt = !debt.startsWith('none')
    rows.push({
      slug,
      status: specStatus(phases),
      phases: `${doneCount}/${phases.length}`,
      debt: hasDebt ? `⚠ ${debt}` : '—',
      description,
      hasExecution: true,
    })
  }

  const order = { 'In progress': 0, Pending: 1, 'Not started': 2, Done: 3 }
  rows.sort((a, b) => order[a.status] - order[b.status] || a.slug.localeCompare(b.slug))

  return { rows, referenceRows }
}
