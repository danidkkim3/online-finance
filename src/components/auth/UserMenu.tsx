'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Cloud, CloudOff, LogOut, User as UserIcon } from 'lucide-react'

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onClickOutside)
    return () => document.removeEventListener('click', onClickOutside)
  }, [])

  // Listen for sync events from SyncProvider
  useEffect(() => {
    const clearTimer = { current: null as ReturnType<typeof setTimeout> | null }
    function onSaving() {
      if (clearTimer.current) clearTimeout(clearTimer.current)
      setSyncStatus('saving')
    }
    function onSynced() {
      setSyncStatus('saved')
      clearTimer.current = setTimeout(() => setSyncStatus('idle'), 2500)
    }
    function onError() {
      setSyncStatus('error')
      clearTimer.current = setTimeout(() => setSyncStatus('idle'), 3000)
    }
    window.addEventListener('fire:saving', onSaving)
    window.addEventListener('fire:synced', onSynced)
    window.addEventListener('fire:syncerror', onError)
    return () => {
      window.removeEventListener('fire:saving', onSaving)
      window.removeEventListener('fire:synced', onSynced)
      window.removeEventListener('fire:syncerror', onError)
      if (clearTimer.current) clearTimeout(clearTimer.current)
    }
  }, [])

  function handleSignOut() {
    // Navigate away regardless of whether signOut completes
    setTimeout(() => { window.location.href = '/' }, 300)
    supabase.auth.signOut()
  }

  if (!user) {
    return (
      <button
        onClick={() => router.push('/auth')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
      >
        <UserIcon className="w-4 h-4" />
        <span className="hidden sm:inline">로그인</span>
      </button>
    )
  }

  const initial = (user.email ?? '?')[0].toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
      >
        <div className="w-7 h-7 rounded-full bg-[#1c1c1e] text-white text-xs font-semibold flex items-center justify-center">
          {initial}
        </div>
      </button>

      {/* Save toast — bottom right */}
      {syncStatus !== 'idle' && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium ${
          syncStatus === 'saving' ? 'bg-white border-border text-muted-foreground' :
          syncStatus === 'error'  ? 'bg-white border-red-200 text-red-600' :
                                    'bg-white border-green-200 text-green-700'
        }`}>
          <Cloud className={`w-4 h-4 ${syncStatus === 'saving' ? 'animate-pulse' : ''}`} />
          {syncStatus === 'saving' ? '저장 중...' : syncStatus === 'error' ? '저장 실패' : '✓ 저장됨'}
        </div>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">로그인됨</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
