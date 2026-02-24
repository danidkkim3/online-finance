'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const CURRENCIES = [
  { symbol: '₩', label: '한국 원 (₩)' },
  { symbol: '$', label: '미국 달러 ($)' },
  { symbol: '€', label: '유로 (€)' },
  { symbol: '£', label: '영국 파운드 (£)' },
  { symbol: '¥', label: '일본 엔 (¥)' },
  { symbol: 'A$', label: '호주 달러 (A$)' },
  { symbol: 'C$', label: '캐나다 달러 (C$)' },
  { symbol: 'S$', label: '싱가포르 달러 (S$)' },
]

export function SettingsView() {
  const { settings, updateSettings, assets, debts, loadData } = useStore()
  const [customSymbol, setCustomSymbol] = useState('')
  const isCustom = !CURRENCIES.some((c) => c.symbol === settings.currency_symbol)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  function handleCurrencySelect(symbol: string) {
    setCustomSymbol('')
    updateSettings({ currency_symbol: symbol })
  }

  function handleCustomCommit() {
    const trimmed = customSymbol.trim().slice(0, 3)
    if (trimmed) updateSettings({ currency_symbol: trimmed })
  }

  // ── Export ──
  function handleExport() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      assets,
      debts,
      settings,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fire-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ──
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [importMessage, setImportMessage] = useState('')

  function handleImportClick() {
    setImportStatus('idle')
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        if (!json.assets || !json.debts || !json.settings) {
          throw new Error('올바른 백업 파일이 아닙니다')
        }
        if (!confirm(`자산 ${json.assets.length}개, 부채 ${json.debts.length}개가 포함된 백업을 불러옵니다.\n현재 데이터가 모두 교체됩니다. 계속하시겠습니까?`)) return
        loadData({ assets: json.assets, debts: json.debts, settings: json.settings })
        setImportStatus('success')
        setImportMessage(`자산 ${json.assets.length}개, 부채 ${json.debts.length}개 불러오기 완료`)
      } catch (err) {
        setImportStatus('error')
        setImportMessage(err instanceof Error ? err.message : '파일을 읽을 수 없습니다')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">설정</h1>
        <p className="text-muted-foreground text-sm mt-1">FIRE 목표 및 재무 파라미터는 대시보드에서 바로 수정할 수 있습니다</p>
      </div>

      {/* Account */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">계정</CardTitle>
          <CardDescription>로그인하면 데이터가 클라우드에 자동 저장됩니다</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">로그인됨 — 데이터 자동 저장 중</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  await supabase.auth.signOut({ scope: 'local' })
                  window.location.href = '/'
                }}
              >
                로그아웃
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">로그인하지 않음 — 데이터가 이 기기에만 저장됩니다</p>
              <Button
                size="sm"
                className="bg-[#1c1c1e] text-white hover:bg-[#2c2c2e]"
                onClick={() => { window.location.href = '/auth' }}
              >
                로그인
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currency */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">통화</CardTitle>
          <CardDescription>앱 전체에 사용될 통화 기호를 선택하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c.symbol}
                onClick={() => handleCurrencySelect(c.symbol)}
                className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                  settings.currency_symbol === c.symbol && !isCustom
                    ? 'border-primary bg-primary text-primary-foreground font-medium'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Custom symbol */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              maxLength={3}
              placeholder="직접 입력 (최대 3자)"
              value={isCustom ? settings.currency_symbol : customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value)}
              onBlur={handleCustomCommit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCustomCommit() }}
              className={`w-44 rounded-lg border px-3 py-2 text-sm bg-input focus:outline-none focus:ring-2 focus:ring-primary ${
                isCustom ? 'border-primary' : 'border-border'
              }`}
            />
            {customSymbol.trim() && (
              <Button size="sm" onClick={handleCustomCommit} className="bg-primary hover:bg-primary/90">
                적용
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data backup */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">데이터 백업</CardTitle>
          <CardDescription>자산·부채·설정 전체를 JSON 파일로 내보내거나 불러옵니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="outline" className="flex items-center gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              JSON으로 내보내기
            </Button>
            <Button type="button" variant="outline" className="flex items-center gap-2" onClick={handleImportClick}>
              <Upload className="w-4 h-4" />
              JSON에서 불러오기
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {importStatus !== 'idle' && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
              importStatus === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {importStatus === 'success'
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {importMessage}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            내보낸 파일에는 버전 정보와 내보낸 날짜가 포함됩니다. 불러오기 시 현재 데이터가 교체됩니다.
          </p>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">정보</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>FIRE = 재정적 독립, 조기 은퇴 (Financial Independence, Retire Early)</p>
          <p>데이터는 브라우저의 localStorage에 저장됩니다. 서버나 계정이 필요하지 않습니다.</p>
          <p>FIRE 목표액 = (월 목표 × 12) ÷ 안전 인출률</p>
        </CardContent>
      </Card>
    </div>
  )
}
