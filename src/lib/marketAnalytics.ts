import { Lawyer, Deal } from './supabase'
import { FirmProfile } from './firmAnalytics'

// ── Supply-Demand Matrix ─────────────────────────────────
export interface SectorSupplyDemand {
  sector: string
  subSectors: SubSectorSupplyDemand[]
  // Aggregated
  lawyerCount: number
  dealCount: number
  t1Count: number
  t2Count: number
  t3Count: number
  avgScore: number
  lawyerDealRatio: number // lawyers per deal (>1 = oversupplied, <1 = undersupplied)
  gapSignal: 'surplus' | 'balanced' | 'gap' | 'severe-gap'
}

export interface SubSectorSupplyDemand {
  name: string
  sector: string
  lawyerCount: number
  dealCount: number
  t1Count: number
  t2Count: number
  t3Count: number
  avgScore: number
  lawyerDealRatio: number
  gapSignal: 'surplus' | 'balanced' | 'gap' | 'severe-gap'
}

function classifyGap(lawyerCount: number, dealCount: number): 'surplus' | 'balanced' | 'gap' | 'severe-gap' {
  if (dealCount === 0) return lawyerCount > 0 ? 'surplus' : 'balanced'
  const ratio = lawyerCount / dealCount
  if (ratio >= 2) return 'surplus'
  if (ratio >= 0.8) return 'balanced'
  if (ratio >= 0.3) return 'gap'
  return 'severe-gap'
}

export function buildSupplyDemandMatrix(
  lawyers: Lawyer[],
  deals: Deal[],
): SectorSupplyDemand[] {
  // Group lawyers by sector and sub-sector
  const sectorMap = new Map<string, {
    lawyers: Lawyer[]
    deals: Deal[]
    subSectors: Map<string, { lawyers: Lawyer[]; deals: Deal[] }>
  }>()

  lawyers.forEach(l => {
    const sName = l.sub_sectors?.sectors?.name || 'Unknown'
    const ssName = l.sub_sectors?.name || 'Unknown'
    if (!sectorMap.has(sName)) sectorMap.set(sName, { lawyers: [], deals: [], subSectors: new Map() })
    const s = sectorMap.get(sName)!
    s.lawyers.push(l)
    if (!s.subSectors.has(ssName)) s.subSectors.set(ssName, { lawyers: [], deals: [] })
    s.subSectors.get(ssName)!.lawyers.push(l)
  })

  deals.forEach(d => {
    const sName = d.sub_sectors?.sectors?.name
    const ssName = d.sub_sectors?.name
    if (sName) {
      if (!sectorMap.has(sName)) sectorMap.set(sName, { lawyers: [], deals: [], subSectors: new Map() })
      const s = sectorMap.get(sName)!
      s.deals.push(d)
      if (ssName) {
        if (!s.subSectors.has(ssName)) s.subSectors.set(ssName, { lawyers: [], deals: [] })
        s.subSectors.get(ssName)!.deals.push(d)
      }
    }
  })

  return Array.from(sectorMap.entries())
    .filter(([name]) => name !== 'Unknown')
    .map(([sector, data]) => {
      const t1 = data.lawyers.filter(l => l.tier === 'T1').length
      const t2 = data.lawyers.filter(l => l.tier === 'T2').length
      const t3 = data.lawyers.filter(l => l.tier === 'T3').length
      const avg = data.lawyers.length > 0
        ? Math.round((data.lawyers.reduce((s, l) => s + l.total_score, 0) / data.lawyers.length) * 10) / 10
        : 0

      const subSectors = Array.from(data.subSectors.entries())
        .filter(([name]) => name !== 'Unknown')
        .map(([ssName, ssData]) => {
          const ssT1 = ssData.lawyers.filter(l => l.tier === 'T1').length
          const ssT2 = ssData.lawyers.filter(l => l.tier === 'T2').length
          const ssT3 = ssData.lawyers.filter(l => l.tier === 'T3').length
          const ssAvg = ssData.lawyers.length > 0
            ? Math.round((ssData.lawyers.reduce((s, l) => s + l.total_score, 0) / ssData.lawyers.length) * 10) / 10
            : 0
          return {
            name: ssName,
            sector,
            lawyerCount: ssData.lawyers.length,
            dealCount: ssData.deals.length,
            t1Count: ssT1,
            t2Count: ssT2,
            t3Count: ssT3,
            avgScore: ssAvg,
            lawyerDealRatio: ssData.deals.length > 0 ? Math.round((ssData.lawyers.length / ssData.deals.length) * 100) / 100 : 0,
            gapSignal: classifyGap(ssData.lawyers.length, ssData.deals.length),
          }
        })
        .sort((a, b) => b.dealCount - a.dealCount)

      return {
        sector,
        subSectors,
        lawyerCount: data.lawyers.length,
        dealCount: data.deals.length,
        t1Count: t1,
        t2Count: t2,
        t3Count: t3,
        avgScore: avg,
        lawyerDealRatio: data.deals.length > 0 ? Math.round((data.lawyers.length / data.deals.length) * 100) / 100 : 0,
        gapSignal: classifyGap(data.lawyers.length, data.deals.length),
      }
    })
    .sort((a, b) => b.dealCount - a.dealCount)
}

