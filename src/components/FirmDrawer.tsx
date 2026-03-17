'use client'

import { useState } from 'react'
import { Lawyer, Deal } from '@/lib/supabase'
import { FirmProfile, healthLabel, tierLabel } from '@/lib/firmAnalytics'

const SECTOR_COLORS: Record<string, { bg: string; text: string }> = {
  'Real Estate': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'Financial Services': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'Energy & Infrastructure': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'Consumer & Hospitality': { bg: 'bg-pink-50', text: 'text-pink-700' },
  'Healthcare & Life Sciences': { bg: 'bg-violet-50', text: 'text-violet-700' },
  'Technology & Telecoms': { bg: 'bg-cyan-50', text: 'text-cyan-700' },
  'Industrials': { bg: 'bg-orange-50', text: 'text-orange-700' },
  'UAE Nationals': { bg: 'bg-red-50', text: 'text-red-700' },
}

interface FirmDrawerProps {
  firm: FirmProfile
  onClose: () => void
  onSelectLawyer: (l: Lawyer) => void
  onSelectDeal: (d: Deal) => void
  onCompare?: (firm: FirmProfile) => void
  peerFirms: FirmProfile[] // same-type firms for competitive position
}

type DrawerTab = 'overview' | 'lawyers' | 'deals'

export default function FirmDrawer({ firm, onClose, onSelectLawyer, onSelectDeal, onCompare, peerFirms }: FirmDrawerProps) {
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('overview')

  const health = healthLabel(firm.healthScore)
  const tier = tierLabel(firm.qualityTier)

  // Competitive rank
  const peerRank = peerFirms.findIndex(p => p.id === firm.id) + 1
  const peerTotal = peerFirms.length

  // Max sector bar width (for horizontal chart)
  const maxSectorCount = firm.topSectors.length > 0 ? firm.topSectors[0].count : 1

  return (
    <>
      <div className="overlay-enter fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[200]" onClick={onClose} />
      <div className="drawer-enter fixed top-0 right-0 w-[560px] h-screen bg-white shadow-xl z-[201] overflow-y-auto border-l border-[#e2e8f0]">

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-7 py-5 border-b border-[#e2e8f0]">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ring-1 ${tier.bg} ${tier.textColor} ring-current/20`}>{tier.text}</span>
                {firm.type && <span className="text-[11px] text-[#94a3b8] font-medium">{firm.type}</span>}
              </div>
              <h2 className="text-lg font-bold text-[#0f172a] truncate">{firm.name}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-[12px] text-[#94a3b8]">
                <span><strong className="text-[#0f172a]">{firm.lawyerCount}</strong> lawyers</span>
                <span><strong className="text-[#0f172a]">{firm.dealCount}</strong> deals</span>
                <span>Avg score <strong className={firm.avgScore >= 15 ? 'text-emerald-600' : firm.avgScore >= 10 ? 'text-blue-600' : 'text-amber-600'}>{firm.avgScore}</strong></span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#0f172a] transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Drawer tabs */}
          <div className="flex gap-1 mt-4">
            {([
              { key: 'overview' as DrawerTab, label: 'Overview' },
              { key: 'lawyers' as DrawerTab, label: `Lawyers (${firm.lawyerCount})` },
              { key: 'deals' as DrawerTab, label: `Deals (${firm.dealCount})` },
            ]).map(t => (
              <button key={t.key} onClick={() => setDrawerTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  drawerTab === t.key
                    ? 'bg-[#0f172a] text-white'
                    : 'text-[#94a3b8] hover:text-[#475569] hover:bg-[#f8fafc]'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-7 py-6 space-y-6">

          {/* ═══ OVERVIEW TAB ═══ */}
          {drawerTab === 'overview' && (
            <>
              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Health Score', value: firm.healthScore !== null ? `${firm.healthScore}/10` : '—', color: health.color },
                  { label: 'Quality Tier', value: tier.text, color: tier.textColor },
                  { label: 'Sectors', value: String(firm.sectorCoverage), color: 'text-[#0f172a]' },
                ].map(m => (
                  <div key={m.label} className="bg-[#fafbfc] border border-[#f1f5f9] rounded-xl p-3 text-center">
                    <div className={`text-[16px] font-bold ${m.color}`}>{m.value}</div>
                    <div className="text-[10px] text-[#94a3b8] font-medium mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Tier distribution */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">Talent Distribution</h3>
                <div className="flex items-center gap-2 mb-2">
                  {[
                    { label: 'T1', count: firm.t1Count, bg: 'bg-emerald-500' },
                    { label: 'T2', count: firm.t2Count, bg: 'bg-blue-500' },
                    { label: 'T3', count: firm.t3Count, bg: 'bg-amber-500' },
                  ].map(t => (
                    <div key={t.label} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${t.bg}`} />
                      <span className="text-[12px] text-[#475569]">{t.label}: <strong>{t.count}</strong></span>
                    </div>
                  ))}
                </div>
                {firm.lawyerCount > 0 && (
                  <div className="flex h-3 rounded-full overflow-hidden bg-[#f1f5f9]">
                    {firm.t1Count > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(firm.t1Count / firm.lawyerCount) * 100}%` }} />}
                    {firm.t2Count > 0 && <div className="bg-blue-500 transition-all" style={{ width: `${(firm.t2Count / firm.lawyerCount) * 100}%` }} />}
                    {firm.t3Count > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${(firm.t3Count / firm.lawyerCount) * 100}%` }} />}
                  </div>
                )}
              </div>

              {/* Sector footprint */}
              {firm.topSectors.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">Sector Footprint</h3>
                  <div className="space-y-2">
                    {firm.topSectors.map(s => {
                      const sc = SECTOR_COLORS[s.name] || { bg: 'bg-gray-50', text: 'text-gray-600' }
                      return (
                        <div key={s.name} className="flex items-center gap-3">
                          <span className={`w-[140px] text-[12px] font-medium truncate ${sc.text}`}>{s.name}</span>
                          <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                              style={{ width: `${(s.count / maxSectorCount) * 100}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-[#0f172a] w-8 text-right">{s.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Deal activity by year */}
              {firm.dealsByYear.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">Deal Activity by Year</h3>
                  <div className="flex items-end gap-1 h-[80px]">
                    {firm.dealsByYear.map(dy => {
                      const maxDeals = Math.max(...firm.dealsByYear.map(d => d.count))
                      const height = maxDeals > 0 ? (dy.count / maxDeals) * 100 : 0
                      return (
                        <div key={dy.year} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-[#0f172a]">{dy.count}</span>
                          <div className="w-full bg-indigo-100 rounded-t-sm" style={{ height: `${height}%`, minHeight: dy.count > 0 ? '4px' : '0' }} />
                          <span className="text-[9px] text-[#94a3b8]">{String(dy.year).slice(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Competitive position */}
              {peerRank > 0 && peerTotal > 1 && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">
                    Competitive Position <span className="text-[#cbd5e1] font-normal">({firm.type || 'All'})</span>
                  </h3>
                  <div className="bg-[#fafbfc] border border-[#f1f5f9] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[24px] font-bold text-[#0f172a]">#{peerRank}</span>
                      <span className="text-[12px] text-[#94a3b8]">of {peerTotal} {firm.type || ''} firms by deal volume</span>
                    </div>
                    <div className="space-y-1.5">
                      {peerFirms.slice(0, 5).map((p, i) => (
                        <div key={p.id} className={`flex items-center gap-2 text-[12px] px-2 py-1 rounded-md ${p.id === firm.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-[#475569]'}`}>
                          <span className="w-5 text-right text-[11px] font-bold text-[#94a3b8]">{i + 1}.</span>
                          <span className="flex-1 truncate">{p.name}</span>
                          <span className="text-[11px] font-medium">{p.dealCount} deals</span>
                          <span className="text-[11px] text-[#94a3b8]">{p.lawyerCount} lawyers</span>
                        </div>
                      ))}
                      {peerTotal > 5 && peerRank > 5 && (
                        <>
                          <div className="text-[11px] text-[#cbd5e1] text-center">···</div>
                          <div className="flex items-center gap-2 text-[12px] px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                            <span className="w-5 text-right text-[11px] font-bold text-[#94a3b8]">{peerRank}.</span>
                            <span className="flex-1 truncate">{firm.name}</span>
                            <span className="text-[11px] font-medium">{firm.dealCount} deals</span>
                            <span className="text-[11px] text-[#94a3b8]">{firm.lawyerCount} lawyers</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Compare button */}
              {onCompare && (
                <button onClick={() => onCompare(firm)}
                  className="w-full py-2.5 border border-indigo-200 rounded-lg text-[12px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-all">
                  Add to Comparison
                </button>
              )}
            </>
          )}

          {/* ═══ LAWYERS TAB ═══ */}
          {drawerTab === 'lawyers' && (
            <div className="space-y-1.5">
              {firm.lawyers.length === 0 ? (
                <div className="text-center py-8 text-[#94a3b8] text-[13px]">No lawyers mapped at this firm</div>
              ) : firm.lawyers.map(l => (
                <div key={l.id} onClick={() => { onClose(); setTimeout(() => onSelectLawyer(l), 150) }}
                  className="flex items-center gap-3 p-3 bg-[#fafbfc] border border-[#f1f5f9] rounded-lg cursor-pointer hover:border-[#e2e8f0] hover:shadow-sm transition-all group">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${
                    l.tier === 'T1' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                    l.tier === 'T2' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
                    'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                  }`}>{l.tier}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-[#0f172a] truncate">{l.name}</div>
                    {l.title && <div className="text-[11px] text-[#94a3b8] truncate">{l.title}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {l.sub_sectors?.sectors?.name && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#f1f5f9] rounded text-[#94a3b8]">{l.sub_sectors.sectors.name}</span>
                    )}
                    <span className={`text-[12px] font-bold ${l.total_score >= 18 ? 'text-emerald-600' : l.total_score >= 12 ? 'text-blue-600' : 'text-amber-600'}`}>{l.total_score}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-indigo-500 text-[11px] transition-opacity">View &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ DEALS TAB ═══ */}
          {drawerTab === 'deals' && (
            <div className="space-y-2">
              {firm.deals.length === 0 ? (
                <div className="text-center py-8 text-[#94a3b8] text-[13px]">No deals linked to this firm</div>
              ) : firm.deals.map(d => (
                <div key={d.id} onClick={() => { onClose(); setTimeout(() => onSelectDeal(d), 150) }}
                  className="p-3 bg-[#fafbfc] border border-[#f1f5f9] rounded-lg cursor-pointer hover:border-[#e2e8f0] hover:shadow-sm transition-all group">
                  <div className="text-[12px] text-[#0f172a] font-medium leading-snug line-clamp-2">{d.description || 'Untitled deal'}</div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#94a3b8]">
                    {d.year && <span className="font-medium">{d.year}</span>}
                    {d.deal_value && <span className="text-emerald-600 font-bold">{d.deal_value}</span>}
                    {d.deal_type && <span className="px-1.5 py-0.5 bg-white rounded text-[10px]">{d.deal_type.split(',')[0].trim()}</span>}
                    {d.confidence && (
                      <span className={`font-bold ${d.confidence === 'High' ? 'text-emerald-500' : 'text-blue-500'}`}>{d.confidence}</span>
                    )}
                    <span className="ml-auto opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity">View &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
