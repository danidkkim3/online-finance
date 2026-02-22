'use client'

import { LayoutDashboard, Landmark, CreditCard, Settings, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/auth/UserMenu'

export type Tab = 'dashboard' | 'assets' | 'debts' | 'settings'

interface NavItem {
  id: Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'assets', label: '자산', icon: Landmark },
  { id: 'debts', label: '부채', icon: CreditCard },
  { id: 'settings', label: '설정', icon: Settings },
]

interface HeaderProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1c1c1e] flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[#1c1c1e] text-sm hidden sm:block">FIRE 대시보드</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-[#1c1c1e] text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Mobile: icon tabs */}
        <nav className="md:hidden flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  active ? 'bg-[#1c1c1e] text-white' : 'text-gray-500 hover:text-gray-900',
                )}
              >
                <Icon className="w-5 h-5" />
              </button>
            )
          })}
        </nav>

        <UserMenu />
      </div>
    </header>
  )
}
