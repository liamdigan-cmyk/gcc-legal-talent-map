'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase, Lawyer, Deal } from '@/lib/supabase'

type MainTab = 'dashboard' | 'lawyers' | 'deals' | 'enrichment'

interface SectorData {
  name: string
  count: number
  t1: number
  t2: number
  t3: number
  avgScore: number
}

// Paginated fetch to bypass Supabase 1000-row default limit
async function fetchAllLawyers() {
  const all: Lawyer[] = []
  const batchSize = 1000
  let from = 0
  let done = false
  while (!done) {
    const { data, error } = await supabase
      .from('lawyers')
      .select('*, firms(name, type), sub_sectors(name, sectors(name))')
      .order('total_score', { ascending: false })
      .range(from, from + batchSize - 1)
    if (error || !data || data.length === 0) {
      done = true
    } else {
      all.push(...data)
      if (data.length < batchSize) done = true
      else from += batchSize
    }
  }
  return all
}

function getFirmName(l: Lawyer): string {
  const name = l.firms?.name
  if (!name) return '—'
  if (name.startsWith('http') || name.includes('linkedin.com')) return '—'
  return name
}

const SECTOR_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Real Estate': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Financial Services': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Energy & Infrastructure': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Consumer & Hospitality': { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500' },
  'Healthcare & Life Sciences': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  'Technology & Telecoms': { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  'Industrials': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  'UAE Nationals': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

const JURISDICTION_COLORS: Record<string, { bg: string; text: string }> = {
  'England & Wales': { bg: 'bg-red-50', text: 'text-red-600' },
  'Egypt': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'UAE': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'India': { bg: 'bg-orange-50', text: 'text-orange-700' },
  'Lebanon': { bg: 'bg-rose-50', text: 'text-rose-600' },
  'Australia': { bg: 'bg-sky-50', text: 'text-sky-700' },
  'Scotland': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'United States': { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  'Jordan': { bg: 'bg-teal-50', text: 'text-teal-700' },
  'France': { bg: 'bg-violet-50', text: 'text-violet-700' },
  'South Africa': { bg: 'bg-lime-50', text: 'text-lime-700' },
  'Canada': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700' },
  'Ireland': { bg: 'bg-green-50', text: 'text-green-700' },
  'Italy': { bg: 'bg-slate-100', text: 'text-slate-600' },
}
const DEFAULT_JUR_COLOR = { bg: 'bg-gray-50', text: 'text-gray-600' }

function getJurColor(jur: string) {
  for (const [key, val] of Object.entries(JURISDICTION_COLORS)) {
    if (jur.includes(key)) return val
  }
  return DEFAULT_JUR_COLOR
}

/* ── Icons (inline SVG) ─────────────────────────────── */
const Icons = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  lawyers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  deals: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  enrichment: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>,
  search: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  download: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  star: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  chevron: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>,
  close: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  linkedin: <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  external: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>,
}

/* ── MultiSelect ─────────────────────────────────────── */
function MultiSelect({ options, selected, onChange, placeholder }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="px-3 py-[7px] bg-white border border-[#e2e8f0] rounded-lg text-[13px] outline-none hover:border-[#cbd5e1] transition-all flex items-center gap-1.5 min-w-[140px]">
        <span className={selected.length ? 'text-[#0f172a]' : 'text-[#94a3b8]'}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <span className="ml-auto">{Icons.chevron}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-[#e2e8f0] rounded-lg shadow-lg z-[101] max-h-[280px] overflow-y-auto min-w-[200px]">
            {selected.length > 0 && (
              <button onClick={() => { onChange([]); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-[#e2e8f0] font-medium">
                Clear all
              </button>
            )}
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-3 py-2 hover:bg-[#f8fafc] cursor-pointer text-[13px]">
                <input type="checkbox" checked={selected.includes(opt)}
                  onChange={() => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])}
                  className="rounded border-[#e2e8f0] text-[#6366f1] focus:ring-[#6366f1]" />
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Score Ring SVG ───────────────────────────────────── */
function ScoreRing({ score, max = 23, size = 72 }: { score: number; max?: number; size?: number }) {
  const pct = Math.min(score / max, 1)
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const color = score >= 18 ? '#10b981' : score >= 12 ? '#3b82f6' : '#f59e0b'
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */
export default function Home() {
  const [tab, setTab] = useState<MainTab>('dashboard')
  const [lawyers, setLawyers] = useState<Lawyer[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [sectors, setSectors] = useState<{ id: string; name: string; display_order: number }[]>([])
  const [loading, setLoading] = useState(true)

  // Lawyer filters
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [subSectorFilter, setSubSectorFilter] = useState('')
  const [companyTypeFilter, setCompanyTypeFilter] = useState('')
  const [connectionFilter, setConnectionFilter] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [qualJurFilters, setQualJurFilters] = useState<string[]>([])
  const [qualYearFilters, setQualYearFilters] = useState<string[]>([])
  const [locationFilter, setLocationFilter] = useState('')
  const [sortField, setSortField] = useState<string>('total_score')
  const [sortDir, setSortDir] = useState<number>(-1)
  const [page, setPage] = useState(1)
  const perPage = 50

  // Deal filters
  const [dealSearch, setDealSearch] = useState('')
  const [dealTypeFilter, setDealTypeFilter] = useState('')
  const [dealConfFilter, setDealConfFilter] = useState('')
  const [dealYearFilter, setDealYearFilter] = useState('')
  const [dealFirmFilter, setDealFirmFilter] = useState('')
  const [dealSectorFilter, setDealSectorFilter] = useState('')
  const [dealAssetFilter, setDealAssetFilter] = useState('')
  const [dealSpecialismFilter, setDealSpecialismFilter] = useState('')
  const [dealPage, setDealPage] = useState(1)
  const dealPerPage = 25

  // Drawer
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null)
  const [starred, setStarred] = useState<Set<string>>(new Set())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [lawyerData, dealRes, sectorRes] = await Promise.all([
        fetchAllLawyers(),
        supabase.from('deals').select('*, sub_sectors(name, sectors(name))').order('year', { ascending: false }),
        supabase.from('sectors').select('*').order('display_order'),
      ])
      setLawyers(lawyerData)
      setDeals(dealRes.data || [])
      setSectors(sectorRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Keyboard shortcut: Escape closes drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedLawyer(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Derived data ──────────────────────────────────
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

  const companyTypes = useMemo(() => {
    const set = new Set<string>()
    lawyers.forEach(l => { if (l.company_type_label && l.company_type_label !== '—') set.add(l.company_type_label) })
    return Array.from(set).sort()
  }, [lawyers])

  const pqeBands = useMemo(() => {
    const set = new Set<string>()
    lawyers.forEach(l => { if (l.pqe_band) set.add(l.pqe_band) })
    return Array.from(set).sort()
  }, [lawyers])

  const languages = useMemo(() => {
    const set = new Set<string>()
    lawyers.forEach(l => {
      if (l.languages) l.languages.split(',').forEach(lang => set.add(lang.trim()))
    })
    return Array.from(set).sort()
  }, [lawyers])

  const qualJurisdictions = useMemo(() => {
    const set = new Set<string>()
    lawyers.forEach(l => {
      if (l.qual_jurisdiction) {
        l.qual_jurisdiction.split(/[;,\/]/).forEach(j => {
          const trimmed = j.trim()
          if (trimmed && trimmed !== 'N/A' && !trimmed.startsWith('Unknown')) set.add(trimmed)
        })
      }
    })
    return Array.from(set).sort()
  }, [lawyers])

  const qualYears = useMemo(() => {
    const set = new Set<string>()
    lawyers.forEach(l => { if (l.qual_year) set.add(String(l.qual_year)) })
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [lawyers])

  const locations = useMemo(() => {
    const set = new Set<string>()
    lawyers.forEach(l => { if (l.location) set.add(l.location) })
    return Array.from(set).sort()
  }, [lawyers])

  const dealAssets = useMemo(() => {
    const set = new Set<string>()
    deals.forEach(d => { if (d.asset_class_keywords) d.asset_class_keywords.split(',').forEach(a => set.add(a.trim())) })
    return Array.from(set).sort()
  }, [deals])

  const dealSpecialisms = useMemo(() => {
    const set = new Set<string>()
    deals.forEach(d => { if (d.legal_specialism_keywords) d.legal_specialism_keywords.split(',').forEach(s => set.add(s.trim())) })
    return Array.from(set).sort()
  }, [deals])

  const filteredSubSectors = useMemo(() => {
    if (!sectorFilter) return []
    return Array.from(new Set(
      lawyers.filter(l => l.sub_sectors?.sectors?.name === sectorFilter).map(l => l.sub_sectors?.name).filter(Boolean)
    )).sort() as string[]
  }, [lawyers, sectorFilter])

  const dealTypes = useMemo(() => {
    const set = new Set<string>()
    deals.forEach(d => { if (d.deal_type) d.deal_type.split(',').forEach(t => set.add(t.trim())) })
    return Array.from(set).sort()
  }, [deals])

  const dealYears = useMemo(() => {
    const set = new Set<number>()
    deals.forEach(d => { if (d.year) set.add(d.year) })
    return Array.from(set).sort((a, b) => b - a)
  }, [deals])

  const dealFirms = useMemo(() => {
    const map = new Map<string, number>()
    deals.forEach(d => { if (d.firm_name) map.set(d.firm_name, (map.get(d.firm_name) || 0) + 1) })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([n]) => n)
  }, [deals])

  const dealSectors = useMemo(() => {
    const map = new Map<string, number>()
    deals.forEach(d => {
      const sectorName = d.sub_sectors?.sectors?.name
      if (sectorName) map.set(sectorName, (map.get(sectorName) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [deals])

  // ── Filtered lawyers ──────────────────────────────
  const filteredLawyers = useMemo(() => {
    let result = lawyers
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        getFirmName(l).toLowerCase().includes(q) ||
        l.focus_areas?.toLowerCase().includes(q) ||
        l.notable_experience?.toLowerCase().includes(q) ||
        l.languages?.toLowerCase().includes(q) ||
        l.qual_jurisdiction?.toLowerCase().includes(q) ||
        l.location?.toLowerCase().includes(q)
      )
    }
    if (tierFilter) result = result.filter(l => l.tier === tierFilter)
    if (sectorFilter) result = result.filter(l => l.sub_sectors?.sectors?.name === sectorFilter)
    if (subSectorFilter) result = result.filter(l => l.sub_sectors?.name === subSectorFilter)
    if (companyTypeFilter) result = result.filter(l => l.company_type_label === companyTypeFilter)
    if (connectionFilter) result = result.filter(l => l.connection_degree === Number(connectionFilter))
    if (languageFilter) result = result.filter(l => l.languages?.includes(languageFilter))
    if (qualJurFilters.length) result = result.filter(l =>
      l.qual_jurisdiction && qualJurFilters.some(jur => l.qual_jurisdiction!.includes(jur))
    )
    if (qualYearFilters.length) result = result.filter(l =>
      l.qual_year && qualYearFilters.includes(String(l.qual_year))
    )
    if (locationFilter) result = result.filter(l => l.location === locationFilter)
    if (confidenceFilter) {
      if (confidenceFilter === 'high') result = result.filter(l => l.confidence >= 9)
      else if (confidenceFilter === 'mid') result = result.filter(l => l.confidence >= 5 && l.confidence <= 8)
      else if (confidenceFilter === 'low') result = result.filter(l => l.confidence <= 4)
    }
    result.sort((a, b) => {
      let va: any, vb: any
      if (sortField === 'firms.name') { va = getFirmName(a); vb = getFirmName(b) }
      else if (sortField === 'sub_sectors.sectors.name') { va = a.sub_sectors?.sectors?.name || ''; vb = b.sub_sectors?.sectors?.name || '' }
      else { va = (a as any)[sortField] ?? ''; vb = (b as any)[sortField] ?? '' }
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sortDir
      return String(va).localeCompare(String(vb)) * sortDir
    })
    return result
  }, [lawyers, search, tierFilter, sectorFilter, subSectorFilter, companyTypeFilter, connectionFilter, confidenceFilter, languageFilter, qualJurFilters, qualYearFilters, locationFilter, sortField, sortDir])

  const filteredDeals = useMemo(() => {
    let result = deals
    if (dealSearch) {
      const q = dealSearch.toLowerCase()
      result = result.filter(d =>
        d.description?.toLowerCase().includes(q) ||
        d.firm_name?.toLowerCase().includes(q) ||
        d.client_name?.toLowerCase().includes(q) ||
        d.asset_class_keywords?.toLowerCase().includes(q) ||
        d.legal_specialism_keywords?.toLowerCase().includes(q)
      )
    }
    if (dealTypeFilter) result = result.filter(d => d.deal_type?.includes(dealTypeFilter))
    if (dealConfFilter) result = result.filter(d => d.confidence === dealConfFilter)
    if (dealYearFilter) result = result.filter(d => String(d.year) === dealYearFilter)
    if (dealFirmFilter) result = result.filter(d => d.firm_name === dealFirmFilter)
    if (dealSectorFilter) result = result.filter(d => d.sub_sectors?.sectors?.name === dealSectorFilter)
    if (dealAssetFilter) result = result.filter(d => d.asset_class_keywords?.includes(dealAssetFilter))
    if (dealSpecialismFilter) result = result.filter(d => d.legal_specialism_keywords?.includes(dealSpecialismFilter))
    return result
  }, [deals, dealSearch, dealTypeFilter, dealConfFilter, dealYearFilter, dealFirmFilter, dealSectorFilter, dealAssetFilter, dealSpecialismFilter])

  const pagedLawyers = filteredLawyers.slice((page - 1) * perPage, page * perPage)
  const totalLawyerPages = Math.ceil(filteredLawyers.length / perPage)
  const pagedDeals = filteredDeals.slice((dealPage - 1) * dealPerPage, dealPage * dealPerPage)
  const totalDealPages = Math.ceil(filteredDeals.length / dealPerPage)

  const handleSort = useCallback((field: string) => {
    if (sortField === field) setSortDir(d => d * -1)
    else { setSortField(field); setSortDir(-1) }
    setPage(1)
  }, [sortField])

  const toggleStar = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setStarred(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }, [])

  const clearAllFilters = useCallback(() => {
    setSearch(''); setTierFilter(''); setSectorFilter(''); setSubSectorFilter('')
    setCompanyTypeFilter(''); setConnectionFilter(''); setConfidenceFilter('')
    setLanguageFilter(''); setQualJurFilters([]); setQualYearFilters([]); setLocationFilter('')
    setPage(1)
  }, [])

  const hasActiveFilters = search || tierFilter || sectorFilter || subSectorFilter || companyTypeFilter || connectionFilter || confidenceFilter || languageFilter || qualJurFilters.length || qualYearFilters.length || locationFilter

  const exportCSV = useCallback(() => {
    const headers = ['Name', 'Title', 'Company', 'Type', 'Sector', 'Sub-Sector', 'Location', 'Focus Areas', 'Languages', 'Qual Jurisdiction', 'Qual Year', 'Tier', 'Score', 'Confidence', 'Connection', 'PQE', 'LinkedIn']
    const rows = filteredLawyers.map(l => [
      l.name, l.title || '', getFirmName(l), l.company_type_label || '',
      l.sub_sectors?.sectors?.name || '', l.sub_sectors?.name || '', l.location || '',
      l.focus_areas || '', l.languages || '', l.qual_jurisdiction || '',
      l.qual_year || '', l.tier, l.total_score, l.confidence, l.connection_degree || '',
      l.pqe_band || '', l.linkedin_url || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `gcc_legal_talent_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }, [filteredLawyers])

  const exportShortlist = useCallback(() => {
    const starredLawyers = lawyers.filter(l => starred.has(l.id))
    if (!starredLawyers.length) return
    const headers = ['Name', 'Title', 'Company', 'Sector', 'Tier', 'Score', 'Location', 'LinkedIn']
    const rows = starredLawyers.map(l => [l.name, l.title || '', getFirmName(l), l.sub_sectors?.sectors?.name || '', l.tier, l.total_score, l.location || '', l.linkedin_url || ''])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `gcc_shortlist_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }, [lawyers, starred])

  // ── Enrichment calculations ───────────────────────
  const fullyEnrichedCount = useMemo(() => {
    return lawyers.filter(l =>
      l.languages && l.languages.trim() !== '' &&
      l.qual_jurisdiction && l.qual_jurisdiction.trim() !== '' &&
      l.qual_year &&
      l.focus_areas && l.focus_areas.trim() !== '' &&
      l.notable_experience && l.notable_experience.trim() !== ''
    ).length
  }, [lawyers])

  const needsEnrichmentCount = lawyers.length - fullyEnrichedCount

  const withLinkedInCount = useMemo(() => {
    return lawyers.filter(l => l.linkedin_url && l.linkedin_url.startsWith('http')).length
  }, [lawyers])

  const enrichmentStats = useMemo(() => {
    const fields = ['linkedin_url', 'focus_areas', 'languages', 'qual_jurisdiction', 'qual_year', 'notable_experience', 'location', 'pqe_band', 'connection_degree']
    const stats: { [key: string]: { filled: number; total: number; pct: number } } = {}
    fields.forEach(field => {
      let filled = 0
      lawyers.forEach(l => {
        if (field === 'linkedin_url') {
          if (l.linkedin_url && l.linkedin_url.startsWith('http')) filled++
        } else if (field === 'focus_areas' || field === 'languages' || field === 'notable_experience' || field === 'location') {
          const val = (l as any)[field]
          if (val && String(val).trim() !== '') filled++
        } else {
          if ((l as any)[field]) filled++
        }
      })
      stats[field] = { filled, total: lawyers.length, pct: lawyers.length ? Math.round((filled / lawyers.length) * 100) : 0 }
    })
    return stats
  }, [lawyers])

  const enrichmentBySector = useMemo(() => {
    const map = new Map<string, { total: number; linkedin: number; focusAreas: number; languages: number; qualJur: number; notableExp: number }>()
    lawyers.forEach(l => {
      const sectorName = l.sub_sectors?.sectors?.name || 'Unknown'
      if (!map.has(sectorName)) map.set(sectorName, { total: 0, linkedin: 0, focusAreas: 0, languages: 0, qualJur: 0, notableExp: 0 })
      const s = map.get(sectorName)!
      s.total++
      if (l.linkedin_url && l.linkedin_url.startsWith('http')) s.linkedin++
      if (l.focus_areas && l.focus_areas.trim() !== '') s.focusAreas++
      if (l.languages && l.languages.trim() !== '') s.languages++
      if (l.qual_jurisdiction && l.qual_jurisdiction.trim() !== '') s.qualJur++
      if (l.notable_experience && l.notable_experience.trim() !== '') s.notableExp++
    })
    return Array.from(map.entries()).map(([name, stats]) => ({
      name, total: stats.total,
      linkedInPct: stats.total ? Math.round((stats.linkedin / stats.total) * 100) : 0,
      focusAreasPct: stats.total ? Math.round((stats.focusAreas / stats.total) * 100) : 0,
      languagesPct: stats.total ? Math.round((stats.languages / stats.total) * 100) : 0,
      qualJurPct: stats.total ? Math.round((stats.qualJur / stats.total) * 100) : 0,
      notableExpPct: stats.total ? Math.round((stats.notableExp / stats.total) * 100) : 0,
    }))
  }, [lawyers])

  const leastEnrichedLawyers = useMemo(() => {
    const withCounts = lawyers.map(l => {
      let fieldsFilled = 0
      const missingFields: string[] = []
      if (l.linkedin_url && l.linkedin_url.startsWith('http')) fieldsFilled++; else missingFields.push('LinkedIn')
      if (l.focus_areas && l.focus_areas.trim() !== '') fieldsFilled++; else missingFields.push('Focus Areas')
      if (l.languages && l.languages.trim() !== '') fieldsFilled++; else missingFields.push('Languages')
      if (l.qual_jurisdiction && l.qual_jurisdiction.trim() !== '') fieldsFilled++; else missingFields.push('Qual Jurisdiction')
      if (l.qual_year) fieldsFilled++; else missingFields.push('Qual Year')
      if (l.notable_experience && l.notable_experience.trim() !== '') fieldsFilled++; else missingFields.push('Notable Exp')
      if (l.location && l.location.trim() !== '') fieldsFilled++; else missingFields.push('Location')
      if (l.pqe_band) fieldsFilled++; else missingFields.push('PQE Band')
      if (l.connection_degree) fieldsFilled++; else missingFields.push('Connection')
      return { ...l, fieldsFilled, missingFields }
    })
    return withCounts.sort((a, b) => a.fieldsFilled - b.fieldsFilled).slice(0, 20)
  }, [lawyers])

  // ── Display helpers ───────────────────────────────
  const tierBadge = (tier: string) => {
    const cls = tier === 'T1' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : tier === 'T2' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${cls}`}>{tier}</span>
  }
  const scoreColor = (s: number) => s >= 18 ? 'text-emerald-600' : s >= 12 ? 'text-blue-600' : 'text-amber-600'
  const confColor = (c: number) => c >= 9 ? 'text-emerald-600' : c >= 5 ? 'text-blue-600' : 'text-amber-600'

  const selectStyle = "px-3 py-[7px] bg-white border border-[#e2e8f0] rounded-lg text-[13px] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 outline-none transition-all cursor-pointer"

  // ── Loading state ─────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen">
        {/* Skeleton sidebar */}
        <div className="w-[240px] bg-[#0f172a] flex-shrink-0" />
        <div className="flex-1 p-8">
          <div className="max-w-[1280px] mx-auto">
            <div className="h-8 w-64 skeleton rounded-lg mb-8" />
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[1,2,3,4].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-64 skeleton rounded-xl" />
              <div className="h-64 skeleton rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const t1Count = lawyers.filter(l => l.tier === 'T1').length
  const t2Count = lawyers.filter(l => l.tier === 'T2').length
  const t3Count = lawyers.filter(l => l.tier === 'T3').length

  const NAV_ITEMS: { key: MainTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { key: 'lawyers', label: 'Lawyers', icon: Icons.lawyers, count: lawyers.length },
    { key: 'deals', label: 'Deals', icon: Icons.deals, count: deals.length },
    { key: 'enrichment', label: 'Enrichment', icon: Icons.enrichment },
  ]

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* ══════ SIDEBAR ══════ */}
      <aside className={`${sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'} bg-[#0f172a] flex-shrink-0 flex flex-col transition-all duration-200 fixed top-0 left-0 h-screen z-50`}>
        {/* Brand */}
        <div className={`px-5 h-16 flex items-center border-b border-white/10 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          {sidebarCollapsed ? (
            <span className="text-white font-bold text-lg">G</span>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30">G</div>
              <div>
                <div className="text-white font-semibold text-sm tracking-tight">GCC Legal</div>
                <div className="text-slate-400 text-[10px] font-medium tracking-wider uppercase">Talent Map</div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium ${
                tab === item.key ? 'active text-white' : 'text-slate-400 hover:text-white'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <span className="flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <>
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className="ml-auto text-[11px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-md font-medium">{item.count.toLocaleString()}</span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        {!sidebarCollapsed && (
          <div className="px-4 py-4 border-t border-white/10">
            <div className="text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between"><span>T1 Lawyers</span><span className="text-emerald-400 font-semibold">{t1Count}</span></div>
              <div className="flex justify-between"><span>T2 Lawyers</span><span className="text-blue-400 font-semibold">{t2Count}</span></div>
              <div className="flex justify-between"><span>T3 Lawyers</span><span className="text-amber-400 font-semibold">{t3Count}</span></div>
              <div className="flex justify-between pt-1 border-t border-white/10"><span>{sectors.length} sectors</span><span>{deals.length} deals</span></div>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="h-10 border-t border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      </aside>

      {/* ══════ MAIN CONTENT ══════ */}
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-[68px]' : 'ml-[240px]'} transition-all duration-200`}>
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#0f172a] capitalize">{tab}</h1>
            {tab === 'lawyers' && hasActiveFilters && (
              <span className="text-[12px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium">{filteredLawyers.length.toLocaleString()} results</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-[6px] bg-white border border-[#e2e8f0] rounded-lg text-[12px] font-medium text-[#475569] hover:border-[#cbd5e1] hover:shadow-sm transition-all">
              {Icons.download} Export
            </button>
            <button onClick={exportShortlist}
              className={`flex items-center gap-1.5 px-3 py-[6px] rounded-lg text-[12px] font-medium transition-all ${
                starred.size > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
                  : 'bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
              }`}>
              {Icons.star}
              Shortlist{starred.size > 0 ? ` (${starred.size})` : ''}
            </button>
          </div>
        </header>

        <div className="p-8 max-w-[1320px] mx-auto">

          {/* ═══════════════════ DASHBOARD ═══════════════════ */}
          {tab === 'dashboard' && (
            <div>
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {[
                  { label: 'Total Lawyers', value: lawyers.length.toLocaleString(), sub: `${sectors.length} sectors`, accent: false },
                  { label: 'Tier 1', value: t1Count.toString(), sub: `${((t1Count/lawyers.length)*100).toFixed(1)}%`, accent: 'emerald' },
                  { label: 'Tier 2', value: t2Count.toString(), sub: `${((t2Count/lawyers.length)*100).toFixed(1)}%`, accent: 'blue' },
                  { label: 'Tier 3', value: t3Count.toString(), sub: `${((t3Count/lawyers.length)*100).toFixed(1)}%`, accent: 'amber' },
                  { label: 'Total Deals', value: deals.length.toString(), sub: `${deals.filter(d => d.confidence === 'High').length} high conf`, accent: false },
                  { label: 'Avg Score', value: lawyers.length ? (lawyers.reduce((a, l) => a + l.total_score, 0) / lawyers.length).toFixed(1) : '0', sub: 'out of 23', accent: false },
                ].map((kpi, i) => (
                  <div key={kpi.label} className="card-enter bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className={`text-[26px] font-bold tracking-tight ${
                      kpi.accent === 'emerald' ? 'text-emerald-600' :
                      kpi.accent === 'blue' ? 'text-blue-600' :
                      kpi.accent === 'amber' ? 'text-amber-600' :
                      'text-[#0f172a]'
                    }`}>{kpi.value}</div>
                    <div className="text-[12px] text-[#94a3b8] mt-1 font-medium">{kpi.label}</div>
                    <div className="text-[11px] text-[#cbd5e1] mt-0.5">{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="card-enter bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm" style={{ animationDelay: '100ms' }}>
                  <h3 className="text-[13px] font-semibold text-[#0f172a] mb-5">Lawyers by Sector</h3>
                  <div className="space-y-2.5">
                    {sectorStats.map(s => {
                      const maxCount = Math.max(...sectorStats.map(x => x.count))
                      const sc = SECTOR_COLORS[s.name]
                      return (
                        <div key={s.name} className="flex items-center gap-3">
                          <span className="w-[130px] text-right text-[12px] text-[#475569] truncate">{s.name}</span>
                          <div className="flex-1 h-7 bg-[#f8fafc] rounded-lg overflow-hidden relative">
                            <div className={`h-full ${sc?.dot || 'bg-slate-400'} rounded-lg flex items-center transition-all duration-500`}
                              style={{ width: `${Math.max((s.count / maxCount) * 100, 6)}%`, opacity: 0.85 }}>
                            </div>
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white mix-blend-difference">{s.count}</span>
                          </div>
                          <span className="w-10 text-right text-[11px] font-medium text-[#94a3b8]">{((s.count/lawyers.length)*100).toFixed(0)}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="card-enter bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm" style={{ animationDelay: '150ms' }}>
                  <h3 className="text-[13px] font-semibold text-[#0f172a] mb-5">Tier Distribution</h3>
                  <div className="space-y-2.5">
                    {sectorStats.map(s => (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="w-[130px] text-right text-[12px] text-[#475569] truncate">{s.name}</span>
                        <div className="flex-1 h-7 bg-[#f8fafc] rounded-lg overflow-hidden flex">
                          {s.t1 > 0 && <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(s.t1 / s.count) * 100}%` }} />}
                          {s.t2 > 0 && <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(s.t2 / s.count) * 100}%` }} />}
                          <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(s.t3 / s.count) * 100}%` }} />
                        </div>
                        <span className="w-10 text-right text-[12px] font-semibold text-[#0f172a]">{s.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-5 mt-4 text-[12px] text-[#475569]">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> T1</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500" /> T2</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400" /> T3</span>
                  </div>
                </div>
              </div>

              {/* Top 20 */}
              <div className="card-enter bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden" style={{ animationDelay: '200ms' }}>
                <div className="px-6 py-4 border-b border-[#e2e8f0]">
                  <h3 className="text-[13px] font-semibold text-[#0f172a]">Top 20 Lawyers by Score</h3>
                </div>
                <table className="w-full text-[13px]">
                  <thead><tr className="border-b border-[#e2e8f0] bg-[#fafbfc]">
                    {['#', 'Name', 'Tier', 'Score', 'Company', 'Sector'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {lawyers.slice(0, 20).map((l, i) => (
                      <tr key={l.id} className="table-row border-b border-[#f1f5f9] cursor-pointer" onClick={() => setSelectedLawyer(l)}>
                        <td className="py-3 px-4 text-[#94a3b8] font-medium">{i + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0f172a]">{l.name}</div>
                          {l.title && <div className="text-[11px] text-[#94a3b8] truncate max-w-[200px]">{l.title}</div>}
                        </td>
                        <td className="py-3 px-4">{tierBadge(l.tier)}</td>
                        <td className={`py-3 px-4 font-bold ${scoreColor(l.total_score)}`}>
                          <span className="tooltip-trigger relative cursor-help">{l.total_score}
                            <span className="tooltip-content hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0f172a] text-white text-[11px] px-3 py-2 rounded-lg whitespace-nowrap z-50 shadow-xl">
                              Tech {Number(l.tech_wtd).toFixed(1)} &middot; Exp {Number(l.exp_wtd).toFixed(1)} &middot; Resp {Number(l.resp_wtd).toFixed(1)}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#475569]">{getFirmName(l)}</td>
                        <td className="py-3 px-4">
                          {l.sub_sectors?.sectors?.name ? (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${SECTOR_COLORS[l.sub_sectors.sectors.name]?.bg || 'bg-gray-50'} ${SECTOR_COLORS[l.sub_sectors.sectors.name]?.text || 'text-gray-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${SECTOR_COLORS[l.sub_sectors.sectors.name]?.dot || 'bg-gray-400'}`} />
                              {l.sub_sectors.sectors.name}
                            </span>
                          ) : <span className="text-[#e2e8f0]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════ LAWYERS ═══════════════════ */}
          {tab === 'lawyers' && (
            <div>
              {/* Sector pills */}
              <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
                <button onClick={() => { setSectorFilter(''); setSubSectorFilter(''); setPage(1) }}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                    !sectorFilter ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                  }`}>
                  All <span className="ml-1 opacity-70">{lawyers.length.toLocaleString()}</span>
                </button>
                {sectors.map(s => {
                  const count = lawyers.filter(l => l.sub_sectors?.sectors?.name === s.name).length
                  const sc = SECTOR_COLORS[s.name]
                  return (
                    <button key={s.id} onClick={() => { setSectorFilter(s.name); setSubSectorFilter(''); setPage(1) }}
                      className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        sectorFilter === s.name
                          ? `${sc?.bg || 'bg-gray-100'} ${sc?.text || 'text-gray-700'} ring-1 ring-current/20`
                          : 'bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc?.dot || 'bg-gray-400'}`} />
                      {s.name} <span className="opacity-60">{count}</span>
                    </button>
                  )
                })}
              </div>

              {/* Filters */}
              <div className="flex gap-2 mb-3 flex-wrap items-center">
                <div className="relative flex-1 min-w-[220px] max-w-[380px]">
                  <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                    placeholder="Search name, company, focus, jurisdiction..."
                    className="w-full px-3 py-[7px] pl-9 bg-white border border-[#e2e8f0] rounded-lg text-[13px] outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/10 transition-all placeholder:text-[#cbd5e1]" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">{Icons.search}</span>
                </div>
                <select value={tierFilter} onChange={e => { setTierFilter(e.target.value); setPage(1) }} className={selectStyle}>
                  <option value="">All Tiers</option><option value="T1">T1</option><option value="T2">T2</option><option value="T3">T3</option>
                </select>
                {sectorFilter && filteredSubSectors.length > 1 && (
                  <select value={subSectorFilter} onChange={e => { setSubSectorFilter(e.target.value); setPage(1) }} className={selectStyle}>
                    <option value="">All Sub-Sectors</option>
                    {filteredSubSectors.map(ss => <option key={ss} value={ss}>{ss}</option>)}
                  </select>
                )}
                <select value={companyTypeFilter} onChange={e => { setCompanyTypeFilter(e.target.value); setPage(1) }} className={selectStyle}>
                  <option value="">All Company Types</option>
                  {companyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={locationFilter} onChange={e => { setLocationFilter(e.target.value); setPage(1) }} className={selectStyle}>
                  <option value="">All Locations</option>
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
                <MultiSelect options={qualJurisdictions} selected={qualJurFilters}
                  onChange={v => { setQualJurFilters(v); setPage(1) }} placeholder="Jurisdictions" />
                <MultiSelect options={qualYears} selected={qualYearFilters}
                  onChange={v => { setQualYearFilters(v); setPage(1) }} placeholder="Qual Years" />
                <select value={languageFilter} onChange={e => { setLanguageFilter(e.target.value); setPage(1) }} className={selectStyle}>
                  <option value="">All Languages</option>
                  {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
                <select value={connectionFilter} onChange={e => { setConnectionFilter(e.target.value); setPage(1) }} className={selectStyle}>
                  <option value="">Connection</option><option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option>
                </select>
                <select value={confidenceFilter} onChange={e => { setConfidenceFilter(e.target.value); setPage(1) }} className={selectStyle}>
                  <option value="">Confidence</option><option value="high">High (9-12)</option><option value="mid">Medium (5-8)</option><option value="low">Low (0-4)</option>
                </select>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="px-3 py-[7px] text-[12px] text-red-500 hover:text-red-600 font-medium transition-colors">Clear all</button>
                )}
              </div>

              {/* Active filter pills */}
              {hasActiveFilters && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {search && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-md text-[11px] text-indigo-600 font-medium">&ldquo;{search}&rdquo; <button onClick={() => setSearch('')} className="ml-1 hover:text-indigo-800">&times;</button></span>}
                  {tierFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-md text-[11px] text-indigo-600 font-medium">{tierFilter} <button onClick={() => setTierFilter('')} className="ml-1">&times;</button></span>}
                  {subSectorFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-md text-[11px] text-indigo-600 font-medium">{subSectorFilter} <button onClick={() => setSubSectorFilter('')} className="ml-1">&times;</button></span>}
                  {companyTypeFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-md text-[11px] text-indigo-600 font-medium">{companyTypeFilter} <button onClick={() => setCompanyTypeFilter('')} className="ml-1">&times;</button></span>}
                  {locationFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-md text-[11px] text-indigo-600 font-medium">{locationFilter} <button onClick={() => setLocationFilter('')} className="ml-1">&times;</button></span>}
                  {qualJurFilters.map(jur => <span key={jur} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-md text-[11px] text-indigo-600 font-medium">{jur} <button onClick={() => setQualJurFilters(qualJurFilters.filter(j => j !== jur))} className="ml-1">&times;</button></span>)}
                  {qualYearFilters.map(yr => <span key={yr} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-md text-[11px] text-indigo-600 font-medium">{yr} <button onClick={() => setQualYearFilters(qualYearFilters.filter(y => y !== yr))} className="ml-1">&times;</button></span>)}
                  {languageFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-md text-[11px] text-indigo-600 font-medium">{languageFilter} <button onClick={() => setLanguageFilter('')} className="ml-1">&times;</button></span>}
                  {connectionFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-md text-[11px] text-indigo-600 font-medium">{connectionFilter}&deg; <button onClick={() => setConnectionFilter('')} className="ml-1">&times;</button></span>}
                  {confidenceFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-md text-[11px] text-indigo-600 font-medium">{confidenceFilter} conf <button onClick={() => setConfidenceFilter('')} className="ml-1">&times;</button></span>}
                </div>
              )}

              {/* Lawyer table */}
              <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky-thead"><tr className="border-b border-[#e2e8f0] bg-[#fafbfc]">
                      <th className="py-3 px-2 w-[32px]"></th>
                      <th className="py-3 px-2 w-[32px]"></th>
                      {[
                        { key: 'tier', label: 'Tier' },
                        { key: 'total_score', label: 'Score' },
                        { key: 'name', label: 'Name' },
                        { key: 'firms.name', label: 'Company' },
                        { key: 'sub_sectors.sectors.name', label: 'Sector' },
                        { key: 'location', label: 'Location' },
                        { key: 'focus_areas', label: 'Focus Areas' },
                        { key: 'qual_jurisdiction', label: 'Jurisdiction' },
                        { key: 'qual_year', label: 'Year' },
                        { key: 'connection_degree', label: 'Conn' },
                        { key: 'confidence', label: 'Conf' },
                      ].map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key)}
                          className="text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8] cursor-pointer hover:text-[#475569] whitespace-nowrap select-none transition-colors">
                          {col.label}
                          {sortField === col.key && <span className="ml-0.5 text-indigo-500">{sortDir === 1 ? '▴' : '▾'}</span>}
                        </th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {pagedLawyers.map(l => (
                        <tr key={l.id} className="table-row border-b border-[#f1f5f9] cursor-pointer" onClick={() => setSelectedLawyer(l)}>
                          <td className="py-2.5 px-2 text-center">
                            <button onClick={(e) => toggleStar(l.id, e)} className={`text-sm transition-all ${starred.has(l.id) ? 'text-amber-400 scale-110' : 'text-[#e2e8f0] hover:text-amber-300'}`}>&#9733;</button>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {l.linkedin_url && l.linkedin_url.startsWith('http') ? (
                              <a href={l.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="opacity-60 hover:opacity-100 transition-opacity">
                                {Icons.linkedin}
                              </a>
                            ) : <span className="text-[#e2e8f0]">—</span>}
                          </td>
                          <td className="py-2.5 px-3">{tierBadge(l.tier)}</td>
                          <td className={`py-2.5 px-3 font-bold ${scoreColor(l.total_score)}`}>
                            <span className="tooltip-trigger relative cursor-help">{l.total_score}
                              <span className="tooltip-content hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0f172a] text-white text-[11px] px-3 py-2 rounded-lg whitespace-nowrap z-50 shadow-xl">
                                Tech {Number(l.tech_wtd).toFixed(1)} &middot; Exp {Number(l.exp_wtd).toFixed(1)} &middot; Resp {Number(l.resp_wtd).toFixed(1)}
                              </span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-[#0f172a]">{l.name}</div>
                            <div className="text-[11px] text-[#94a3b8] truncate max-w-[180px]">{l.title || ''}</div>
                          </td>
                          <td className="py-2.5 px-3 text-[#475569]">{getFirmName(l)}</td>
                          <td className="py-2.5 px-3">
                            {l.sub_sectors?.sectors?.name ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${SECTOR_COLORS[l.sub_sectors.sectors.name]?.bg || 'bg-gray-50'} ${SECTOR_COLORS[l.sub_sectors.sectors.name]?.text || 'text-gray-600'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${SECTOR_COLORS[l.sub_sectors.sectors.name]?.dot || 'bg-gray-400'}`} />
                                {l.sub_sectors.sectors.name}
                              </span>
                            ) : <span className="text-[#e2e8f0]">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-[12px] text-[#475569]">{l.location || '—'}</td>
                          <td className="py-2.5 px-3">
                            {l.focus_areas ? (
                              <div className="flex flex-wrap gap-1">
                                {l.focus_areas.split(',').slice(0, 2).map((area, i) => (
                                  <span key={i} className="inline-block px-1.5 py-0.5 bg-[#f1f5f9] rounded text-[11px] text-[#475569] truncate max-w-[90px]" title={area.trim()}>{area.trim()}</span>
                                ))}
                                {l.focus_areas.split(',').length > 2 && <span className="text-[11px] text-[#94a3b8]">+{l.focus_areas.split(',').length - 2}</span>}
                              </div>
                            ) : <span className="text-[#e2e8f0]">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            {l.qual_jurisdiction ? (() => {
                              const c = getJurColor(l.qual_jurisdiction)
                              return <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${c.bg} ${c.text}`}>{l.qual_jurisdiction}</span>
                            })() : <span className="text-[#e2e8f0]">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            {l.qual_year ? (
                              <span className="text-[11px] font-medium text-[#475569]">{l.qual_year}</span>
                            ) : <span className="text-[#e2e8f0]">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            {l.connection_degree ? (
                              <span className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[10px] font-bold ${
                                l.connection_degree === 1 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' :
                                l.connection_degree === 2 ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' :
                                'bg-slate-100 text-slate-500'
                              }`}>{l.connection_degree}</span>
                            ) : <span className="text-[#e2e8f0]">—</span>}
                          </td>
                          <td className={`py-2.5 px-3 text-[12px] font-medium ${confColor(l.confidence)}`}>{l.confidence}/12</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center px-5 py-3 border-t border-[#e2e8f0] bg-[#fafbfc]">
                  <span className="text-[12px] text-[#94a3b8]">
                    {filteredLawyers.length > 0 ? `${((page - 1) * perPage) + 1}–${Math.min(page * perPage, filteredLawyers.length)}` : '0'} of {filteredLawyers.length.toLocaleString()}
                  </span>
                  {totalLawyerPages > 1 && (
                    <div className="flex gap-1">
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1 border border-[#e2e8f0] rounded-md text-[12px] disabled:opacity-30 hover:border-[#cbd5e1] transition-all">&laquo;</button>
                      {Array.from({ length: Math.min(totalLawyerPages, 7) }, (_, i) => {
                        const p = page <= 4 ? i + 1 : Math.min(page - 3 + i, totalLawyerPages)
                        return <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 rounded-md text-[12px] transition-all ${p === page ? 'bg-[#0f172a] text-white' : 'border border-[#e2e8f0] hover:border-[#cbd5e1]'}`}>{p}</button>
                      })}
                      <button disabled={page === totalLawyerPages} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1 border border-[#e2e8f0] rounded-md text-[12px] disabled:opacity-30 hover:border-[#cbd5e1] transition-all">&raquo;</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ DEALS ═══════════════════ */}
          {tab === 'deals' && (
            <div>
              {/* Deal sector pills */}
              <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
                <button onClick={() => { setDealSectorFilter(''); setDealPage(1) }}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                    !dealSectorFilter ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                  }`}>
                  All <span className="ml-1 opacity-70">{deals.length}</span>
                </button>
                {dealSectors.map(s => {
                  const count = deals.filter(d => d.sub_sectors?.sectors?.name === s).length
                  return (
                    <button key={s} onClick={() => { setDealSectorFilter(s); setDealPage(1) }}
                      className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                        dealSectorFilter === s ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                      }`}>
                      {s} <span className="ml-1 opacity-70">{count}</span>
                    </button>
                  )
                })}
              </div>

              {/* Deal KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {[
                  { label: 'Total Deals', value: filteredDeals.length },
                  { label: 'High Confidence', value: filteredDeals.filter(d => d.confidence === 'High').length, color: 'text-emerald-600' },
                  { label: 'Medium Confidence', value: filteredDeals.filter(d => d.confidence === 'Medium').length, color: 'text-blue-600' },
                  { label: 'Linked to Mapping', value: filteredDeals.filter(d => d.firm_id).length },
                  { label: 'With Value', value: filteredDeals.filter(d => d.deal_value).length },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm">
                    <div className={`text-xl font-bold ${kpi.color || 'text-[#0f172a]'}`}>{kpi.value}</div>
                    <div className="text-[11px] text-[#94a3b8] mt-0.5 font-medium">{kpi.label}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="flex gap-2 mb-4 flex-wrap items-center">
                <div className="relative flex-1 min-w-[220px] max-w-[380px]">
                  <input type="text" value={dealSearch} onChange={e => { setDealSearch(e.target.value); setDealPage(1) }}
                    placeholder="Search deals, firms, clients..."
                    className="w-full px-3 py-[7px] pl-9 bg-white border border-[#e2e8f0] rounded-lg text-[13px] outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/10 transition-all placeholder:text-[#cbd5e1]" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">{Icons.search}</span>
                </div>
                <select value={dealFirmFilter} onChange={e => { setDealFirmFilter(e.target.value); setDealPage(1) }} className={`${selectStyle} max-w-[200px]`}>
                  <option value="">All Firms</option>
                  {dealFirms.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={dealTypeFilter} onChange={e => { setDealTypeFilter(e.target.value); setDealPage(1) }} className={selectStyle}>
                  <option value="">All Types</option>
                  {dealTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={dealAssetFilter} onChange={e => { setDealAssetFilter(e.target.value); setDealPage(1) }} className={selectStyle}>
                  <option value="">All Assets</option>
                  {dealAssets.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={dealSpecialismFilter} onChange={e => { setDealSpecialismFilter(e.target.value); setDealPage(1) }} className={selectStyle}>
                  <option value="">All Specialisms</option>
                  {dealSpecialisms.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={dealYearFilter} onChange={e => { setDealYearFilter(e.target.value); setDealPage(1) }} className={selectStyle}>
                  <option value="">All Years</option>
                  {dealYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                <select value={dealConfFilter} onChange={e => { setDealConfFilter(e.target.value); setDealPage(1) }} className={selectStyle}>
                  <option value="">Confidence</option><option value="High">High</option><option value="Medium">Medium</option>
                </select>
                {(dealSearch || dealTypeFilter || dealConfFilter || dealYearFilter || dealFirmFilter || dealSectorFilter || dealAssetFilter || dealSpecialismFilter) && (
                  <button onClick={() => { setDealSearch(''); setDealTypeFilter(''); setDealConfFilter(''); setDealYearFilter(''); setDealFirmFilter(''); setDealSectorFilter(''); setDealAssetFilter(''); setDealSpecialismFilter(''); setDealPage(1) }}
                    className="px-3 py-[7px] text-[12px] text-red-500 hover:text-red-600 font-medium transition-colors">Clear all</button>
                )}
              </div>

              {/* Deal table */}
              <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky-thead"><tr className="border-b border-[#e2e8f0] bg-[#fafbfc]">
                      {['Description', 'Firm', 'Client', 'Type', 'Asset Class', 'Value', 'Year', 'Specialism', 'Conf'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {pagedDeals.map(d => (
                        <tr key={d.id} className="table-row border-b border-[#f1f5f9]">
                          <td className="py-3 px-4 max-w-[220px]">
                            <span className="text-[#475569] line-clamp-2 text-[12px] leading-relaxed">{d.description || '—'}</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0f172a]">{d.firm_name || '—'}</td>
                          <td className="py-3 px-4 text-[#475569]">{d.client_name || '—'}</td>
                          <td className="py-3 px-4">
                            {d.deal_type ? (
                              <span className="inline-block px-2 py-0.5 bg-[#f1f5f9] rounded-md text-[11px] text-[#475569] font-medium">{d.deal_type.split(',')[0].trim()}</span>
                            ) : <span className="text-[#e2e8f0]">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            {d.asset_class_keywords ? (
                              <div className="flex flex-wrap gap-1">
                                {d.asset_class_keywords.split(',').slice(0, 2).map((a, i) => (
                                  <span key={i} className="inline-block px-1.5 py-0.5 bg-blue-50 rounded text-[11px] text-blue-600 font-medium">{a.trim()}</span>
                                ))}
                              </div>
                            ) : <span className="text-[#e2e8f0]">—</span>}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-600 text-[12px]">{d.deal_value || '—'}</td>
                          <td className="py-3 px-4 text-[#475569]">{d.year || '—'}</td>
                          <td className="py-3 px-4">
                            {d.legal_specialism_keywords ? (
                              <div className="flex flex-wrap gap-1">
                                {d.legal_specialism_keywords.split(',').slice(0, 2).map((s, i) => (
                                  <span key={i} className="inline-block px-1.5 py-0.5 bg-amber-50 rounded text-[11px] text-amber-700 font-medium">{s.trim()}</span>
                                ))}
                              </div>
                            ) : <span className="text-[#e2e8f0]">—</span>}
                          </td>
                          <td className={`py-3 px-4 text-[11px] font-bold ${d.confidence === 'High' ? 'text-emerald-600' : d.confidence === 'Medium' ? 'text-blue-600' : 'text-[#94a3b8]'}`}>
                            {d.confidence || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center px-5 py-3 border-t border-[#e2e8f0] bg-[#fafbfc]">
                  <span className="text-[12px] text-[#94a3b8]">
                    {filteredDeals.length > 0 ? `${((dealPage - 1) * dealPerPage) + 1}–${Math.min(dealPage * dealPerPage, filteredDeals.length)}` : '0'} of {filteredDeals.length}
                  </span>
                  {totalDealPages > 1 && (
                    <div className="flex gap-1">
                      <button disabled={dealPage === 1} onClick={() => setDealPage(p => p - 1)} className="px-2.5 py-1 border border-[#e2e8f0] rounded-md text-[12px] disabled:opacity-30 hover:border-[#cbd5e1] transition-all">&laquo;</button>
                      {Array.from({ length: Math.min(totalDealPages, 7) }, (_, i) => {
                        const p = dealPage <= 4 ? i + 1 : Math.min(dealPage - 3 + i, totalDealPages)
                        return <button key={p} onClick={() => setDealPage(p)} className={`px-2.5 py-1 rounded-md text-[12px] transition-all ${p === dealPage ? 'bg-[#0f172a] text-white' : 'border border-[#e2e8f0] hover:border-[#cbd5e1]'}`}>{p}</button>
                      })}
                      <button disabled={dealPage === totalDealPages} onClick={() => setDealPage(p => p + 1)} className="px-2.5 py-1 border border-[#e2e8f0] rounded-md text-[12px] disabled:opacity-30 hover:border-[#cbd5e1] transition-all">&raquo;</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ ENRICHMENT ═══════════════════ */}
          {tab === 'enrichment' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[
                  { label: 'Total Lawyers', value: lawyers.length },
                  { label: 'Fully Enriched', value: fullyEnrichedCount, color: 'text-emerald-600' },
                  { label: 'Needs Enrichment', value: needsEnrichmentCount, color: 'text-amber-600' },
                  { label: 'With LinkedIn', value: withLinkedInCount },
                  { label: 'Avg Fill Rate', value: `${(Object.values(enrichmentStats).reduce((sum, s) => sum + s.pct, 0) / 9).toFixed(0)}%` },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm">
                    <div className={`text-xl font-bold ${kpi.color || 'text-[#0f172a]'}`}>{kpi.value}</div>
                    <div className="text-[11px] text-[#94a3b8] mt-0.5 font-medium">{kpi.label}</div>
                  </div>
                ))}
              </div>

              {/* Fill rates */}
              <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm mb-6">
                <h3 className="text-[13px] font-semibold text-[#0f172a] mb-5">Field Fill Rates</h3>
                <div className="space-y-3.5">
                  {[
                    { label: 'LinkedIn URL', key: 'linkedin_url' },
                    { label: 'Focus Areas', key: 'focus_areas' },
                    { label: 'Languages', key: 'languages' },
                    { label: 'Qual Jurisdiction', key: 'qual_jurisdiction' },
                    { label: 'Qual Year', key: 'qual_year' },
                    { label: 'Notable Experience', key: 'notable_experience' },
                    { label: 'Location', key: 'location' },
                    { label: 'PQE Band', key: 'pqe_band' },
                    { label: 'Connection Degree', key: 'connection_degree' },
                  ].map(field => {
                    const stat = enrichmentStats[field.key]
                    if (!stat) return null
                    const barColor = stat.pct >= 75 ? 'bg-emerald-500' : stat.pct >= 40 ? 'bg-blue-500' : stat.pct >= 20 ? 'bg-amber-500' : 'bg-red-400'
                    return (
                      <div key={field.key} className="flex items-center gap-3">
                        <span className="w-[140px] text-[12px] text-[#475569] font-medium">{field.label}</span>
                        <div className="flex-1 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${stat.pct}%` }} />
                          </div>
                          <span className="text-[12px] font-bold text-[#0f172a] w-12 text-right">{stat.pct}%</span>
                        </div>
                        <span className="text-[11px] text-[#94a3b8] w-20 text-right">{stat.filled.toLocaleString()}/{stat.total.toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* By sector */}
              <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-[#e2e8f0]">
                  <h3 className="text-[13px] font-semibold text-[#0f172a]">Enrichment by Sector</h3>
                </div>
                <table className="w-full text-[13px]">
                  <thead><tr className="border-b border-[#e2e8f0] bg-[#fafbfc]">
                    {['Sector', 'Count', 'LinkedIn', 'Focus Areas', 'Languages', 'Jurisdiction', 'Notable Exp'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {enrichmentBySector.map(s => {
                      const pctColor = (p: number) => p >= 50 ? 'text-emerald-600' : p >= 20 ? 'text-blue-600' : 'text-red-500'
                      return (
                        <tr key={s.name} className="table-row border-b border-[#f1f5f9]">
                          <td className="py-3 px-4 text-[#475569] font-medium">{s.name}</td>
                          <td className="py-3 px-4 font-bold text-[#0f172a]">{s.total}</td>
                          <td className={`py-3 px-4 font-bold ${pctColor(s.linkedInPct)}`}>{s.linkedInPct}%</td>
                          <td className={`py-3 px-4 font-bold ${pctColor(s.focusAreasPct)}`}>{s.focusAreasPct}%</td>
                          <td className={`py-3 px-4 font-bold ${pctColor(s.languagesPct)}`}>{s.languagesPct}%</td>
                          <td className={`py-3 px-4 font-bold ${pctColor(s.qualJurPct)}`}>{s.qualJurPct}%</td>
                          <td className={`py-3 px-4 font-bold ${pctColor(s.notableExpPct)}`}>{s.notableExpPct}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Least enriched */}
              <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e2e8f0]">
                  <h3 className="text-[13px] font-semibold text-[#0f172a]">Least Enriched Lawyers</h3>
                </div>
                <table className="w-full text-[13px]">
                  <thead><tr className="border-b border-[#e2e8f0] bg-[#fafbfc]">
                    {['Name', 'Company', 'Sector', 'Filled', 'Missing Fields'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {leastEnrichedLawyers.map(l => (
                      <tr key={l.id} className="table-row border-b border-[#f1f5f9] cursor-pointer" onClick={() => setSelectedLawyer(l)}>
                        <td className="py-3 px-4 font-semibold text-[#0f172a]">{l.name}</td>
                        <td className="py-3 px-4 text-[#475569]">{getFirmName(l)}</td>
                        <td className="py-3 px-4 text-[#475569]">{l.sub_sectors?.sectors?.name || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${l.fieldsFilled <= 2 ? 'text-red-500' : l.fieldsFilled <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>{l.fieldsFilled}/9</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {l.missingFields.map(f => (
                              <span key={f} className="inline-block px-1.5 py-0.5 bg-red-50 rounded text-[10px] text-red-500 font-medium">{f}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ═══════════════════ LAWYER DRAWER ═══════════════════ */}
      {selectedLawyer && (
        <>
          <div className="overlay-enter fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[200]" onClick={() => setSelectedLawyer(null)} />
          <div className="drawer-enter fixed top-0 right-0 w-[520px] h-screen bg-white shadow-xl z-[201] overflow-y-auto border-l border-[#e2e8f0]">
            {/* Drawer header */}
            <div className="sticky top-0 bg-white z-10 px-7 py-5 border-b border-[#e2e8f0]">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    {tierBadge(selectedLawyer.tier)}
                    <span className={`text-[12px] font-medium ${confColor(selectedLawyer.confidence)}`}>Confidence {selectedLawyer.confidence}/12</span>
                  </div>
                  <h2 className="text-lg font-bold text-[#0f172a] truncate">{selectedLawyer.name}</h2>
                  {selectedLawyer.title && <p className="text-[13px] text-[#475569] mt-0.5 truncate">{selectedLawyer.title}</p>}
                </div>
                <button onClick={() => setSelectedLawyer(null)} className="p-1.5 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#0f172a] transition-all">
                  {Icons.close}
                </button>
              </div>
            </div>

            <div className="px-7 py-6 space-y-6">
              {/* Score visualization */}
              <div className="bg-[#fafbfc] rounded-xl p-5 border border-[#f1f5f9]">
                <div className="flex items-center gap-5 mb-4">
                  <div className="relative">
                    <ScoreRing score={selectedLawyer.total_score} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-bold ${scoreColor(selectedLawyer.total_score)}`}>{selectedLawyer.total_score}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {[
                      { label: 'Technical', value: selectedLawyer.tech_wtd, max: 7.67, color: 'bg-emerald-500' },
                      { label: 'Experience', value: selectedLawyer.exp_wtd, max: 7.67, color: 'bg-blue-500' },
                      { label: 'Responsiveness', value: selectedLawyer.resp_wtd, max: 7.67, color: 'bg-amber-500' },
                    ].map(bar => (
                      <div key={bar.label}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#475569] font-medium">{bar.label}</span>
                          <span className="text-[#0f172a] font-bold">{Number(bar.value).toFixed(1)}</span>
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${bar.color} transition-all duration-500`} style={{ width: `${Math.min((Number(bar.value) / bar.max) * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profile */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">Profile</h3>
                <div className="space-y-0">
                  {[
                    ['Company', getFirmName(selectedLawyer)],
                    ['Type', selectedLawyer.company_type_label || '—'],
                    ['Sector', `${selectedLawyer.sub_sectors?.sectors?.name || '—'} / ${selectedLawyer.sub_sectors?.name || '—'}`],
                    ['Location', selectedLawyer.location || '—'],
                    ['PQE', selectedLawyer.pqe_band || '—'],
                    ['Connection', selectedLawyer.connection_degree ? `${selectedLawyer.connection_degree}${selectedLawyer.connection_degree === 1 ? 'st' : selectedLawyer.connection_degree === 2 ? 'nd' : 'rd'} degree` : '—'],
                    ['Languages', selectedLawyer.languages || '—'],
                    ['Qualification', selectedLawyer.qual_jurisdiction ? `${selectedLawyer.qual_jurisdiction}${selectedLawyer.qual_year ? ` (${selectedLawyer.qual_year})` : ''}` : '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2 border-b border-[#f1f5f9] last:border-0">
                      <span className="text-[12px] text-[#94a3b8]">{label}</span>
                      <span className="text-[12px] font-medium text-[#0f172a] text-right max-w-[60%]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Focus areas */}
              {selectedLawyer.focus_areas && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">Focus Areas</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLawyer.focus_areas.split(/[;,]/).map((area, i) => (
                      <span key={i} className="px-2.5 py-1 bg-[#f1f5f9] rounded-lg text-[11px] text-[#475569] font-medium">{area.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notable experience */}
              {selectedLawyer.notable_experience && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">Notable Experience</h3>
                  <p className="text-[13px] text-[#475569] leading-relaxed">{selectedLawyer.notable_experience}</p>
                </div>
              )}

              {/* LinkedIn button */}
              {selectedLawyer.linkedin_url && selectedLawyer.linkedin_url.startsWith('http') && (
                <a href={selectedLawyer.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0a66c2] text-white rounded-lg text-[13px] font-medium hover:bg-[#004182] transition-colors shadow-sm">
                  {Icons.linkedin}
                  <span className="text-white">View LinkedIn Profile</span>
                  {Icons.external}
                </a>
              )}

              {/* Scoring breakdown */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">Scoring Breakdown</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0">
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
                    <div key={label as string} className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                      <span className="text-[11px] text-[#94a3b8]">{label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${Number(val) === Number(max) ? 'bg-emerald-500' : Number(val) > 0 ? 'bg-blue-500' : 'bg-slate-200'}`}
                            style={{ width: `${(Number(val) / Number(max)) * 100}%` }} />
                        </div>
                        <span className={`text-[11px] font-bold min-w-[28px] text-right ${Number(val) === Number(max) ? 'text-emerald-600' : 'text-[#0f172a]'}`}>{val}/{max}</span>
                      </div>
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
