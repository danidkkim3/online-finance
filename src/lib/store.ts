'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Asset, Debt, Settings } from '@/types'
import { nanoid } from 'nanoid'

interface FireStore {
  assets: Asset[]
  debts: Debt[]
  settings: Settings

  addAsset: (asset: Omit<Asset, 'id'>) => void
  updateAsset: (id: string, asset: Partial<Omit<Asset, 'id'>>) => void
  deleteAsset: (id: string) => void

  addDebt: (debt: Omit<Debt, 'id'>) => void
  updateDebt: (id: string, debt: Partial<Omit<Debt, 'id'>>) => void
  deleteDebt: (id: string) => void

  updateSettings: (settings: Partial<Settings>) => void
  loadData: (data: { assets: Asset[]; debts: Debt[]; settings: Settings }) => void
}

const defaultSettings: Settings = {
  fire_monthly_goal: 3_000_000,
  safe_withdrawal_rate: 4.0,
  currency_symbol: '₩',
  monthly_income: 0,
  monthly_spend: 0,
  current_age: 30,
  salary_growth_rate: 5.0,
  salary_cap: 0,
  inflation_rate: 3.0,
  post_retirement_work: 'none',
  min_wage_monthly: 2_060_740,
  retirement_age: 60,
}

export const useStore = create<FireStore>()(
  persist(
    (set) => ({
      assets: [],
      debts: [],
      settings: defaultSettings,

      addAsset: (asset) =>
        set((state) => ({ assets: [...state.assets, { ...asset, id: nanoid() }] })),

      updateAsset: (id, asset) =>
        set((state) => ({
          assets: state.assets.map((a) => (a.id === id ? { ...a, ...asset } : a)),
        })),

      deleteAsset: (id) =>
        set((state) => ({ assets: state.assets.filter((a) => a.id !== id) })),

      addDebt: (debt) =>
        set((state) => ({ debts: [...state.debts, { ...debt, id: nanoid() }] })),

      updateDebt: (id, debt) =>
        set((state) => ({
          debts: state.debts.map((d) => (d.id === id ? { ...d, ...debt } : d)),
        })),

      deleteDebt: (id) =>
        set((state) => ({ debts: state.debts.filter((d) => d.id !== id) })),

      updateSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),

      loadData: (data) =>
        set({ assets: data.assets, debts: data.debts, settings: data.settings }),
    }),
    {
      name: 'fire-dashboard',
    },
  ),
)
