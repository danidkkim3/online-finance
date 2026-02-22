import type { SupabaseClient } from '@supabase/supabase-js'
import type { Asset, Debt, Settings } from '@/types'

export interface UserData {
  assets: Asset[]
  debts: Debt[]
  settings: Settings
}

export async function loadUserData(supabase: SupabaseClient): Promise<UserData | null> {
  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .single()

  if (error || !data) return null
  return data.data as UserData
}

export async function saveUserData(supabase: SupabaseClient, payload: UserData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: user.id, data: payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

  if (error) throw new Error(error.message)
}
