'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase, Lawyer, Deal } from '@/lib/supabase'

type Tab = 'dashboard' | 'lawyers' | 'deals'

interface SectorData {
  name: string
  count: number
  t1: number
  t2: number
  t3: number
  avgScore: number
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [lawyers, setLawyers] = useState<Lawyer[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [sectors, setSectors] = useState<{ id: string; name: string; display_order: number }[]>([])
  const [loading, setLoading] = useState(true)

  // Lawyer filters
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [sortField, setSortField] = useState<string>('total_score')
  const [sortDir, setSortDir] = useState<number>(-1)
  const [page, setPage] = useState(1)
  const perPage = 50

  // Deal filters
  const [dealSearch, setDealSearch] = useState('')
  const [dealTypeFilter, setDealTypeFilter] = useState('')
  const [dealConfFilter, setDealConfFilter] = useState('')
  const [dealPage, setDealPage] = useState(1)

  // Drawer
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [lawyerRes, dealRes, sectorRes] = await Promise.all([
        supabase.from('lawyers').select('*, firms(name, type), sub_sectors(name, sectors(name))').order('total_score', { ascending: false }).range(0, 2999),
        supabase.from('deals').select('*, sub_sectors(name, sectors(name))').order('year', { ascending: false }),
        supabase.from('sectors').select('*').order('display_order'),
      ])
      setLawyers(lawyerRes.data || [])
      setDeals(dealRes.data || [])
      setSectors(sectorRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Derived data
  const sectorStats: SectorData[] = useMemo(() => {
    const map = new Map<string, { count: number; t1: number; t2: number; t3: number; scores: number[] }>()
    lawyers.forEach(l => {
      const s = l.sub_sectors?.sectors?.name || 'Unknown'
      if (!map.has(s)) map.set(s, { count: 0, t1: 0, t2: 0, t3: 0, scores: [] })
      const d = map.get(s)!
      d.count++
      if (l.tier === 'T1') d.t1++
      else if (l.tier === 'T2') d.t2++
      else d.t3++
      d.scores.push(l.total_score)
    })
    return sectors.map(s => {
      const d = map.get(s.name) || { count: 0, t1: 0, t2: 0, t3: 0, scores: [] }
      return { name: s.name, count: d.count, t1: d.t1, t2: d.t2, t3: d.t3, avgScore: d.scores.length ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : 0 }
    })
  }, [lawyers, sectors])

  const locations = useMemo(() => {
    const set = new Set<string>()
    lawyers.forEach(l => { if (l.location) set.add(l.location) })
    return Array.from(set).sort()
  }, [lawyers])

  const dealTypes = useMemo(() => {
    const set = new Set<string>()
    deals.forEach(d => { if (d.deal_type) d.deal_type.split(',').forEach(t => set.add(t.trim())) })
    return Array.from(set).sort()
  }, [deals])

  // Filtered lawyers
  const filteredLawyers = useMemo(() => {
    let result = lawyers
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.firms?.name?.toLowerCase().includes(q) ||
        l.focus_areas?.toLowerCase().includes(q) ||
        l.location?.toLowerCase().includes(q) ||
        l.notable_experience?.toLowerCase().includes(q)
      )
    }
    if (tierFilter) result = result.filter(l => l.tier === tierFilter)
    if (sectorFilter) result = result.filter(l => l.sub_sectors?.sectors?.name === sectorFilter)
    if (locationFilter) result = result.filter(l => l.location === locationFilter)

    result.sort((a, b) => {
      const va = (a as any)[sortField] ?? ''
      const vb = (b as any)[sortField] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sortDir
      return String(va).localeCompare(String(vb)) * sortDir
    })
    return result
  }, [lawyers, search, tierFilter, sectorFilter, locationFilter, sortField, sortDir])

  const filteredDeals = useMemo(() => {
    let result = deals
    if (dealSearch) {
      const q = dealSearch.toLowerCase()
      result = result.filter(d =>
        d.description?.toLowerCase().includes(q) ||
        d.firm_name?.toLowerCase().includes(q) ||
        d.client_name?.toLowerCase().includes(q)
      )
    }
    if (dealTypeFilter) result = result.filter(d => d.deal_type?.includes(dealTypeFilter))
    if (dealConfFilter) result = result.filter(d => d.confidence === dealConfFilter)
    return result
  }, [deals, dealSearch, dealTypeFilter, dealConfFilter])

