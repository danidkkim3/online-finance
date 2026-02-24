'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
import { loadUserData, saveUserData } from '@/lib/sync'
import { Cloud } from 'lucide-react'

/**
 * Mounts once at the app root.
 * - On login: loads data from Supabase and replaces the local store.
 * - While logged in: debounces store changes and saves to Supabase.
 * - On logout: nothing — local data stays in localStorage as-is.
 */
export function SyncProvider() {
  const loadData = useStore((s) => s.loadData)
  const supabase = createClient()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loggedIn = useRef(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    // On mount: check if already logged in and load data
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        loggedIn.current = true
        const remote = await loadUserData(supabase)
        if (remote) loadData(remote)
      }
    })

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loggedIn.current = true
        const remote = await loadUserData(supabase)
        if (remote) loadData(remote)
      }
      if (event === 'SIGNED_OUT') {
        loggedIn.current = false
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // Subscribe to store changes and debounce-save to Supabase
    const unsub = useStore.subscribe((state) => {
      if (!loggedIn.current) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setSyncStatus('saving')
      saveTimer.current = setTimeout(async () => {
        try {
          await saveUserData(supabase, {
            assets: state.assets,
            debts: state.debts,
            settings: state.settings,
          })
          setSyncStatus('saved')
          setTimeout(() => setSyncStatus('idle'), 2500)
        } catch (err) {
          console.error('[SyncProvider] save failed:', err)
          setSyncStatus('error')
          setTimeout(() => setSyncStatus('idle'), 3000)
        }
      }, 1500)
    })

    return () => {
      unsub()
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  if (syncStatus === 'idle') return null

  return (
    <div className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium pointer-events-none ${
      syncStatus === 'saving' ? 'bg-white border-border text-muted-foreground' :
      syncStatus === 'error'  ? 'bg-white border-red-200 text-red-600' :
                                'bg-white border-green-200 text-green-700'
    }`}>
      <Cloud className={`w-4 h-4 ${syncStatus === 'saving' ? 'animate-pulse' : ''}`} />
      {syncStatus === 'saving' ? '저장 중...' : syncStatus === 'error' ? '저장 실패' : '✓ 저장됨'}
    </div>
  )
}