// ── Talent Density ───────────────────────────────────────
export interface TalentDensity {
  sector: string
  lawyerCount: number
  dealCount: number
  lawyersPerDeal: number
  concentrationRisk: number // % of lawyers at top 3 firms
  topFirms: { name: string; count: number }[]
  t1Ratio: number // % of lawyers who are T1
  t2Ratio: number
  t3Ratio: number
  avgScore: number
}

export function computeTalentDensity(
  lawyers: Lawyer[],
  deals: Deal[],
): TalentDensity[] {
  const sectorLawyers = new Map<string, Lawyer[]>()
  const sectorDeals = new Map<string, number>()

  lawyers.forEach(l => {
    const s = l.sub_sectors?.sectors?.name
    if (s) {
      if (!sectorLawyers.has(s)) sectorLawyers.set(s, [])
      sectorLawyers.get(s)!.push(l)
    }
  })

  deals.forEach(d => {
    const s = d.sub_sectors?.sectors?.name
    if (s) sectorDeals.set(s, (sectorDeals.get(s) || 0) + 1)
  })

  return Array.from(sectorLawyers.entries()).map(([sector, ls]) => {
    const dc = sectorDeals.get(sector) || 0
    const t1 = ls.filter(l => l.tier === 'T1').length
    const t2 = ls.filter(l => l.tier === 'T2').length
    const t3 = ls.filter(l => l.tier === 'T3').length

    // Firm concentration
    const firmCounts = new Map<string, number>()
    ls.forEach(l => {
      const fn = l.firms?.name || 'Unknown'
      firmCounts.set(fn, (firmCounts.get(fn) || 0) + 1)
    })
    const sortedFirms = Array.from(firmCounts.entries())
      .sort((a, b) => b[1] - a[1])
    const top3Count = sortedFirms.slice(0, 3).reduce((s, [, c]) => s + c, 0)

    return {
      sector,
      lawyerCount: ls.length,
      dealCount: dc,
      lawyersPerDeal: dc > 0 ? Math.round((ls.length / dc) * 100) / 100 : 0,
      concentrationRisk: ls.length > 0 ? Math.round((top3Count / ls.length) * 100) : 0,
      topFirms: sortedFirms.slice(0, 5).map(([name, count]) => ({ name, count })),
      t1Ratio: ls.length > 0 ? Math.round((t1 / ls.length) * 100) : 0,
      t2Ratio: ls.length > 0 ? Math.round((t2 / ls.length) * 100) : 0,
      t3Ratio: ls.length > 0 ? Math.round((t3 / ls.length) * 100) : 0,
      avgScore: ls.length > 0 ? Math.round((ls.reduce((s, l) => s + l.total_score, 0) / ls.length) * 10) / 10 : 0,
    }
  }).sort((a, b) => b.dealCount - a.dealCount)
}

