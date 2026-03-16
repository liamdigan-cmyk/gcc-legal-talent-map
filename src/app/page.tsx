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
  const [pqeFilter, setPqeFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [qualJurFilter, setQualJurFilter] = useState('')
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
      if (l.languages) {
        l.languages.split(',').forEach(lang => set.add(lang.trim()))
      }
    })
    return Array.from(set).sort()
  }, [lawyers])

  const qualJurisdictions = useMemo(() => {
    const set = new Set<string>()
    lawyers.forEach(l => {
      if (l.qual_jurisdiction) set.add(l.qual_jurisdiction)
    })
    return Array.from(set).sort()
  }, [lawyers])

  const locations = useMemo(() => {
    const set = new Set<string>()
    lawyers.forEach(l => {
      if (l.location) set.add(l.location)
    })
    return Array.from(set).sort()
  }, [lawyers])

  const dealAssets = useMemo(() => {
    const set = new Set<string>()
    deals.forEach(d => {
      if (d.asset_class_keywords) {
        d.asset_class_keywords.split(',').forEach(a => set.add(a.trim()))
      }
    })
    return Array.from(set).sort()
  }, [deals])

  const dealSpecialisms = useMemo(() => {
    const set = new Set<string>()
    deals.forEach(d => {
      if (d.legal_specialism_keywords) {
        d.legal_specialism_keywords.split(',').forEach(s => set.add(s.trim()))
      }
    })
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

  // Filtered lawyers
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
    if (qualJurFilter) result = result.filter(l => l.qual_jurisdiction === qualJurFilter)
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
  }, [lawyers, search, tierFilter, sectorFilter, subSectorFilter, companyTypeFilter, connectionFilter, confidenceFilter, languageFilter, qualJurFilter, locationFilter, sortField, sortDir])

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
    setLanguageFilter(''); setQualJurFilter(''); setLocationFilter('')
    setPage(1)
  }, [])

  const hasActiveFilters = search || tierFilter || sectorFilter || subSectorFilter || companyTypeFilter || connectionFilter || confidenceFilter || languageFilter || qualJurFilter || locationFilter

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

  // Enrichment calculations
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
      if (!map.has(sectorName)) {
        map.set(sectorName, { total: 0, linkedin: 0, focusAreas: 0, languages: 0, qualJur: 0, notableExp: 0 })
      }
      const s = map.get(sectorName)!
      s.total++
      if (l.linkedin_url && l.linkedin_url.startsWith('http')) s.linkedin++
      if (l.focus_areas && l.focus_areas.trim() !== '') s.focusAreas++
      if (l.languages && l.languages.trim() !== '') s.languages++
      if (l.qual_jurisdiction && l.qual_jurisdiction.trim() !== '') s.qualJur++
      if (l.notable_experience && l.notable_experience.trim() !== '') s.notableExp++
    })
    return Array.from(map.entries()).map(([name, stats]) => ({
      name,
      total: stats.total,
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

  const tierBadge = (tier: string) => {
    const cls = tier === 'T1' ? 'bg-[#dcfce7] text-[#16a34a]' : tier === 'T2' ? 'bg-[#dbeafe] text-[#2563eb]' : 'bg-[#fef3c7] text-[#d97706]'
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-semibold ${cls}`}>{tier}</span>
  }
  const scoreColor = (s: number) => s >= 18 ? 'text-[#16a34a]' : s >= 12 ? 'text-[#2563eb]' : 'text-[#d97706]'
  const confColor = (c: number) => c >= 9 ? 'text-[#16a34a]' : c >= 5 ? 'text-[#2563eb]' : 'text-[#d97706]'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f172a] mx-auto mb-4"></div>
          <p className="text-[#64748b] text-sm">Loading talent map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-[1440px] mx-auto px-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-[#0f172a]">GCC</span> Legal Talent Map</h1>
            <p className="text-[#64748b] text-sm mt-1">Cross-sector intelligence dashboard &middot; v2.0</p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCSV} className="px-4 py-2 bg-white border border-[#e2e8f0] rounded-xl text-xs font-medium text-[#64748b] hover:border-[#94a3b8] hover:shadow-sm transition-all flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Export CSV
            </button>
            <button onClick={exportShortlist} className="px-4 py-2 bg-white border border-[#e2e8f0] rounded-xl text-xs font-medium text-[#64748b] hover:border-[#94a3b8] hover:shadow-sm transition-all flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Shortlist ({starred.size})
            </button>
            <span className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-xs font-medium text-[#64748b]">
              {lawyers.length.toLocaleString()} lawyers &middot; {deals.length} deals &middot; {sectors.length} sectors
            </span>
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex border-b-2 border-[#e2e8f0] mb-6">
          {([
            { key: 'dashboard' as MainTab, label: 'Dashboard' },
            { key: 'lawyers' as MainTab, label: 'Lawyers', count: lawyers.length },
            { key: 'deals' as MainTab, label: 'Deals', count: deals.length },
            { key: 'enrichment' as MainTab, label: 'Enrichment' },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-6 py-3 text-sm font-medium border-b-[3px] -mb-[2px] transition-all capitalize ${tab === t.key ? 'text-[#0f172a] border-[#0f172a] font-semibold' : 'text-[#64748b] border-transparent hover:text-[#0f172a]'}`}>
              {t.label}
              {t.count !== undefined && <span className="ml-2 text-xs bg-[#f1f5f9] px-2 py-0.5 rounded-lg">{t.count.toLocaleString()}</span>}
            </button>
          ))}
        </div>

        {/* ===== DASHBOARD ===== */}
        {tab === 'dashboard' && (
          <div>
            <div className="flex gap-4 mb-6 flex-wrap">
              {[
                { label: 'Total Lawyers', value: lawyers.length.toLocaleString() },
                { label: 'Tier 1', value: lawyers.filter(l => l.tier === 'T1').length },
                { label: 'Tier 2', value: lawyers.filter(l => l.tier === 'T2').length },
                { label: 'Tier 3', value: lawyers.filter(l => l.tier === 'T3').length },
                { label: 'Total Deals', value: deals.length },
                { label: 'Avg Score', value: lawyers.length ? (lawyers.reduce((a, l) => a + l.total_score, 0) / lawyers.length).toFixed(1) : '0' },
              ].map(kpi => (
                <div key={kpi.label} className="flex-1 min-w-[130px] bg-white border border-[#e2e8f0] rounded-2xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[28px] font-bold text-[#0f172a]">{kpi.value}</div>
                  <div className="text-xs text-[#64748b] mt-1 font-medium">{kpi.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-3">Lawyers by Sector</h3>
                {sectorStats.map(s => (
                  <div key={s.name} className="flex items-center gap-2 mb-1.5 text-xs">
                    <span className="w-[140px] text-right text-[#64748b] truncate">{s.name}</span>
                    <div className="flex-1 h-[18px] bg-[#f1f5f9] rounded overflow-hidden">
                      <div className="h-full bg-[#0f172a] rounded flex items-center px-1.5 text-[10px] font-semibold text-white"
                        style={{ width: `${Math.max((s.count / Math.max(...sectorStats.map(x => x.count))) * 100, 8)}%` }}>
                        {s.count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-3">Tier Distribution</h3>
                {sectorStats.map(s => (
                  <div key={s.name} className="flex items-center gap-2 mb-1.5 text-xs">
                    <span className="w-[140px] text-right text-[#64748b] truncate">{s.name}</span>
                    <div className="flex-1 h-[18px] bg-[#f1f5f9] rounded overflow-hidden flex">
                      {s.t1 > 0 && <div className="h-full bg-[#16a34a]" style={{ width: `${(s.t1 / s.count) * 100}%` }} />}
                      {s.t2 > 0 && <div className="h-full bg-[#2563eb]" style={{ width: `${(s.t2 / s.count) * 100}%` }} />}
                      <div className="h-full bg-[#d97706]" style={{ width: `${(s.t3 / s.count) * 100}%` }} />
                    </div>
                    <span className="w-10 text-xs font-semibold text-[#0f172a]">{s.count}</span>
                  </div>
                ))}
                <div className="flex gap-4 mt-3 text-xs text-[#64748b]">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#16a34a]" /> T1</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#2563eb]" /> T2</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#d97706]" /> T3</span>
                </div>
              </div>
            </div>

            {/* Top 20 */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-3">Top 20 Lawyers by Score</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b-2 border-[#e2e8f0]">
                    {['#', 'Name', 'Tier', 'Score', 'Company', 'Sector'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase text-[#64748b]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {lawyers.slice(0, 20).map((l, i) => (
                      <tr key={l.id} className="border-b border-[#e2e8f0] hover:bg-[#f8fafc] cursor-pointer" onClick={() => setSelectedLawyer(l)}>
                        <td className="py-2 px-3 text-xs text-[#64748b]">{i + 1}</td>
                        <td className="py-2 px-3 font-semibold">{l.name}</td>
                        <td className="py-2 px-3">{tierBadge(l.tier)}</td>
                        <td className={`py-2 px-3 font-bold ${scoreColor(l.total_score)}`}>
                          <span className="relative group cursor-help">{l.total_score}
                            <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1e293b] text-white text-[11px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                              Tech: {Number(l.tech_wtd).toFixed(1)} · Exp: {Number(l.exp_wtd).toFixed(1)} · Resp: {Number(l.resp_wtd).toFixed(1)}
                            </span>
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#64748b]">{getFirmName(l)}</td>
                        <td className="py-2 px-3 text-[#64748b] text-xs">{l.sub_sectors?.sectors?.name || '—'}</td>
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
            {/* Sector tabs */}
            <div className="flex border-b-2 border-[#e2e8f0] mb-4 overflow-x-auto">
              <button onClick={() => { setSectorFilter(''); setSubSectorFilter(''); setPage(1) }}
                className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] whitespace-nowrap ${!sectorFilter ? 'text-[#0f172a] border-[#0f172a] font-semibold' : 'text-[#64748b] border-transparent hover:text-[#0f172a]'}`}>
                All <span className="text-[11px] bg-[#f1f5f9] px-1.5 py-0.5 rounded-lg ml-1">{lawyers.length.toLocaleString()}</span>
              </button>
              {sectors.map(s => {
                const count = lawyers.filter(l => l.sub_sectors?.sectors?.name === s.name).length
                return (
                  <button key={s.id} onClick={() => { setSectorFilter(s.name); setSubSectorFilter(''); setPage(1) }}
                    className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] whitespace-nowrap ${sectorFilter === s.name ? 'text-[#0f172a] border-[#0f172a] font-semibold' : 'text-[#64748b] border-transparent hover:text-[#0f172a]'}`}>
                    {s.name} <span className="text-[11px] bg-[#f1f5f9] px-1.5 py-0.5 rounded-lg ml-1">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-3 flex-wrap items-center">
              <div className="relative flex-1 min-w-[200px] max-w-[360px]">
                <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Search name, company, focus, languages, jurisdiction..."
                  className="w-full px-3 py-2.5 pl-9 bg-white border border-[#e2e8f0] rounded-xl text-sm outline-none focus:border-[#94a3b8] focus:ring-2 focus:ring-[#e2e8f0] transition-all" />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              </div>
              <select value={tierFilter} onChange={e => { setTierFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Tiers</option><option value="T1">T1</option><option value="T2">T2</option><option value="T3">T3</option>
              </select>
              {sectorFilter && filteredSubSectors.length > 1 && (
                <select value={subSectorFilter} onChange={e => { setSubSectorFilter(e.target.value); setPage(1) }}
                  className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                  <option value="">All Sub-Sectors</option>
                  {filteredSubSectors.map(ss => <option key={ss} value={ss}>{ss}</option>)}
                </select>
              )}
              <select value={companyTypeFilter} onChange={e => { setCompanyTypeFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Company Types</option>
                {companyTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={locationFilter} onChange={e => { setLocationFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Locations</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              <select value={qualJurFilter} onChange={e => { setQualJurFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Jurisdictions</option>
                {qualJurisdictions.map(jur => <option key={jur} value={jur}>{jur}</option>)}
              </select>
              <select value={languageFilter} onChange={e => { setLanguageFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Languages</option>
                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
              <select value={connectionFilter} onChange={e => { setConnectionFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Connections</option><option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option>
              </select>
              <select value={confidenceFilter} onChange={e => { setConfidenceFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Confidence</option><option value="high">High (9-12)</option><option value="mid">Medium (5-8)</option><option value="low">Low (0-4)</option>
              </select>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="px-3 py-2 bg-[#ffffff] border border-[#e2e8f0] rounded-lg text-xs hover:border-[#94a3b8] hover:shadow-sm transition-all">Clear All</button>
              )}
            </div>

            {/* Active filter pills */}
            {hasActiveFilters && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {search && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-2xl text-xs text-[#64748b]">&ldquo;{search}&rdquo; <button onClick={() => setSearch('')} className="font-bold ml-1">&times;</button></span>}
                {tierFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-2xl text-xs text-[#64748b]">{tierFilter} <button onClick={() => setTierFilter('')} className="font-bold ml-1">&times;</button></span>}
                {subSectorFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-2xl text-xs text-[#64748b]">{subSectorFilter} <button onClick={() => setSubSectorFilter('')} className="font-bold ml-1">&times;</button></span>}
                {companyTypeFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-2xl text-xs text-[#64748b]">{companyTypeFilter} <button onClick={() => setCompanyTypeFilter('')} className="font-bold ml-1">&times;</button></span>}
                {locationFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-2xl text-xs text-[#64748b]">{locationFilter} <button onClick={() => setLocationFilter('')} className="font-bold ml-1">&times;</button></span>}
                {qualJurFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-2xl text-xs text-[#64748b]">{qualJurFilter} <button onClick={() => setQualJurFilter('')} className="font-bold ml-1">&times;</button></span>}
                {languageFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-2xl text-xs text-[#64748b]">{languageFilter} <button onClick={() => setLanguageFilter('')} className="font-bold ml-1">&times;</button></span>}
                {connectionFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-2xl text-xs text-[#64748b]">{connectionFilter}° <button onClick={() => setConnectionFilter('')} className="font-bold ml-1">&times;</button></span>}
                {confidenceFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-2xl text-xs text-[#64748b]">{confidenceFilter} conf <button onClick={() => setConfidenceFilter('')} className="font-bold ml-1">&times;</button></span>}
              </div>
            )}

            <div className="text-xs text-[#64748b] mb-3">{filteredLawyers.length.toLocaleString()} results</div>

            {/* Table */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-[#e2e8f0]">
                  <th className="py-3 px-2 w-[30px]"></th>
                  <th className="py-3 px-3 w-[30px]"></th>
                  {[
                    { key: 'tier', label: 'Tier' },
                    { key: 'total_score', label: 'Score' },
                    { key: 'name', label: 'Name' },
                    { key: 'firms.name', label: 'Company' },
                    { key: 'sub_sectors.sectors.name', label: 'Sector' },
                    { key: 'location', label: 'Location' },
                    { key: 'focus_areas', label: 'Focus Areas' },
                    { key: 'qual_jurisdiction', label: 'Qual Jurisdiction' },
                    { key: 'qual_year', label: 'Qual Year' },
                    { key: 'connection_degree', label: 'Conn' },
                    { key: 'confidence', label: 'Conf' },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                      className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[#64748b] cursor-pointer hover:text-[#0f172a] whitespace-nowrap select-none">
                      {col.label} {sortField === col.key && (sortDir === 1 ? '▴' : '▾')}
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {pagedLawyers.map(l => (
                    <tr key={l.id} className="border-b border-[#e2e8f0] hover:bg-[#f8fafc] cursor-pointer transition-colors" onClick={() => setSelectedLawyer(l)}>
                      <td className="py-2.5 px-2 text-center">
                        <button onClick={(e) => toggleStar(l.id, e)} className={`text-base transition-colors ${starred.has(l.id) ? 'text-[#eab308]' : 'text-[#e2e8f0] hover:text-[#eab308]'}`}>★</button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {l.linkedin_url && l.linkedin_url.startsWith('http') ? (
                          <a href={l.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a66c2">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-xs text-[#e2e8f0]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">{tierBadge(l.tier)}</td>
                      <td className={`py-2.5 px-3 font-bold text-sm ${scoreColor(l.total_score)}`}>
                        <span className="relative group cursor-help">{l.total_score}
                          <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1e293b] text-white text-[11px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                            Tech: {Number(l.tech_wtd).toFixed(1)} · Exp: {Number(l.exp_wtd).toFixed(1)} · Resp: {Number(l.resp_wtd).toFixed(1)}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold">{l.name}</div>
                        <div className="text-xs text-[#64748b] truncate max-w-[200px]">{l.title || ''}</div>
                      </td>
                      <td className="py-2.5 px-3 text-sm">{getFirmName(l)}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-xs text-[#64748b]">{l.sub_sectors?.sectors?.name || '—'}</div>
                        {l.sub_sectors?.name && l.sub_sectors.name !== l.sub_sectors?.sectors?.name && (
                          <div className="text-[11px] text-[#94a3b8]">{l.sub_sectors.name}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#64748b]">{l.location || '—'}</td>
                      <td className="py-2.5 px-3 text-xs">
                        {l.focus_areas ? (
                          <div className="flex flex-wrap gap-1">
                            {l.focus_areas.split(',').slice(0, 2).map((area, i) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 bg-[#f1f5f9] rounded text-[#64748b] truncate max-w-[100px]" title={area.trim()}>{area.trim()}</span>
                            ))}
                            {l.focus_areas.split(',').length > 2 && <span className="text-[#94a3b8]">+{l.focus_areas.split(',').length - 2}</span>}
                          </div>
                        ) : (
                          <span className="text-[#e2e8f0]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#64748b]">
                        {l.qual_jurisdiction || <span className="text-[#e2e8f0]">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#64748b]">
                        {l.qual_year || <span className="text-[#e2e8f0]">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {l.connection_degree ? (
                          <span className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-xs font-semibold ${l.connection_degree === 1 ? 'bg-[#dcfce7] text-[#16a34a]' : l.connection_degree === 2 ? 'bg-[#dbeafe] text-[#2563eb]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                            {l.connection_degree}
                          </span>
                        ) : <span className="text-xs text-[#e2e8f0]">—</span>}
                      </td>
                      <td className={`py-2.5 px-3 text-xs ${confColor(l.confidence)}`}>{l.confidence}/12</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center px-5 py-3 border-t border-[#e2e8f0] bg-[#ffffff]">
                <span className="text-xs text-[#64748b]">Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, filteredLawyers.length)} of {filteredLawyers.length.toLocaleString()}</span>
                <div className="flex gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-[#e2e8f0] rounded text-xs disabled:opacity-40">&laquo;</button>
                  {Array.from({ length: Math.min(totalLawyerPages, 7) }, (_, i) => {
                    const p = page <= 4 ? i + 1 : Math.min(page - 3 + i, totalLawyerPages)
                    return <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 border rounded text-xs ${p === page ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'border-[#e2e8f0] hover:border-[#94a3b8] hover:shadow-sm transition-all'}`}>{p}</button>
                  })}
                  <button disabled={page === totalLawyerPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-[#e2e8f0] rounded text-xs disabled:opacity-40">&raquo;</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== DEALS ===== */}
        {tab === 'deals' && (
          <div>
            {/* Deal sector tabs */}
            <div className="flex border-b-2 border-[#e2e8f0] mb-4 overflow-x-auto">
              <button onClick={() => { setDealSectorFilter(''); setDealPage(1) }}
                className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] whitespace-nowrap ${!dealSectorFilter ? 'text-[#0f172a] border-[#0f172a] font-semibold' : 'text-[#64748b] border-transparent hover:text-[#0f172a]'}`}>
                All <span className="text-[11px] bg-[#f1f5f9] px-1.5 py-0.5 rounded-lg ml-1">{deals.length}</span>
              </button>
              {dealSectors.map(s => {
                const count = deals.filter(d => d.sub_sectors?.sectors?.name === s).length
                return (
                  <button key={s} onClick={() => { setDealSectorFilter(s); setDealPage(1) }}
                    className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] whitespace-nowrap ${dealSectorFilter === s ? 'text-[#0f172a] border-[#0f172a] font-semibold' : 'text-[#64748b] border-transparent hover:text-[#0f172a]'}`}>
                    {s} <span className="text-[11px] bg-[#f1f5f9] px-1.5 py-0.5 rounded-lg ml-1">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Deal KPIs */}
            <div className="flex gap-4 mb-5 flex-wrap">
              {[
                { label: 'Total Deals', value: deals.length },
                { label: 'High Confidence', value: deals.filter(d => d.confidence === 'High').length, color: 'text-[#16a34a]' },
                { label: 'Medium Confidence', value: deals.filter(d => d.confidence === 'Medium').length, color: 'text-[#2563eb]' },
                { label: 'Linked to MAPPING', value: deals.filter(d => d.firm_id).length, color: 'text-[#16a34a]' },
                { label: 'With Value', value: deals.filter(d => d.deal_value).length },
              ].map(kpi => (
                <div key={kpi.label} className="flex-1 min-w-[120px] bg-white border border-[#e2e8f0] rounded-2xl p-4 text-center shadow-sm">
                  <div className={`text-xl font-bold ${kpi.color ? kpi.color : 'text-[#0f172a]'}`}>{kpi.value}</div>
                  <div className="text-[11px] text-[#64748b] mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <div className="relative flex-1 min-w-[200px] max-w-[360px]">
                <input type="text" value={dealSearch} onChange={e => { setDealSearch(e.target.value); setDealPage(1) }}
                  placeholder="Search deals, firms, clients, asset classes..."
                  className="w-full px-3 py-2.5 pl-9 bg-white border border-[#e2e8f0] rounded-xl text-sm outline-none focus:border-[#94a3b8] focus:ring-2 focus:ring-[#e2e8f0] transition-all" />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              </div>
              <select value={dealFirmFilter} onChange={e => { setDealFirmFilter(e.target.value); setDealPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none max-w-[200px]">
                <option value="">All Firms</option>
                {dealFirms.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={dealTypeFilter} onChange={e => { setDealTypeFilter(e.target.value); setDealPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Types</option>
                {dealTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={dealAssetFilter} onChange={e => { setDealAssetFilter(e.target.value); setDealPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Assets</option>
                {dealAssets.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={dealSpecialismFilter} onChange={e => { setDealSpecialismFilter(e.target.value); setDealPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Specialisms</option>
                {dealSpecialisms.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={dealYearFilter} onChange={e => { setDealYearFilter(e.target.value); setDealPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Years</option>
                {dealYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
              <select value={dealConfFilter} onChange={e => { setDealConfFilter(e.target.value); setDealPage(1) }}
                className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:border-[#94a3b8] focus:ring-1 focus:ring-[#e2e8f0] outline-none">
                <option value="">All Confidence</option><option value="High">High</option><option value="Medium">Medium</option>
              </select>
              {(dealSearch || dealTypeFilter || dealConfFilter || dealYearFilter || dealFirmFilter || dealSectorFilter || dealAssetFilter || dealSpecialismFilter) && (
                <button onClick={() => { setDealSearch(''); setDealTypeFilter(''); setDealConfFilter(''); setDealYearFilter(''); setDealFirmFilter(''); setDealSectorFilter(''); setDealAssetFilter(''); setDealSpecialismFilter(''); setDealPage(1) }}
                  className="px-3 py-2 bg-[#ffffff] border border-[#e2e8f0] rounded-lg text-xs hover:border-[#94a3b8] hover:shadow-sm transition-all">Clear All</button>
              )}
            </div>

            <div className="text-xs text-[#64748b] mb-3">{filteredDeals.length} deals</div>

            {/* Deal table */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-[#e2e8f0]">
                  {['Description', 'Firm', 'Client', 'Type', 'Asset', 'Value', 'Year', 'Specialism', 'Conf'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[#64748b]">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pagedDeals.map(d => (
                    <tr key={d.id} className="border-b border-[#e2e8f0] hover:bg-[#f8fafc] cursor-pointer transition-colors">
                      <td className="py-2.5 px-3 max-w-[200px] truncate text-[#64748b]">{d.description || '—'}</td>
                      <td className="py-2.5 px-3 text-[#0f172a] font-medium">{d.firm_name || '—'}</td>
                      <td className="py-2.5 px-3 text-[#64748b]">{d.client_name || '—'}</td>
                      <td className="py-2.5 px-3">
                        {d.deal_type ? (
                          <span className="inline-block px-2 py-0.5 bg-[#f1f5f9] rounded text-[11px] text-[#64748b]">{d.deal_type.split(',')[0].trim()}</span>
                        ) : (
                          <span className="text-[#e2e8f0]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {d.asset_class_keywords ? (
                          <div className="flex flex-wrap gap-1">
                            {d.asset_class_keywords.split(',').slice(0, 2).map((a, i) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 bg-[#e8edf5] rounded text-[11px] text-[#2563eb]">{a.trim()}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#e2e8f0]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#16a34a]">{d.deal_value || '—'}</td>
                      <td className="py-2.5 px-3 text-[#64748b]">{d.year || '—'}</td>
                      <td className="py-2.5 px-3">
                        {d.legal_specialism_keywords ? (
                          <div className="flex flex-wrap gap-1">
                            {d.legal_specialism_keywords.split(',').slice(0, 2).map((s, i) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 bg-[#fef3c7] rounded text-[11px] text-[#d97706]">{s.trim()}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#e2e8f0]">—</span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 text-xs font-semibold ${d.confidence === 'High' ? 'text-[#16a34a]' : d.confidence === 'Medium' ? 'text-[#2563eb]' : 'text-[#64748b]'}`}>
                        {d.confidence || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center px-5 py-3 border-t border-[#e2e8f0] bg-[#ffffff]">
                <span className="text-xs text-[#64748b]">Showing {((dealPage - 1) * dealPerPage) + 1}–{Math.min(dealPage * dealPerPage, filteredDeals.length)} of {filteredDeals.length}</span>
                <div className="flex gap-1">
                  <button disabled={dealPage === 1} onClick={() => setDealPage(p => p - 1)} className="px-3 py-1.5 border border-[#e2e8f0] rounded text-xs disabled:opacity-40">&laquo;</button>
                  {Array.from({ length: Math.min(totalDealPages, 7) }, (_, i) => {
                    const p = dealPage <= 4 ? i + 1 : Math.min(dealPage - 3 + i, totalDealPages)
                    return <button key={p} onClick={() => setDealPage(p)} className={`px-3 py-1.5 border rounded text-xs ${p === dealPage ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'border-[#e2e8f0] hover:border-[#94a3b8] hover:shadow-sm transition-all'}`}>{p}</button>
                  })}
                  <button disabled={dealPage === totalDealPages} onClick={() => setDealPage(p => p + 1)} className="px-3 py-1.5 border border-[#e2e8f0] rounded text-xs disabled:opacity-40">&raquo;</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== ENRICHMENT ===== */}
        {tab === 'enrichment' && (
          <div>
            {/* Top stats */}
            <div className="flex gap-4 mb-6 flex-wrap">
              {[
                { label: 'Total Lawyers', value: lawyers.length },
                { label: 'Fully Enriched', value: fullyEnrichedCount },
                { label: 'Needs Enrichment', value: needsEnrichmentCount },
                { label: 'With LinkedIn', value: withLinkedInCount },
                { label: 'Avg Fields Filled', value: `${(Object.values(enrichmentStats).reduce((sum, s) => sum + s.pct, 0) / 9).toFixed(0)}%` },
              ].map(kpi => (
                <div key={kpi.label} className="flex-1 min-w-[120px] bg-white border border-[#e2e8f0] rounded-2xl p-4 text-center shadow-sm">
                  <div className="text-xl font-bold text-[#0f172a]">{kpi.value}</div>
                  <div className="text-[11px] text-[#64748b] mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Enrichment Fill Rates */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-4">Enrichment Fill Rates</h3>
              <div className="space-y-3">
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
                  return (
                    <div key={field.key} className="flex items-center gap-3">
                      <span className="w-[140px] text-sm text-[#64748b]">{field.label}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs font-semibold bg-[#3b82f6] text-white px-2 py-0.5 rounded-lg">{stat.pct}%</span>
                        <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${stat.pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-[#64748b] w-16 text-right">{stat.filled}/{stat.total}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* By Sector */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-4">Enrichment by Sector</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b-2 border-[#e2e8f0]">
                    {['Sector', 'Total', 'LinkedIn %', 'Focus Areas %', 'Languages %', 'Qual Jurisdiction %', 'Notable Exp %'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase text-[#64748b]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {enrichmentBySector.map(s => (
                      <tr key={s.name} className="border-b border-[#e2e8f0]">
                        <td className="py-2 px-3 text-[#64748b]">{s.name}</td>
                        <td className="py-2 px-3 font-semibold text-[#0f172a]">{s.total}</td>
                        <td className={`py-2 px-3 font-semibold ${s.linkedInPct >= 50 ? 'text-[#16a34a]' : s.linkedInPct >= 20 ? 'text-[#3b82f6]' : 'text-[#dc2626]'}`}>{s.linkedInPct}%</td>
                        <td className={`py-2 px-3 font-semibold ${s.focusAreasPct >= 50 ? 'text-[#16a34a]' : s.focusAreasPct >= 20 ? 'text-[#3b82f6]' : 'text-[#dc2626]'}`}>{s.focusAreasPct}%</td>
                        <td className={`py-2 px-3 font-semibold ${s.languagesPct >= 50 ? 'text-[#16a34a]' : s.languagesPct >= 20 ? 'text-[#3b82f6]' : 'text-[#dc2626]'}`}>{s.languagesPct}%</td>
                        <td className={`py-2 px-3 font-semibold ${s.qualJurPct >= 50 ? 'text-[#16a34a]' : s.qualJurPct >= 20 ? 'text-[#3b82f6]' : 'text-[#dc2626]'}`}>{s.qualJurPct}%</td>
                        <td className={`py-2 px-3 font-semibold ${s.notableExpPct >= 50 ? 'text-[#16a34a]' : s.notableExpPct >= 20 ? 'text-[#3b82f6]' : 'text-[#dc2626]'}`}>{s.notableExpPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Least Enriched */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-4">Least Enriched Lawyers</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b-2 border-[#e2e8f0]">
                    {['Name', 'Company', 'Sector', 'Fields Filled', 'Missing Fields'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase text-[#64748b]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {leastEnrichedLawyers.map(l => (
                      <tr key={l.id} className="border-b border-[#e2e8f0] hover:bg-[#f8fafc] cursor-pointer" onClick={() => setSelectedLawyer(l)}>
                        <td className="py-2 px-3 font-semibold">{l.name}</td>
                        <td className="py-2 px-3 text-[#64748b]">{getFirmName(l)}</td>
                        <td className="py-2 px-3 text-[#64748b] text-xs">{l.sub_sectors?.sectors?.name || '—'}</td>
                        <td className="py-2 px-3 font-semibold text-[#0f172a]">{l.fieldsFilled}/9</td>
                        <td className="py-2 px-3 text-xs text-[#64748b]">{l.missingFields.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== LAWYER DRAWER ===== */}
        {selectedLawyer && (
          <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[200]" onClick={() => setSelectedLawyer(null)} />
            <div className="fixed top-0 right-0 w-[480px] h-screen bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.08)] z-[201] overflow-y-auto">
              <div className="p-6 border-b border-[#e2e8f0] flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{selectedLawyer.name}</h2>
                  <p className="text-sm text-[#64748b] mt-1">{selectedLawyer.title}</p>
                </div>
                <button onClick={() => setSelectedLawyer(null)} className="text-2xl text-[#64748b] hover:text-[#0f172a]">&times;</button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-2">Score</h3>
                  <div className="flex items-center gap-4 mb-3">
                    {tierBadge(selectedLawyer.tier)}
                    <span className={`text-2xl font-bold ${scoreColor(selectedLawyer.total_score)}`}>{selectedLawyer.total_score}/23</span>
                    <span className="text-xs text-[#64748b]">Confidence: {selectedLawyer.confidence}/12</span>
                  </div>
                  <div className="flex gap-3">
                    {[
                      { label: 'Technical', value: selectedLawyer.tech_wtd, max: 7.67, color: 'bg-[#16a34a]' },
                      { label: 'Experience', value: selectedLawyer.exp_wtd, max: 7.67, color: 'bg-[#2563eb]' },
                      { label: 'Responsiveness', value: selectedLawyer.resp_wtd, max: 7.67, color: 'bg-[#d97706]' },
                    ].map(bar => (
                      <div key={bar.label} className="flex-1">
                        <div className="flex justify-between text-[11px] text-[#64748b] mb-1"><span>{bar.label}</span><span>{Number(bar.value).toFixed(1)}</span></div>
                        <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${Math.min((Number(bar.value) / bar.max) * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-2">Profile</h3>
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
                    <div key={label} className="flex justify-between py-1.5 text-sm">
                      <span className="text-[#64748b]">{label}</span>
                      <span className="font-medium text-right max-w-[60%]">{value}</span>
                    </div>
                  ))}
                </div>

                {selectedLawyer.focus_areas && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-2">Focus Areas</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLawyer.focus_areas.split(/[;,]/).map((area, i) => (
                        <span key={i} className="px-2.5 py-1 bg-[#f1f5f9] rounded-xl text-xs text-[#64748b]">{area.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLawyer.notable_experience && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-2">Notable Experience</h3>
                    <p className="text-sm leading-relaxed">{selectedLawyer.notable_experience}</p>
                  </div>
                )}

                {selectedLawyer.linkedin_url && selectedLawyer.linkedin_url.startsWith('http') && (
                  <a href={selectedLawyer.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a66c2] text-white rounded-lg text-sm font-medium hover:bg-[#004182]">
                    View LinkedIn Profile
                  </a>
                )}

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-2">Scoring Breakdown</h3>
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
                      <div key={label as string} className="flex justify-between py-1 text-[#64748b]">
                        <span>{label}</span>
                        <span className={`font-semibold ${Number(val) > Number(max) ? 'text-red-500' : 'text-[#0f172a]'}`}>{val}/{max}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
