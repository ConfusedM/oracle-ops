import { useEffect, useState } from 'react'
import { supabase, T_STATE } from './supabase'
import { syncServerClock } from './time'

const cache = new Map<string, any>()
const listeners = new Map<string, Set<(d: any) => void>>()
let started = false
let lastSync = Date.now()

function broadcast(key: string, data: any) {
  cache.set(key, data)
  listeners.get(key)?.forEach((fn) => fn(data))
}

async function pollAll() {
  const { data } = await supabase.from(T_STATE).select('key,data')
  if (!data) return
  lastSync = Date.now()
  data.forEach((r) => broadcast(r.key, r.data))
}

function start() {
  if (started) return
  started = true
  syncServerClock(async () => {
    const { data } = await supabase.rpc('oo_server_now')
    return (data as string | null) ?? null
  })
  supabase
    .channel('oo-state-sync')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: T_STATE }, (p) => {
      const row = p.new as { key: string; data: any }
      lastSync = Date.now()
      broadcast(row.key, row.data)
    })
    .subscribe()
  setInterval(pollAll, 10_000) // polling fallback
  pollAll()
}

/** Seconds since the last confirmed sync — walls show a stale banner past 30s. */
export const sinceLastSync = () => (Date.now() - lastSync) / 1000

export function useGameState<T = any>(key: string): T | null {
  const [data, setData] = useState<T | null>(cache.get(key) ?? null)
  useEffect(() => {
    start()
    if (!listeners.has(key)) listeners.set(key, new Set())
    listeners.get(key)!.add(setData)
    if (cache.has(key)) setData(cache.get(key))
    return () => {
      listeners.get(key)!.delete(setData)
    }
  }, [key])
  return data
}
