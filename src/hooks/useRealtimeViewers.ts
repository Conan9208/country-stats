import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeViewers() {
  const viewersByCountryRef = useRef<Record<string, number>>({})
  const viewersMapRef = useRef(new Map<string, { code: string; ts: number }>())
  const mySessionId = useRef('')
  const lastBroadcastCountryRef = useRef<string | null>(null)
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const sid = (() => {
      try {
        let id = sessionStorage.getItem('wstats-sid')
        if (!id) {
          id = Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
          sessionStorage.setItem('wstats-sid', id)
        }
        return id
      } catch { return Math.random().toString(36).slice(2, 9) }
    })()
    mySessionId.current = sid

    const recomputeViewers = () => {
      const now = Date.now()
      const counts: Record<string, number> = {}
      for (const [, { code, ts }] of viewersMapRef.current) {
        if (now - ts > 60000) continue
        counts[code] = (counts[code] ?? 0) + 1
      }
      viewersByCountryRef.current = counts
    }

    const presenceChannel = supabase
      .channel('globe-presence')
      .on('broadcast', { event: 'hover' }, ({ payload }) => {
        const { sessionId, countryCode, ts } = payload as { sessionId: string; countryCode: string | null; ts: number }
        if (sessionId === sid) return
        if (countryCode) {
          viewersMapRef.current.set(sessionId, { code: countryCode, ts })
        } else {
          viewersMapRef.current.delete(sessionId)
        }
        recomputeViewers()
      })
      .subscribe()

    presenceChannelRef.current = presenceChannel

    const staleCleanup = setInterval(() => {
      const now = Date.now()
      let changed = false
      for (const [id, { ts }] of viewersMapRef.current) {
        if (now - ts > 60000) { viewersMapRef.current.delete(id); changed = true }
      }
      if (changed) recomputeViewers()
    }, 15000)

    const heartbeat = setInterval(() => {
      const code = lastBroadcastCountryRef.current
      if (code) {
        presenceChannelRef.current?.send({
          type: 'broadcast', event: 'hover',
          payload: { sessionId: sid, countryCode: code, ts: Date.now() },
        })
      }
    }, 30000)

    return () => {
      supabase.removeChannel(presenceChannel)
      presenceChannelRef.current = null
      clearInterval(staleCleanup)
      clearInterval(heartbeat)
    }
  }, [])

  return { viewersByCountryRef, viewersMapRef, mySessionId, lastBroadcastCountryRef, presenceChannelRef }
}
