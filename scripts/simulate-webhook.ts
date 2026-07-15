/**
 * Simulate Sanity revalidation webhooks against a locally-running dev server,
 * so the handler can be tested without a public URL. Signs payloads with the
 * SAME `@sanity/webhook` primitive the handler validates against.
 *
 *   npm run simulate-webhook        # dev server must be running on :3000
 *
 * Reads SANITY_REVALIDATE_SECRET from the env or .env.local.
 */
import { readFileSync } from 'node:fs'

import { SIGNATURE_HEADER_NAME, encodeSignatureHeader } from '@sanity/webhook'

const ENDPOINT =
  process.env.REVALIDATE_URL || 'http://localhost:3000/api/revalidate'

function loadSecret(): string {
  if (process.env.SANITY_REVALIDATE_SECRET) {
    return process.env.SANITY_REVALIDATE_SECRET
  }
  try {
    const env = readFileSync('.env.local', 'utf8')
    const match = env.match(/^SANITY_REVALIDATE_SECRET=(.*)$/m)
    if (match) return match[1].trim()
  } catch {
    // fall through
  }
  throw new Error('SANITY_REVALIDATE_SECRET not found in env or .env.local')
}

const secret = loadSecret()

async function post(body: string, signature?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (signature) headers[SIGNATURE_HEADER_NAME] = signature
  const res = await fetch(ENDPOINT, { method: 'POST', headers, body })
  return { status: res.status, body: (await res.text()).trim() }
}

async function sign(payload: object): Promise<{ body: string; sig: string }> {
  const body = JSON.stringify(payload)
  const sig = await encodeSignatureHeader(body, Date.now(), secret)
  return { body, sig }
}

let failures = 0
async function scenario(
  name: string,
  expected: number,
  run: () => Promise<{ status: number; body: string }>,
) {
  const r = await run()
  const ok = r.status === expected
  if (!ok) failures++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} → ${r.status} (want ${expected})  ${r.body}`,
  )
}

async function main() {
  console.log(`POST ${ENDPOINT}\n`)

  const spot = await sign({
    _type: 'spot',
    slug: 'buzzards-bay-west-end-of-the-canal',
    id: 'BB.WE.fs',
    operation: 'update',
  })
  await scenario('valid spot signature', 200, () => post(spot.body, spot.sig))

  const taxo = await sign({
    _type: 'targetSpecies',
    slug: 'bluefish',
    id: null,
    operation: 'update',
  })
  await scenario('valid taxonomy signature', 200, () => post(taxo.body, taxo.sig))

  const del = await sign({
    _type: 'spot',
    slug: 'buzzards-bay-west-end-of-the-canal',
    operation: 'delete',
  })
  await scenario('delete op (same tags)', 200, () => post(del.body, del.sig))

  const tamper = await sign({ _type: 'spot', slug: 'west-end' })
  const tampered = JSON.stringify({ _type: 'spot', slug: 'a-different-spot' })
  await scenario('tampered body', 401, () => post(tampered, tamper.sig))

  const unknown = await sign({ _type: 'mode', slug: 'sip-feed', operation: 'update' })
  await scenario('unknown _type → skipped', 200, () => post(unknown.body, unknown.sig))

  const unsignedBody = JSON.stringify({ _type: 'spot', slug: 'west-end' })
  await scenario('unsigned request', 401, () => post(unsignedBody))

  console.log(`\n${failures === 0 ? 'ALL SCENARIOS PASSED' : `${failures} SCENARIO(S) FAILED`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main()