  const pagedLawyers = filteredLawyers.slice((page - 1) * perPage, page * perPage)
  const totalLawyerPages = Math.ceil(filteredLawyers.length / perPage)
  const pagedDeals = filteredDeals.slice((dealPage - 1) * perPage, dealPage * perPage)
  const totalDealPages = Math.ceil(filteredDeals.length / perPage)

  const handleSort = useCallback((field: string) => {
    if (sortField === field) setSortDir(d => d * -1)
    else { setSortField(field); setSortDir(-1) }
    setPage(1)
  }, [sortField])

  const firmName = (l: Lawyer) => {
    const name = l.firms?.name
    if (!name || name.startsWith('http') || name.includes('linkedin.com')) return '—'
    return name
  }

  const tierBadge = (tier: string) => {
    const cls = tier === 'T1' ? 'bg-[#dcfce7] text-[#16a34a]' : tier === 'T2' ? 'bg-[#dbeafe] text-[#2563eb]' : 'bg-[#fef3c7] text-[#d97706]'
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-semibold ${cls}`}>{tier}</span>
  }

  const scoreColor = (score: number) => score >= 18 ? 'text-[#16a34a]' : score >= 12 ? 'text-[#2563eb]' : 'text-[#d97706]'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a3a5c] mx-auto mb-4"></div>
          <p className="text-[#3d5a78] text-sm">Loading talent map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold"><span className="text-[#1a3a5c]">GCC</span> Legal Talent Map</h1>
          <p className="text-[#3d5a78] text-sm mt-1">Cross-sector intelligence dashboard &middot; v2.0 (Database)</p>
        </div>
        <div className="flex gap-3">
          <span className="px-3 py-1.5 bg-[#faf7f2] border border-[#d5cfc4] rounded-lg text-xs font-medium text-[#3d5a78]">
            {lawyers.length.toLocaleString()} lawyers &middot; {deals.length} deals &middot; {sectors.length} sectors
          </span>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex border-b-2 border-[#d5cfc4] mb-6">
        {(['dashboard', 'lawyers', 'deals'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-medium border-b-[3px] -mb-[2px] transition-all capitalize ${tab === t ? 'text-[#1a3a5c] border-[#1a3a5c] font-semibold' : 'text-[#3d5a78] border-transparent hover:text-[#1a3a5c]'}`}>
            {t}
            {t === 'lawyers' && <span className="ml-2 text-xs bg-[#ede8df] px-2 py-0.5 rounded-lg">{lawyers.length}</span>}
            {t === 'deals' && <span className="ml-2 text-xs bg-[#ede8df] px-2 py-0.5 rounded-lg">{deals.length}</span>}
          </button>
        ))}
      </div>

      {/* ===== DASHBOARD ===== */}
      {tab === 'dashboard' && (
        <div>
          {/* KPIs */}
          <div className="flex gap-4 mb-6 flex-wrap">
            {[
              { label: 'Total Lawyers', value: lawyers.length.toLocaleString() },
              { label: 'Tier 1', value: lawyers.filter(l => l.tier === 'T1').length },
              { label: 'Tier 2', value: lawyers.filter(l => l.tier === 'T2').length },
              { label: 'Total Deals', value: deals.length },
              { label: 'Avg Confidence', value: (lawyers.reduce((a, l) => a + l.confidence, 0) / lawyers.length).toFixed(1) },
            ].map(kpi => (
              <div key={kpi.label} className="flex-1 min-w-[140px] bg-[#faf7f2] border border-[#d5cfc4] rounded-xl p-5 text-center">
                <div className="text-[28px] font-bold text-[#1a3a5c]">{kpi.value}</div>
                <div className="text-xs text-[#3d5a78] mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Sector breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#faf7f2] border border-[#d5cfc4] rounded-xl p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3d5a78] mb-3">Lawyers by Sector</h3>
              {sectorStats.map(s => (
                <div key={s.name} className="flex items-center gap-2 mb-1.5 text-xs">
                  <span className="w-[140px] text-right text-[#3d5a78] truncate">{s.name}</span>
                  <div className="flex-1 h-[18px] bg-[#ede8df] rounded overflow-hidden">
                    <div className="h-full bg-[#1a3a5c] rounded flex items-center px-1.5 text-[10px] font-semibold text-white"
                      style={{ width: `${Math.max((s.count / Math.max(...sectorStats.map(x => x.count))) * 100, 8)}%` }}>
                      {s.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#faf7f2] border border-[#d5cfc4] rounded-xl p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3d5a78] mb-3">Tier Distribution</h3>
              {sectorStats.map(s => (
                <div key={s.name} className="flex items-center gap-2 mb-1.5 text-xs">
                  <span className="w-[140px] text-right text-[#3d5a78] truncate">{s.name}</span>
                  <div className="flex-1 h-[18px] bg-[#ede8df] rounded overflow-hidden flex">
                    {s.t1 > 0 && <div className="h-full bg-[#16a34a]" style={{ width: `${(s.t1 / s.count) * 100}%` }} />}
                    {s.t2 > 0 && <div className="h-full bg-[#2563eb]" style={{ width: `${(s.t2 / s.count) * 100}%` }} />}
                    <div className="h-full bg-[#d97706]" style={{ width: `${(s.t3 / s.count) * 100}%` }} />
                  </div>
                  <span className="w-10 text-xs font-semibold text-[#1a3a5c]">{s.count}</span>
                </div>
              ))}
              <div className="flex gap-4 mt-3 text-xs text-[#3d5a78]">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#16a34a]" /> T1</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#2563eb]" /> T2</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#d97706]" /> T3</span>
              </div>
            </div>
          </div>

          {/* Top lawyers */}
          <div className="bg-[#faf7f2] border border-[#d5cfc4] rounded-xl p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3d5a78] mb-3">Top 20 Lawyers by Score</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#d5cfc4]">
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Name</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Tier</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Score</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Company</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Sector</th>
                  </tr>
                </thead>
                <tbody>
                  {lawyers.slice(0, 20).map(l => (
                    <tr key={l.id} className="border-b border-[#d5cfc4] hover:bg-[#ede8df] cursor-pointer" onClick={() => setSelectedLawyer(l)}>
                      <td className="py-2 px-3 font-semibold">{l.name}</td>
                      <td className="py-2 px-3">{tierBadge(l.tier)}</td>
                      <td className={`py-2 px-3 font-bold ${scoreColor(l.total_score)}`}>{l.total_score}</td>
                      <td className="py-2 px-3 text-[#3d5a78]">{firmName(l)}</td>
                      <td className="py-2 px-3 text-[#3d5a78] text-xs">{l.sub_sectors?.sectors?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== LAWYERS ===== */}
      {tab === 'lawyers' && (
        <div>
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px] max-w-[360px]">
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search name, company, focus areas..."
                className="w-full px-3 py-2.5 pl-9 bg-[#faf7f2] border border-[#d5cfc4] rounded-lg text-sm outline-none focus:border-[#1a3a5c]" />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d5a78]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            </div>
            <select value={tierFilter} onChange={e => { setTierFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 bg-[#faf7f2] border border-[#d5cfc4] rounded-lg text-sm">
              <option value="">All Tiers</option><option value="T1">T1</option><option value="T2">T2</option><option value="T3">T3</option>
            </select>
            <select value={sectorFilter} onChange={e => { setSectorFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 bg-[#faf7f2] border border-[#d5cfc4] rounded-lg text-sm">
              <option value="">All Sectors</option>
              {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <select value={locationFilter} onChange={e => { setLocationFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 bg-[#faf7f2] border border-[#d5cfc4] rounded-lg text-sm max-w-[200px]">
              <option value="">All Locations</option>
              {locations.slice(0, 50).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {(search || tierFilter || sectorFilter || locationFilter) && (
              <button onClick={() => { setSearch(''); setTierFilter(''); setSectorFilter(''); setLocationFilter(''); setPage(1) }}
                className="px-3 py-2 bg-[#faf7f2] border border-[#d5cfc4] rounded-lg text-xs hover:border-[#1a3a5c]">Clear All</button>
            )}
          </div>

          <div className="text-xs text-[#3d5a78] mb-3">{filteredLawyers.length} results</div>

          {/* Table */}
          <div className="bg-[#faf7f2] border border-[#d5cfc4] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#d5cfc4]">
                  {[
                    { key: 'tier', label: 'Tier' },
                    { key: 'total_score', label: 'Score' },
                    { key: 'name', label: 'Name' },
                    { key: 'firms.name', label: 'Company' },
                    { key: 'location', label: 'Location' },
                    { key: 'sub_sectors.sectors.name', label: 'Sector' },
                    { key: 'connection_degree', label: 'Conn' },
                    { key: 'confidence', label: 'Conf' },
                    { key: 'pqe_band', label: 'PQE' },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                      className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[#3d5a78] cursor-pointer hover:text-[#1a3a5c] whitespace-nowrap select-none">
                      {col.label} {sortField === col.key && (sortDir === 1 ? '▴' : '▾')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedLawyers.map(l => (
                  <tr key={l.id} className="border-b border-[#d5cfc4] hover:bg-[#ede8df] cursor-pointer transition-colors"
                    onClick={() => setSelectedLawyer(l)}>
                    <td className="py-2.5 px-3">{tierBadge(l.tier)}</td>
                    <td className={`py-2.5 px-3 font-bold text-sm ${scoreColor(l.total_score)}`}>{l.total_score}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold">{l.name}</div>
                      <div className="text-xs text-[#3d5a78] truncate max-w-[180px]">{l.title || ''}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div>{firmName(l)}</div>
                      <div className="text-xs text-[#3d5a78]">{l.company_type_label || ''}</div>
                    </td>
                    <td className="py-2.5 px-3 text-sm">{l.location || '—'}</td>
                    <td className="py-2.5 px-3 text-xs text-[#3d5a78]">{l.sub_sectors?.sectors?.name || '—'}</td>
                    <td className="py-2.5 px-3">
                      {l.connection_degree && (
                        <span className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-xs font-semibold ${l.connection_degree === 1 ? 'bg-[#dcfce7] text-[#16a34a]' : l.connection_degree === 2 ? 'bg-[#dbeafe] text-[#2563eb]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                          {l.connection_degree}
                        </span>
                      )}
                    </td>
                    <td className={`py-2.5 px-3 text-xs ${l.confidence >= 9 ? 'text-[#16a34a]' : l.confidence >= 5 ? 'text-[#2563eb]' : 'text-[#d97706]'}`}>
                      {l.confidence}/12
                    </td>
                    <td className="py-2.5 px-3 text-sm">{l.pqe_band || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center px-5 py-3 border-t border-[#d5cfc4] bg-[#faf7f2]">
              <span className="text-xs text-[#3d5a78]">
                Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, filteredLawyers.length)} of {filteredLawyers.length}
              </span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border border-[#d5cfc4] rounded text-xs disabled:opacity-40">&laquo;</button>
                {Array.from({ length: Math.min(totalLawyerPages, 7) }, (_, i) => {
                  const p = page <= 4 ? i + 1 : Math.min(page - 3 + i, totalLawyerPages)
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-3 py-1.5 border rounded text-xs ${p === page ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]' : 'border-[#d5cfc4] hover:border-[#1a3a5c]'}`}>
                      {p}
                    </button>
                  )
                })}
                <button disabled={page === totalLawyerPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-[#d5cfc4] rounded text-xs disabled:opacity-40">&raquo;</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DEALS ===== */}
      {tab === 'deals' && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px] max-w-[360px]">
              <input type="text" value={dealSearch} onChange={e => { setDealSearch(e.target.value); setDealPage(1) }}
                placeholder="Search deals, firms, clients..."
                className="w-full px-3 py-2.5 pl-9 bg-[#faf7f2] border border-[#d5cfc4] rounded-lg text-sm outline-none focus:border-[#1a3a5c]" />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d5a78]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            </div>
            <select value={dealTypeFilter} onChange={e => { setDealTypeFilter(e.target.value); setDealPage(1) }}
              className="px-3 py-2 bg-[#faf7f2] border border-[#d5cfc4] rounded-lg text-sm">
              <option value="">All Types</option>
              {dealTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={dealConfFilter} onChange={e => { setDealConfFilter(e.target.value); setDealPage(1) }}
              className="px-3 py-2 bg-[#faf7f2] border border-[#d5cfc4] rounded-lg text-sm">
              <option value="">All Confidence</option><option value="High">High</option><option value="Medium">Medium</option>
            </select>
          </div>

          <div className="text-xs text-[#3d5a78] mb-3">{filteredDeals.length} deals</div>

          <div className="bg-[#faf7f2] border border-[#d5cfc4] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#d5cfc4]">
                  <th className="text-left py-3 px-3 text-xs font-semibold uppercase text-[#3d5a78] min-w-[200px]">Description</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Firm</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Client</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Type</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Value</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Year</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Sector</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold uppercase text-[#3d5a78]">Conf</th>
                </tr>
              </thead>
              <tbody>
                {pagedDeals.map(d => (
                  <tr key={d.id} className="border-b border-[#d5cfc4] hover:bg-[#ede8df]">
                    <td className="py-2.5 px-3 max-w-[260px]">
                      <div className="font-medium leading-snug line-clamp-2">{d.description}</div>
                    </td>
                    <td className="py-2.5 px-3 text-sm">{d.firm_name || '—'}</td>
                    <td className="py-2.5 px-3 text-xs text-[#3d5a78]">{d.client_name || '—'}</td>
                    <td className="py-2.5 px-3">
                      {d.deal_type?.split(',').slice(0, 2).map(t => (
                        <span key={t} className="inline-flex px-2 py-0.5 rounded-lg text-[11px] bg-[#ede8df] text-[#3d5a78] mr-1">{t.trim()}</span>
                      ))}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#16a34a] text-sm">{d.deal_value || '—'}</td>
                    <td className="py-2.5 px-3 text-sm">{d.year || '—'}</td>
                    <td className="py-2.5 px-3 text-xs text-[#3d5a78]">{d.sub_sectors?.sectors?.name || '—'}</td>
                    <td className={`py-2.5 px-3 text-xs font-semibold ${d.confidence === 'High' ? 'text-[#16a34a]' : 'text-[#2563eb]'}`}>{d.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center px-5 py-3 border-t border-[#d5cfc4] bg-[#faf7f2]">
              <span className="text-xs text-[#3d5a78]">
                Showing {((dealPage - 1) * perPage) + 1}–{Math.min(dealPage * perPage, filteredDeals.length)} of {filteredDeals.length}
              </span>
              <div className="flex gap-1">
                <button disabled={dealPage === 1} onClick={() => setDealPage(p => p - 1)}
                  className="px-3 py-1.5 border border-[#d5cfc4] rounded text-xs disabled:opacity-40">&laquo;</button>
                {Array.from({ length: Math.min(totalDealPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setDealPage(p)}
                    className={`px-3 py-1.5 border rounded text-xs ${p === dealPage ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]' : 'border-[#d5cfc4]'}`}>{p}</button>
                ))}
                <button disabled={dealPage === totalDealPages} onClick={() => setDealPage(p => p + 1)}
                  className="px-3 py-1.5 border border-[#d5cfc4] rounded text-xs disabled:opacity-40">&raquo;</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== LAWYER DRAWER ===== */}
      {selectedLawyer && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[200]" onClick={() => setSelectedLawyer(null)} />
          <div className="fixed top-0 right-0 w-[480px] h-screen bg-[#faf7f2] shadow-[-4px_0_24px_rgba(0,0,0,0.1)] z-[201] overflow-y-auto">
            <div className="p-6 border-b border-[#d5cfc4] flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{selectedLawyer.name}</h2>
                <p className="text-sm text-[#3d5a78] mt-1">{selectedLawyer.title}</p>
              </div>
              <button onClick={() => setSelectedLawyer(null)} className="text-2xl text-[#3d5a78] hover:text-[#1a3a5c]">&times;</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Score summary */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3d5a78] mb-2">Score</h3>
                <div className="flex items-center gap-4 mb-3">
                  {tierBadge(selectedLawyer.tier)}
                  <span className={`text-2xl font-bold ${scoreColor(selectedLawyer.total_score)}`}>{selectedLawyer.total_score}/23</span>
                  <span className="text-xs text-[#3d5a78]">Confidence: {selectedLawyer.confidence}/12</span>
                </div>
                <div className="flex gap-3">
                  {[
                    { label: 'Technical', value: selectedLawyer.tech_wtd, max: 7.67, color: 'bg-[#16a34a]' },
                    { label: 'Experience', value: selectedLawyer.exp_wtd, max: 7.67, color: 'bg-[#2563eb]' },
                    { label: 'Responsiveness', value: selectedLawyer.resp_wtd, max: 7.67, color: 'bg-[#d97706]' },
                  ].map(bar => (
                    <div key={bar.label} className="flex-1">
                      <div className="flex justify-between text-[11px] text-[#3d5a78] mb-1">
                        <span>{bar.label}</span>
                        <span>{Number(bar.value).toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 bg-[#ede8df] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${(Number(bar.value) / bar.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profile details */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3d5a78] mb-2">Profile</h3>
                {[
                  ['Company', firmName(selectedLawyer)],
                  ['Type', selectedLawyer.company_type_label || '—'],
                  ['Sector', `${selectedLawyer.sub_sectors?.sectors?.name || '—'} / ${selectedLawyer.sub_sectors?.name || '—'}`],
                  ['Location', selectedLawyer.location || '—'],
                  ['PQE', selectedLawyer.pqe_band || '—'],
                  ['Connection', selectedLawyer.connection_degree ? `${selectedLawyer.connection_degree}${selectedLawyer.connection_degree === 1 ? 'st' : selectedLawyer.connection_degree === 2 ? 'nd' : 'rd'} degree` : '—'],
                  ['Languages', selectedLawyer.languages || '—'],
                  ['Qualification', selectedLawyer.qual_jurisdiction ? `${selectedLawyer.qual_jurisdiction}${selectedLawyer.qual_year ? ` (${selectedLawyer.qual_year})` : ''}` : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 text-sm">
                    <span className="text-[#3d5a78]">{label}</span>
                    <span className="font-medium text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
              </div>

              {/* Focus areas */}
              {selectedLawyer.focus_areas && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3d5a78] mb-2">Focus Areas</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLawyer.focus_areas.split(/[;,]/).map((area, i) => (
                      <span key={i} className="px-2.5 py-1 bg-[#ede8df] rounded-xl text-xs text-[#3d5a78]">{area.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notable experience */}
              {selectedLawyer.notable_experience && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3d5a78] mb-2">Notable Experience</h3>
                  <p className="text-sm leading-relaxed">{selectedLawyer.notable_experience}</p>
                </div>
              )}

              {/* LinkedIn */}
              {selectedLawyer.linkedin_url && (
                <a href={selectedLawyer.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a66c2] text-white rounded-lg text-sm font-medium hover:bg-[#004182]">
                  View LinkedIn Profile
                </a>
              )}

              {/* Scoring breakdown */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3d5a78] mb-2">Scoring Breakdown</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {[
                    ['F1 Co. Quality', selectedLawyer.f1_company_quality, 3],
                    ['F2 Role Tenure', selectedLawyer.f2_role_tenure, 3],
                    ['F3 Stability', selectedLawyer.f3_stability, 2],
                    ['F4 Education', selectedLawyer.f4_education, 2],
                    ['F5 Deal Exposure', selectedLawyer.f5_deal_exposure, 2],
                    ['F6 Specialisation', selectedLawyer.f6_specialisation, 2],
                    ['F7 Multi-Jurisd.', selectedLawyer.f7_multi_jurisd, 1],
                    ['F8 LI Freshness', selectedLawyer.f8_li_freshness, 2],
                    ['F9 LI Activity', selectedLawyer.f9_li_activity, 2],
                    ['F10 Firm Health', selectedLawyer.f10_firm_health, 1],
                    ['F11 Career Stall', selectedLawyer.f11_career_stall, 2],
                  ].map(([label, val, max]) => (
                    <div key={label as string} className="flex justify-between py-1 text-[#3d5a78]">
                      <span>{label}</span>
                      <span className="font-semibold text-[#1a3a5c]">{val}/{max}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
