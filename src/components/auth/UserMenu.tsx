'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { LogOut, User as UserIcon } from 'lucide-react'

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [synced, setSynced] = useState(false)
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
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Listen for sync events from SyncProvider
  useEffect(() => {
    function onSynced() { setSynced(true); setTimeout(() => setSynced(false), 2000) }
    window.addEventListener('fire:synced', onSynced)
    return () => window.removeEventListener('fire:synced', onSynced)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setOpen(false)
    router.refresh()
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
        {synced && (
          <span className="hidden sm:inline text-xs text-green-600 font-medium">저장됨</span>
        )}
      </button>

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
