'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
import { loadUserData, saveUserData } from '@/lib/sync'

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

  useEffect(() => {
    // On mount: check if already logged in and load data
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
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
      saveTimer.current = setTimeout(async () => {
        await saveUserData(supabase, {
          assets: state.assets,
          debts: state.debts,
          settings: state.settings,
        })
        window.dispatchEvent(new Event('fire:synced'))
      }, 1500)
    })

    return () => {
      unsub()
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  return null
}
