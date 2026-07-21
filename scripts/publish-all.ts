/**
 * Publish every READY draft document. For each draft (`drafts.<id>`):
 *   transaction( createOrReplace(<id> = draft content) + delete(drafts.<id>) )
 * — one transaction per doc, so a failure never half-publishes.
 *
 *   npm run publish-all -- --dry-run     # print the plan, mutate nothing
 *   npm run publish-all                  # execute
 *
 * READY = not BLOCKED. BLOCKED = missing name, OR missing slug on a routed type,
 * OR (spot) empty of all narrative content. BLOCKED docs are skipped (import-fix
 * list). Reads SANITY_API_WRITE_TOKEN from env / .env.local.
 */
import { readFileSync, writeFileSync } from 'node:fs'

import { createClient } from '@sanity/client'

function env(key: string): string {
  if (process.env[key]) return process.env[key] as string
  try {
    const file = readFileSync('.env.local', 'utf8')
    const m = file.match(new RegExp(`^${key}=(.*)$`, 'm'))
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  } catch {
    /* ignore */
  }
  throw new Error(`Missing env: ${key}`)
}

const client = createClient({
  projectId: env('NEXT_PUBLIC_SANITY_PROJECT_ID'),
  dataset: env('NEXT_PUBLIC_SANITY_DATASET'),
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-06-01',
  token: env('SANITY_API_WRITE_TOKEN'),
  useCdn: false,
  perspective: 'raw',
})

const dryRun = process.argv.includes('--dry-run')

const ROUTED = new Set([
  'spot', 'targetSpecies', 'structure', 'structureType', 'approach',
  'techniqueRetrieve', 'lureCatalog', 'lureGearCategory', 'parentLure',
  'baitfish', 'microSeason', 'region', 'season', 'zone',
])

interface PlanRow {
  _id: string
  _type: string
  hasName: boolean
  hasSlug: boolean
  spotEmptyNarrative: boolean
}

const PLAN_QUERY = `*[_id in path("drafts.**")]{
  _id, _type,
  "hasName": defined(name),
  "hasSlug": defined(slug.current),
  "spotEmptyNarrative": _type == "spot" && (
    count(coalesce(spotCard,[])) + count(coalesce(captMikeNotes,[])) +
    count(coalesce(historicalAnalysis,[])) + count(coalesce(environmentalFactors,[])) +
    count(coalesce(observationalFactors,[])) + count(coalesce(structureApproach,[])) +
    count(coalesce(gearTechnique,[])) + count(coalesce(QAcaptMike,[])) == 0
  )
}`

function blockReason(row: PlanRow): string | null {
  if (!row.hasName) return 'no-name'
  if (ROUTED.has(row._type) && !row.hasSlug) return 'no-slug'
  if (row._type === 'spot' && row.spotEmptyNarrative) return 'empty-narrative'
  return null
}

function tally(rows: { _type: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) out[r._type] = (out[r._type] ?? 0) + 1
  return out
}

async function main() {
  const rows = await client.fetch<PlanRow[]>(PLAN_QUERY)
  const ready: PlanRow[] = []
  const blocked: Record<string, PlanRow[]> = {}
  for (const row of rows) {
    const reason = blockReason(row)
    if (reason) (blocked[reason] ??= []).push(row)
    else ready.push(row)
  }

  console.log(`Total drafts:      ${rows.length}`)
  console.log(`READY to publish:  ${ready.length}`)
  for (const [reason, list] of Object.entries(blocked)) {
    console.log(`BLOCKED (${reason}): ${list.length}  ${JSON.stringify(tally(list))}`)
  }
  console.log(`READY by type:     ${JSON.stringify(tally(ready))}`)

  if (dryRun) {
    console.log('\n[DRY RUN] no mutations executed.')
    return
  }

  const results: Array<{ id: string; status: 'published' | 'FAILED'; error?: string }> = []
  let ok = 0
  let fail = 0
  let cursor = 0
  const CONCURRENCY = 5

  async function worker() {
    while (cursor < ready.length) {
      const row = ready[cursor++]
      const draftId = row._id
      const publishedId = draftId.replace(/^drafts\./, '')
      try {
        const doc = await client.getDocument(draftId)
        if (!doc) throw new Error('draft not found')
        const { _rev, ...rest } = doc
        void _rev
        await client
          .transaction()
          .createOrReplace({ ...rest, _id: publishedId })
          .delete(draftId)
          .commit({ visibility: 'async' })
        ok++
        results.push({ id: publishedId, status: 'published' })
        if (ok % 100 === 0) console.log(`  …${ok} published`)
      } catch (error) {
        fail++
        results.push({ id: draftId, status: 'FAILED', error: (error as Error).message })
        console.log(`  ✗ ${draftId}: ${(error as Error).message}`)
      }
    }
  }

  console.log(`\nPublishing ${ready.length} docs (concurrency ${CONCURRENCY})…`)
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  console.log(`\nDONE. published=${ok} failed=${fail}`)

  writeFileSync(
    'publish-results.json',
    JSON.stringify(
      {
        readyCount: ready.length,
        published: ok,
        failed: fail,
        blocked: Object.fromEntries(
          Object.entries(blocked).map(([k, v]) => [k, v.map((r) => r._id)]),
        ),
        failures: results.filter((r) => r.status === 'FAILED'),
      },
      null,
      2,
    ),
  )
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
