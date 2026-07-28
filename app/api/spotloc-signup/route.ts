import { NextResponse } from 'next/server'

import { WORKER_URL } from '@/lib/worker'

/**
 * Same-origin proxy for the Spot Loc waitlist signup (Step 0 decisions:
 * pre-launch waitlist → Cloudflare Worker, reached via a Next API proxy so the
 * browser never hits the Worker's CORS allowlist and the no-JS `<form>` POST
 * works same-origin).
 *
 * Forwards to `POST {WORKER_URL}/signup` with the contract agreed in Step 0:
 *   { email, source, variant, ts } → 200 { ok, status:"subscribed"|"already" }
 *                                    400 { error:"invalid_email" }
 * Dedupe is the Worker's job (a duplicate is success UX, never an error here).
 *
 * ⚠ The Worker `/signup` route does not exist yet (separate repo). Until it
 * ships, forwards fail and the client shows its real error state — this route
 * NEVER silently swallows a submission.
 *
 * Two entry shapes:
 *   • JSON  (JS path)     → JSON responses, handled in-place by the client.
 *   • form  (no-JS path)  → 303 redirect to /spotloc/thanks, or an inline HTML
 *                            error page. Progressive enhancement without JS.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SIGNUP_URL = `${WORKER_URL}/signup`
const THANKS_PATH = '/spotloc/thanks'
/** A human takes longer than this to fill the field; faster = a bot. */
const MIN_FILL_MS = 1200

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}
function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

interface Parsed {
  email: string
  website: string // honeypot — must be empty
  ts: number // client mount time (ms); 0 when JS is off
  variant: string
  source: string
  isForm: boolean
}

async function parse(req: Request): Promise<Parsed> {
  const ct = req.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
    return {
      email: str(b.email),
      website: str(b.website),
      ts: num(b.ts),
      variant: str(b.variant) || 'a',
      source: str(b.source) || 'spotloc-landing',
      isForm: false,
    }
  }
  const f = await req.formData().catch(() => new FormData())
  return {
    email: str(f.get('email')),
    website: str(f.get('website')),
    ts: num(f.get('ts')),
    variant: str(f.get('variant')) || 'a',
    source: str(f.get('source')) || 'spotloc-landing',
    isForm: true,
  }
}

/** Minimal branded HTML for the no-JS error path (rare). */
function htmlError(message: string, status: number): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Something went wrong</title><style>body{font-family:system-ui,sans-serif;background:#f9f9f9;color:#333;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}main{background:#fff;border:1px solid #f9f9f9;border-radius:5px;box-shadow:0 2px 4px rgba(0,0,0,.06);padding:25px;max-width:28rem;text-align:center}h1{color:#535c71;font-size:1.25rem;margin:0 0 .5rem}a{color:#cc4444}</style></head><body><main><h1>That didn't go through</h1><p>${message}</p><p><a href="/spotloc#signup">Back to the page</a></p></main></body></html>`
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

export async function POST(req: Request): Promise<Response> {
  const { email, website, ts, variant, source, isForm } = await parse(req)

  // Spam gates: a filled honeypot or an inhumanly fast fill. Return the SUCCESS
  // shape so we never tip off a bot — but do not forward it to the Worker.
  const looksBot = website !== '' || (ts > 0 && Date.now() - ts < MIN_FILL_MS)
  if (looksBot) {
    return isForm
      ? NextResponse.redirect(new URL(THANKS_PATH, req.url), 303)
      : NextResponse.json({ ok: true, status: 'subscribed' })
  }

  if (!EMAIL_RE.test(email)) {
    return isForm
      ? htmlError('That email address doesn’t look right. Head back and try again.', 400)
      : NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }

  let workerRes: Response | null = null
  try {
    workerRes = await fetch(SIGNUP_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, source, variant, ts }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    workerRes = null
  }

  // Worker unreachable / timed out.
  if (!workerRes) {
    return isForm
      ? htmlError('We couldn’t reach the list just now. Please try again in a minute.', 502)
      : NextResponse.json({ ok: false, error: 'unavailable' }, { status: 502 })
  }

  if (workerRes.ok) {
    const data = (await workerRes.json().catch(() => ({}))) as { status?: string }
    return isForm
      ? NextResponse.redirect(new URL(THANKS_PATH, req.url), 303)
      : NextResponse.json({ ok: true, status: data.status ?? 'subscribed' })
  }

  if (workerRes.status === 400) {
    return isForm
      ? htmlError('That email address doesn’t look right. Head back and try again.', 400)
      : NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }

  return isForm
    ? htmlError('We couldn’t reach the list just now. Please try again in a minute.', 502)
    : NextResponse.json({ ok: false, error: 'unavailable' }, { status: 502 })
}

// A bare GET (e.g. someone opening the URL) shouldn't 405-error noisily.
export function GET(): Response {
  return NextResponse.json({ ok: false, error: 'method_not_allowed' }, { status: 405 })
}
