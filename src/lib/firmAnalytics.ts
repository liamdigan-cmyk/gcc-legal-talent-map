import { Lawyer, Deal, Firm } from './supabase'

// ── Enriched Firm with aggregated data ──────────────────
export interface FirmProfile {
  id: string
  name: string
  type: string | null
  qualityTier: number | null
  healthScore: number | null
  // Aggregated
  lawyerCount: number
  dealCount: number
  t1Count: number
  t2Count: number
  t3Count: number
  avgScore: number
  topSectors: { name: string; count: number }[]
  lawyers: Lawyer[]
  deals: Deal[]
  // Derived
  sectorCoverage: number // unique sectors count
  dealsByYear: { year: number; count: number }[]
}

export function buildFirmProfiles(
  firms: Firm[],
  lawyers: Lawyer[],
  deals: Deal[],
  firmDealsMap: Map<string, Deal[]>,
  firmLawyersMap: Map<string, Lawyer[]>,
): FirmProfile[] {
  return firms
    .filter(f => f.name && !f.name.startsWith('http') && !f.name.includes('linkedin.com'))
    .map(f => {
      const fLawyers = firmLawyersMap.get(f.id) || []
      const fDeals = firmDealsMap.get(f.id) || []

      // Tier counts
      let t1 = 0, t2 = 0, t3 = 0
      let scoreSum = 0
      fLawyers.forEach(l => {
        if (l.tier === 'T1') t1++
        else if (l.tier === 'T2') t2++
        else t3++
        scoreSum += l.total_score
      })

      // Top sectors
      const sectorMap = new Map<string, number>()
      fLawyers.forEach(l => {
        const s = l.sub_sectors?.sectors?.name
        if (s) sectorMap.set(s, (sectorMap.get(s) || 0) + 1)
      })
      const topSectors = Array.from(sectorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))

      // Deals by year
      const yearMap = new Map<number, number>()
      fDeals.forEach(d => {
        if (d.year) yearMap.set(d.year, (yearMap.get(d.year) || 0) + 1)
      })
      const dealsByYear = Array.from(yearMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([year, count]) => ({ year, count }))

      return {
        id: f.id,
        name: f.name,
        type: f.type,
        qualityTier: f.quality_tier,
        healthScore: f.health_score,
        lawyerCount: fLawyers.length,
        dealCount: fDeals.length,
        t1Count: t1,
        t2Count: t2,
        t3Count: t3,
        avgScore: fLawyers.length > 0 ? Math.round((scoreSum / fLawyers.length) * 10) / 10 : 0,
        topSectors,
        lawyers: fLawyers.sort((a, b) => b.total_score - a.total_score),
        deals: fDeals.sort((a, b) => (b.year || 0) - (a.year || 0)),
        sectorCoverage: sectorMap.size,
        dealsByYear,
      }
    })
    .filter(f => f.lawyerCount > 0 || f.dealCount > 0) // only firms with data
    .sort((a, b) => b.lawyerCount - a.lawyerCount)
}

// ── Firm health score label ──────────────────────────
export function healthLabel(score: number | null): { text: string; color: string } {
  if (score === null || score === undefined) return { text: '—', color: 'text-[#94a3b8]' }
  if (score >= 8) return { text: 'Strong', color: 'text-emerald-600' }
  if (score >= 5) return { text: 'Moderate', color: 'text-blue-600' }
  if (score >= 3) return { text: 'At Risk', color: 'text-amber-600' }
  return { text: 'Weak', color: 'text-red-500' }
}

// ── Quality tier label ──────────────────────────
export function tierLabel(tier: number | null): { text: string; bg: string; textColor: string } {
  if (tier === null || tier === undefined) return { text: '—', bg: 'bg-slate-50', textColor: 'text-slate-400' }
  if (tier === 1) return { text: 'Tier 1', bg: 'bg-emerald-50', textColor: 'text-emerald-700' }
  if (tier === 2) return { text: 'Tier 2', bg: 'bg-blue-50', textColor: 'text-blue-700' }
  if (tier === 3) return { text: 'Tier 3', bg: 'bg-amber-50', textColor: 'text-amber-700' }
  return { text: `Tier ${tier}`, bg: 'bg-slate-50', textColor: 'text-slate-500' }
}

// ── Competitive rank within type ──────────────────────
export function rankFirmsByType(profiles: FirmProfile[]): Map<string, FirmProfile[]> {
  const byType = new Map<string, FirmProfile[]>()
  profiles.forEach(f => {
    const type = f.type || 'Unknown'
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type)!.push(f)
  })
  byType.forEach((firms) => {
    firms.sort((a, b) => b.dealCount - a.dealCount || b.avgScore - a.avgScore)
  })
  return byType
}