// ── Market Insight Cards ─────────────────────────────────
export interface MarketInsight {
  id: string
  type: 'gap' | 'concentration' | 'declining' | 'jurisdiction' | 'opportunity'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  metric: string
  sector?: string
  subSector?: string
  firmName?: string
}

export function generateMarketInsights(
  lawyers: Lawyer[],
  deals: Deal[],
  firmProfiles: FirmProfile[],
): MarketInsight[] {
  const insights: MarketInsight[] = []
  let id = 0

  // 1. Sectors with high deal activity but low T1 coverage
  const sectorStats = new Map<string, { lawyers: number; deals: number; t1: number }>()
  lawyers.forEach(l => {
    const s = l.sub_sectors?.sectors?.name
    if (s) {
      if (!sectorStats.has(s)) sectorStats.set(s, { lawyers: 0, deals: 0, t1: 0 })
      sectorStats.get(s)!.lawyers++
      if (l.tier === 'T1') sectorStats.get(s)!.t1++
    }
  })
  deals.forEach(d => {
    const s = d.sub_sectors?.sectors?.name
    if (s) {
      if (!sectorStats.has(s)) sectorStats.set(s, { lawyers: 0, deals: 0, t1: 0 })
      sectorStats.get(s)!.deals++
    }
  })

  sectorStats.forEach((stats, sector) => {
    const t1Pct = stats.lawyers > 0 ? (stats.t1 / stats.lawyers) * 100 : 0
    if (stats.deals >= 20 && t1Pct < 15) {
      insights.push({
        id: String(id++),
        type: 'gap',
        severity: t1Pct < 8 ? 'high' : 'medium',
        title: `Low T1 coverage in ${sector}`,
        description: `${sector} has ${stats.deals} deals but only ${Math.round(t1Pct)}% T1 lawyers. High-value placement opportunities likely underserved.`,
        metric: `${stats.t1} T1 / ${stats.lawyers} total (${Math.round(t1Pct)}%)`,
        sector,
      })
    }
  })

  // 2. Firms losing deal share (declining deal count YoY)
  firmProfiles.forEach(fp => {
    if (fp.dealsByYear.length >= 2) {
      const sorted = [...fp.dealsByYear].sort((a, b) => b.year - a.year)
      const latest = sorted[0]
      const previous = sorted[1]
      if (previous.count >= 5 && latest.count < previous.count * 0.5) {
        insights.push({
          id: String(id++),
          type: 'declining',
          severity: latest.count < previous.count * 0.3 ? 'high' : 'medium',
          title: `${fp.name} deal activity declining`,
          description: `Deal count dropped from ${previous.count} (${previous.year}) to ${latest.count} (${latest.year}). Potential talent retention risk or strategic shift.`,
          metric: `${previous.count} → ${latest.count} deals`,
          firmName: fp.name,
        })
      }
    }
  })

  // 3. Sub-sectors concentrated at a single firm
  const ssConcentration = new Map<string, { sector: string; firms: Map<string, number>; total: number }>()
  lawyers.forEach(l => {
    const ss = l.sub_sectors?.name
    const s = l.sub_sectors?.sectors?.name
    const fn = l.firms?.name
    if (ss && s && fn) {
      if (!ssConcentration.has(ss)) ssConcentration.set(ss, { sector: s, firms: new Map(), total: 0 })
      const data = ssConcentration.get(ss)!
      data.total++
      data.firms.set(fn, (data.firms.get(fn) || 0) + 1)
    }
  })

  ssConcentration.forEach((data, subSector) => {
    if (data.total >= 5) {
      const sorted = Array.from(data.firms.entries()).sort((a, b) => b[1] - a[1])
      const topFirmPct = (sorted[0][1] / data.total) * 100
      if (topFirmPct >= 60) {
        insights.push({
          id: String(id++),
          type: 'concentration',
          severity: topFirmPct >= 80 ? 'high' : 'medium',
          title: `${subSector} heavily concentrated`,
          description: `${Math.round(topFirmPct)}% of ${subSector} lawyers are at ${sorted[0][0]}. Single-firm dependency creates placement risk.`,
          metric: `${sorted[0][1]}/${data.total} at ${sorted[0][0]}`,
          sector: data.sector,
          subSector,
          firmName: sorted[0][0],
        })
      }
    }
  })

  // 4. Jurisdictions where demand exceeds qualified supply
  const jurDemand = new Map<string, number>()
  const jurSupply = new Map<string, number>()

  deals.forEach(d => {
    if (d.location_keywords) {
      d.location_keywords.split(',').forEach(loc => {
        const trimmed = loc.trim()
        if (trimmed) jurDemand.set(trimmed, (jurDemand.get(trimmed) || 0) + 1)
      })
    }
  })

  lawyers.forEach(l => {
    if (l.qual_jurisdiction) {
      l.qual_jurisdiction.split(/[;,\/]/).forEach(j => {
        const trimmed = j.trim()
        if (trimmed && trimmed !== 'N/A') jurSupply.set(trimmed, (jurSupply.get(trimmed) || 0) + 1)
      })
    }
  })

  // 5. Sectors with talent gap (more deals than lawyers)
  sectorStats.forEach((stats, sector) => {
    if (stats.deals > stats.lawyers && stats.deals >= 15) {
      insights.push({
        id: String(id++),
        type: 'opportunity',
        severity: stats.deals > stats.lawyers * 2 ? 'high' : 'medium',
        title: `Talent gap in ${sector}`,
        description: `${sector} has ${stats.deals} deals but only ${stats.lawyers} mapped lawyers. Demand significantly outstrips supply coverage.`,
        metric: `${stats.lawyers} lawyers / ${stats.deals} deals (${(stats.lawyers / stats.deals).toFixed(1)} ratio)`,
        sector,
      })
    }
  })

  // Sort: high severity first, then by type
  const severityOrder = { high: 0, medium: 1, low: 2 }
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return insights
}

