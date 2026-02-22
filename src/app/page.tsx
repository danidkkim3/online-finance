'use client'

import { useState } from 'react'
import { Header, Tab } from '@/components/layout/Header'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { AssetsView } from '@/components/assets/AssetsView'
import { DebtsView } from '@/components/debts/DebtsView'
import { SettingsView } from '@/components/settings/SettingsView'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
          {activeTab === 'assets' && <AssetsView />}
          {activeTab === 'debts' && <DebtsView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  )
}
