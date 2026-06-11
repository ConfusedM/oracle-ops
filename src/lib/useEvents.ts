import { useEffect, useState } from 'react'
import { supabase, T_EVENTS } from './supabase'
import type { GameEvent } from './types'

let cached: GameEvent[] = []
const subs = new Set<(e: GameEvent[]) => void>()
let started = false

function push(e: GameEvent) {
  cached = [e, ...cached].slice(0, 40)
  subs.forEach((fn) => fn(cached))
}

function start() {
  if (started) return
  started = true
  supabase
    .from(T_EVENTS)
    .select('*')
    .order('id', { ascending: false })
    .limit(40)
    .then(({ data }) => {
      if (data) {
        cached = data as GameEvent[]
        subs.forEach((fn) => fn(cached))
      }
    })
  supabase
    .channel('oo-events-sync')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: T_EVENTS }, (p) => {
      push(p.new as GameEvent)
    })
    .subscribe()
}

export function useEvents(): GameEvent[] {
  const [events, setEvents] = useState<GameEvent[]>(cached)
  useEffect(() => {
    start()
    subs.add(setEvents)
    setEvents(cached)
    return () => {
      subs.delete(setEvents)
    }
  }, [])
  return events
}

export async function logEvent(
  gm: string,
  action: string,
  payload: Record<string, any> = {},
  ticker = true,
) {
  await supabase.from(T_EVENTS).insert({ gm, action, payload, ticker })
}

/** Human line for the wall ticker. payload.text wins; otherwise derive from action. */
export function eventText(e: GameEvent): string {
  if (e.payload?.text) return String(e.payload.text)
  return e.action.replace(/[._]/g, ' ').toUpperCase()
}
