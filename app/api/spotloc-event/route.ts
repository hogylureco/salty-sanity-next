import { NextResponse } from 'next/server'

import { WORKER_URL } from '@/lib/worker'

/**
 * Same-origin analytics beacon proxy → forwards to the Worker `/event` route
 * (Step 0 decision). Keeps event collection on the same origin so `sendBeacon`
 * never hits CORS, and keeps the Worker as the single sink.
 *
 * Fire-and-forget: always returns 204 to the beacon regardless of the Worker's
 * response, and never throws. ⚠ The Worker `/event` route is a separate-repo
 * follow-up; until it exists these forwards no-op.
 */
const EVENT_URL = `${WORKER_URL}/event`

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.text()
    // Don't await — the beacon doesn't wait, and neither should the response.
    void fetch(EVENT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: AbortSignal.timeout(4000),
    }).catch(() => {})
  } catch {
    // Never surface an analytics failure.
  }
  return new NextResponse(null, { status: 204 })
}