// ── Gap signal styling helpers ───────────────────────────
export function gapSignalStyle(signal: string): { bg: string; text: string; label: string } {
  switch (signal) {
    case 'severe-gap': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Severe Gap' }
    case 'gap': return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Talent Gap' }
    case 'balanced': return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Balanced' }
    case 'surplus': return { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Surplus' }
    default: return { bg: 'bg-gray-50', text: 'text-gray-600', label: '—' }
  }
}

export function insightTypeStyle(type: string): { bg: string; text: string; icon: string } {
  switch (type) {
    case 'gap': return { bg: 'bg-red-50', text: 'text-red-600', icon: '⚠' }
    case 'concentration': return { bg: 'bg-amber-50', text: 'text-amber-600', icon: '◉' }
    case 'declining': return { bg: 'bg-orange-50', text: 'text-orange-600', icon: '↘' }
    case 'jurisdiction': return { bg: 'bg-violet-50', text: 'text-violet-600', icon: '⚖' }
    case 'opportunity': return { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: '★' }
    default: return { bg: 'bg-gray-50', text: 'text-gray-600', icon: '•' }
  }
}

export function severityStyle(severity: string): { bg: string; text: string } {
  switch (severity) {
    case 'high': return { bg: 'bg-red-100', text: 'text-red-700' }
    case 'medium': return { bg: 'bg-amber-100', text: 'text-amber-700' }
    case 'low': return { bg: 'bg-blue-100', text: 'text-blue-700' }
    default: return { bg: 'bg-gray-100', text: 'text-gray-600' }
  }
}
