'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import {
  type CurrentEvent,
  type TideEvent,
  fetchWorkerJson,
  formatEastern,
  parseNoaaStationId,
} from '@/lib/worker'

export interface PeakTidesTodayProps {
  spotId: string
  /** Slug for the (stubbed) 7-day forecast link. */
  slug: string
  tideStationId: string | null
  currentStationId: string | null
}

interface Data {
  tides: TideEvent[] | null
  currents: CurrentEvent[] | null
}

const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { at: number; data: Data }>()

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: Data }

/** "YYYY-MM-DD HH:mm" for now in America/New_York (string-comparable). */
function nowEastern(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const p: Record<string, string> = {}
  for (const part of parts) p[part.type] = part.value
  const hour = p.hour === '24' ? '00' : p.hour
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}`
}

function upcoming<T>(events: T[], time: (e: T) => string, count = 5): T[] {
  const now = nowEastern()
  const future = events.filter((e) => time(e) >= now)
  return (future.length > 0 ? future : events.slice(-count)).slice(0, count)
}

/** ebb → red, flood → green, near-zero → slack (neutral). Classified by sign. */
function stageOf(velocity: number): { label: string; tone: 'ebb' | 'flood' | 'slack' } {
  if (Math.abs(velocity) < 0.1) return { label: 'SLACK', tone: 'slack' }
  return velocity < 0
    ? { label: 'EBB', tone: 'ebb' }
    : { label: 'FLOOD', tone: 'flood' }
}

const PILL: Record<'ebb' | 'flood' | 'slack', string> = {
  ebb: 'bg-red-dark/10 text-red-dark ring-1 ring-red-dark/30',
  flood: 'bg-green-dark/10 text-green-dark ring-1 ring-green-dark/30',
  slack: 'bg-body text-header ring-1 ring-black/10',
}

export function PeakTidesToday({
  spotId,
  slug,
  tideStationId,
  currentStationId,
}: PeakTidesTodayProps) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const cached = cache.get(spotId)
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setState({ status: 'success', data: cached.data })
      return
    }
    const controller = new AbortController()
    const tideId = parseNoaaStationId(tideStationId)
    const currentId = currentStationId?.trim() || null

    async function load() {
      const [tRes, cRes] = await Promise.allSettled([
        tideId
          ? fetchWorkerJson<TideEvent[]>(
              `/tides?station=${encodeURIComponent(tideId)}&days=2`,
              controller.signal,
            )
          : Promise.reject(new Error('no tide station')),
        currentId
          ? fetchWorkerJson<CurrentEvent[]>(
              `/currents?station=${encodeURIComponent(currentId)}&days=2`,
              controller.signal,
            )
          : Promise.reject(new Error('no current station')),
      ])
      if (controller.signal.aborted) return
      const tides =
        tRes.status === 'fulfilled' && Array.isArray(tRes.value) ? tRes.value : null
      const currents =
        cRes.status === 'fulfilled' && Array.isArray(cRes.value) ? cRes.value : null
      if (tides === null && currents === null) {
        setState({ status: 'error' })
        return
      }
      const data: Data = { tides, currents }
      cache.set(spotId, { at: Date.now(), data })
      setState({ status: 'success', data })
    }
    load().catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })
    return () => controller.abort()
  }, [spotId, tideStationId, currentStationId])

  const eyebrow =
    'font-mono text-xs font-semibold uppercase tracking-wider text-header'

  return (
    <section aria-busy={state.status === 'loading'} className="flex h-full flex-col">
      <h2 className={eyebrow}>Peak Fishing Tides Today</h2>
      <hr className="my-3 border-body" />

      {state.status === 'loading' && (
        <p className="text-sm text-header">Loading tide &amp; current data…</p>
      )}

      {state.status === 'error' && (
        <p className="text-sm text-header">Conditions unavailable.</p>
      )}

      {state.status === 'success' &&
        (() => {
          const currents = state.data.currents
            ? upcoming(state.data.currents, (c) => c.Time)
            : []
          const tides = state.data.tides
            ? upcoming(state.data.tides, (t) => t.t, 4)
            : []
          if (currents.length === 0 && tides.length === 0) {
            return <p className="text-sm text-header">No items found.</p>
          }
          return (
            <div className="space-y-4">
              {currents.length > 0 && (
                <ul className="space-y-1.5">
                  {currents.map((c) => {
                    const { label, tone } = stageOf(c.Velocity_Major)
                    return (
                      <li
                        key={`${c.Time}-${c.Type}`}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span
                          className={`inline-block min-w-[3.5rem] rounded-[5px] px-2 py-0.5 text-center font-mono text-[0.7rem] font-bold ${PILL[tone]}`}
                        >
                          {label}
                        </span>
                        <span className="flex-1 truncate font-mono text-xs text-header">
                          {formatEastern(c.Time)}
                        </span>
                        <span className="font-mono text-xs font-semibold text-ink">
                          {Math.abs(c.Velocity_Major).toFixed(1)} kt
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}

              {tides.length > 0 && (
                <div>
                  <p className={`mb-1.5 ${eyebrow}`}>High / Low</p>
                  <ul className="space-y-1">
                    {tides.map((t) => (
                      <li
                        key={`${t.t}-${t.type}`}
                        className="flex items-center justify-between gap-2 font-mono text-xs"
                      >
                        <span className="text-header">
                          {t.type === 'H' ? 'High' : 'Low'}
                        </span>
                        <span className="flex-1 truncate text-header">
                          {formatEastern(t.t)}
                        </span>
                        <span className="font-semibold text-ink">{t.v} ft</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })()}

      <div className="mt-auto pt-4">
        {/* TODO: /spots/[slug]/forecast route does not exist yet — 404s for now. */}
        <Link
          href={`/spots/${slug}/forecast`}
          className="font-mono text-xs font-semibold text-green-dark hover:underline"
        >
          View 7-day forecast →
        </Link>
      </div>
    </section>
  )
}
