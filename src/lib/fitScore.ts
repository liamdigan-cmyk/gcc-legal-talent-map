import { Lawyer, Deal } from './supabase'

// ── Mandate Types ──────────────────────────────────────
export interface Mandate {
  id: string
  title: string
  // Step 1: Role basics
  sector: string
  subSector: string
  seniority: string // 'Partner' | 'Senior Associate' | 'Associate' | 'Counsel' | ''
  // Step 2: Requirements
  specialisms: string[]
  jurisdictions: string[]
  location: string
  // Step 3: Preferences
  firmType: string // 'International' | 'Regional' | 'Boutique' | 'In-house' | ''
  languages: string[]
  minDealCount: number
  createdAt: string
}

export function createEmptyMandate(): Mandate {
  return {
    id: crypto.randomUUID(),
    title: '',
    sector: '',
    subSector: '',
    seniority: '',
    specialisms: [],
    jurisdictions: [],
    location: '',
    firmType: '',
    languages: [],
    minDealCount: 0,
    createdAt: new Date().toISOString(),
  }
}

// ── Fit Score Computation ──────────────────────────────
// Returns 0-100 fit score per lawyer per mandate

export interface FitScoreBreakdown {
  total: number  // 0-100
  sectorMatch: number
  specialismOverlap: number
  jurisdictionFit: number
  locationProximity: number
  seniorityAlignment: number
  firmTypeMatch: number
  languageCapability: number
  qualityBaseline: number
  tier: 'Strong' | 'Good' | 'Partial' | 'Weak'
}

// ── Weights ──────────────────────────────────────────
const WEIGHTS = {
  sectorMatch: 0.25,
  specialismOverlap: 0.20,
  jurisdictionFit: 0.15,
  locationProximity: 0.10,
  seniorityAlignment: 0.10,
  firmTypeMatch: 0.05,
  languageCapability: 0.05,
  qualityBaseline: 0.10,
}

// ── Adjacent sector mapping ──────────────────────────
const ADJACENT_SECTORS: Record<string, string[]> = {
  'Real Estate': ['Financial Services', 'Energy & Infrastructure'],
  'Financial Services': ['Real Estate', 'Technology & Telecoms'],
  'Energy & Infrastructure': ['Real Estate', 'Industrials'],
  'Consumer & Hospitality': ['Healthcare & Life Sciences', 'Real Estate'],
  'Healthcare & Life Sciences': ['Consumer & Hospitality', 'Technology & Telecoms'],
  'Technology & Telecoms': ['Financial Services', 'Healthcare & Life Sciences'],
  'Industrials': ['Energy & Infrastructure', 'Technology & Telecoms'],
  'UAE Nationals': [],
}

// ── GCC region cities ──────────────────────────────────
const CITY_COUNTRY: Record<string, string> = {
  'Dubai': 'UAE', 'Abu Dhabi': 'UAE', 'Sharjah': 'UAE', 'Ras Al Khaimah': 'UAE',
  'Riyadh': 'Saudi Arabia', 'Jeddah': 'Saudi Arabia', 'KAFD': 'Saudi Arabia', 'NEOM': 'Saudi Arabia',
  'Doha': 'Qatar', 'Manama': 'Bahrain', 'Kuwait City': 'Kuwait', 'Muscat': 'Oman',
  'Cairo': 'Egypt', 'Amman': 'Jordan', 'Beirut': 'Lebanon',
}

const COUNTRY_REGION: Record<string, string> = {
  'UAE': 'GCC', 'Saudi Arabia': 'GCC', 'Qatar': 'GCC', 'Bahrain': 'GCC',
  'Kuwait': 'GCC', 'Oman': 'GCC', 'Egypt': 'MENA', 'Jordan': 'MENA',
  'Lebanon': 'MENA',
}

function getCountryForCity(city: string): string {
  for (const [c, country] of Object.entries(CITY_COUNTRY)) {
    if (city.toLowerCase().includes(c.toLowerCase())) return country
  }
  return ''
}

function getRegionForCity(city: string): string {
  const country = getCountryForCity(city)
  return COUNTRY_REGION[country] || ''
}

// ── PQE band to seniority inference ──────────────────
function inferSeniority(pqeBand: string | null, title: string | null): string {
  if (title) {
    const t = title.toLowerCase()
    // Order matters: check most specific patterns first
    if (t.includes('managing partner') || t.includes('senior partner') || t.includes('equity partner')) return 'Partner'
    if (t.includes('managing associate')) return 'Senior Associate' // not Partner
    if (t.includes('partner') || t.includes('head of') || t.includes('managing director')) return 'Partner'
    if (t.includes('senior associate') || t.includes('senior counsel')) return 'Senior Associate'
    if (t.includes('general counsel') || t.includes('counsel') || t.includes('of counsel')) return 'Counsel'
    if (t.includes('associate')) return 'Associate'
  }
  if (!pqeBand) return ''
  const pqe = pqeBand.toLowerCase()
  if (pqe.includes('15+') || pqe.includes('20+') || pqe.includes('10-15') || pqe.includes('15-20')) return 'Partner'
  if (pqe.includes('7-10') || pqe.includes('8-10') || pqe.includes('5-7')) return 'Senior Associate'
  if (pqe.includes('3-5') || pqe.includes('2-4')) return 'Associate'
  return ''
}

// ── Jaccard-like overlap for keyword lists ────────────
function keywordOverlap(required: string[], available: string[]): number {
  if (required.length === 0) return 1 // no requirement = full match
  const normalizedRequired = required.map(s => s.toLowerCase().trim())
  const normalizedAvailable = available.map(s => s.toLowerCase().trim())
  let matches = 0
  for (const req of normalizedRequired) {
    if (normalizedAvailable.some(a => a.includes(req) || req.includes(a))) {
      matches++
    }
  }
  return normalizedRequired.length > 0 ? matches / normalizedRequired.length : 0
}

// ── Main scoring function ─────────────────────────────
export function computeFitScore(
  lawyer: Lawyer,
  mandate: Mandate,
  firmDealsMap: Map<string, Deal[]>,
): FitScoreBreakdown {
  // 1. Sector Match (25%)
  let sectorMatch = 0
  const lawyerSector = lawyer.sub_sectors?.sectors?.name || ''
  const lawyerSubSector = lawyer.sub_sectors?.name || ''
  if (mandate.sector) {
    if (!lawyerSector) {
      sectorMatch = 0.3 // missing data — don't penalize as harshly as wrong sector
    } else if (lawyerSector === mandate.sector) {
      sectorMatch = mandate.subSector
        ? (lawyerSubSector === mandate.subSector ? 1.0 : 0.8)
        : 1.0
    } else if (ADJACENT_SECTORS[mandate.sector]?.includes(lawyerSector)) {
      sectorMatch = 0.5
    }
  } else {
    sectorMatch = 1.0  // no sector requirement = full match
  }

  // 2. Specialism Overlap (20%)
  let specialismOverlap = 1.0
  if (mandate.specialisms.length > 0) {
    const lawyerFocusAreas = lawyer.focus_areas
      ? lawyer.focus_areas.split(/[;,]/).map(s => s.trim()).filter(Boolean)
      : []
    // Also extract keywords from deal exposure
    const dealKeywords: string[] = []
    if (lawyer.firm_id) {
      const firmDeals = firmDealsMap.get(lawyer.firm_id) || []
      firmDeals.forEach(d => {
        if (d.deal_type) d.deal_type.split(',').forEach(k => dealKeywords.push(k.trim()))
        if (d.legal_specialism_keywords) d.legal_specialism_keywords.split(',').forEach(k => dealKeywords.push(k.trim()))
        if (d.transaction_keywords) d.transaction_keywords.split(',').forEach(k => dealKeywords.push(k.trim()))
      })
    }
    const allLawyerKeywords = [...lawyerFocusAreas, ...dealKeywords]
    specialismOverlap = keywordOverlap(mandate.specialisms, allLawyerKeywords)
  }

  // 3. Jurisdiction Fit (15%)
  let jurisdictionFit = 1.0
  if (mandate.jurisdictions.length > 0) {
    if (lawyer.qual_jurisdiction) {
      const lawyerJurs = lawyer.qual_jurisdiction.split(/[;,\/]/).map(j => j.trim().toLowerCase())
      const mandateJurs = mandate.jurisdictions.map(j => j.toLowerCase())
      const matches = mandateJurs.filter(mj => lawyerJurs.some(lj => lj.includes(mj) || mj.includes(lj)))
      jurisdictionFit = matches.length / mandateJurs.length
    } else {
      jurisdictionFit = 0
    }
  }

  // 4. Location Proximity (10%)
  let locationProximity = 1.0
  if (mandate.location && lawyer.location) {
    const mandateCity = mandate.location
    const lawyerCity = lawyer.location
    if (lawyerCity.toLowerCase().includes(mandateCity.toLowerCase()) || mandateCity.toLowerCase().includes(lawyerCity.toLowerCase())) {
      locationProximity = 1.0
    } else if (getCountryForCity(lawyerCity) === getCountryForCity(mandateCity) && getCountryForCity(mandateCity) !== '') {
      locationProximity = 0.7
    } else if (getRegionForCity(lawyerCity) === getRegionForCity(mandateCity) && getRegionForCity(mandateCity) !== '') {
      locationProximity = 0.4
    } else {
      locationProximity = 0.1
    }
  } else if (mandate.location && !lawyer.location) {
    locationProximity = 0.3 // unknown, slight penalty
  }

  // 5. Seniority Alignment (10%)
  let seniorityAlignment = 1.0
  if (mandate.seniority) {
    const lawyerSeniority = inferSeniority(lawyer.pqe_band, lawyer.title)
    if (lawyerSeniority === mandate.seniority) {
      seniorityAlignment = 1.0
    } else if (
      (mandate.seniority === 'Partner' && lawyerSeniority === 'Senior Associate') ||
      (mandate.seniority === 'Senior Associate' && (lawyerSeniority === 'Partner' || lawyerSeniority === 'Associate')) ||
      (mandate.seniority === 'Associate' && lawyerSeniority === 'Senior Associate') ||
      (mandate.seniority === 'Counsel' && (lawyerSeniority === 'Senior Associate' || lawyerSeniority === 'Partner'))
    ) {
      seniorityAlignment = 0.5
    } else if (lawyerSeniority === '') {
      seniorityAlignment = 0.4 // unknown
    } else {
      seniorityAlignment = 0.1
    }
  }

  // 6. Firm Type Match (5%)
  let firmTypeMatch = 1.0
  if (mandate.firmType) {
    const lawyerFirmType = lawyer.company_type_label || ''
    if (lawyerFirmType.toLowerCase().includes(mandate.firmType.toLowerCase())) {
      firmTypeMatch = 1.0
    } else if (!lawyerFirmType || lawyerFirmType === '—') {
      firmTypeMatch = 0.4
    } else {
      firmTypeMatch = 0.2
    }
  }

  // 7. Language Capability (5%)
  let languageCapability = 1.0
  if (mandate.languages.length > 0) {
    if (lawyer.languages) {
      const lawyerLangs = lawyer.languages.split(',').map(l => l.trim().toLowerCase())
      const matches = mandate.languages.filter(ml => lawyerLangs.some(ll => ll.includes(ml.toLowerCase())))
      languageCapability = matches.length / mandate.languages.length
    } else {
      languageCapability = 0
    }
  }

  // 8. Quality Baseline (10%) — normalized total_score
  const qualityBaseline = Math.min(lawyer.total_score / 23, 1)

  // ── Compute weighted total ──────────────────────────
  const total = Math.round(
    (sectorMatch * WEIGHTS.sectorMatch +
     specialismOverlap * WEIGHTS.specialismOverlap +
     jurisdictionFit * WEIGHTS.jurisdictionFit +
     locationProximity * WEIGHTS.locationProximity +
     seniorityAlignment * WEIGHTS.seniorityAlignment +
     firmTypeMatch * WEIGHTS.firmTypeMatch +
     languageCapability * WEIGHTS.languageCapability +
     qualityBaseline * WEIGHTS.qualityBaseline) * 100
  )

  const tier: FitScoreBreakdown['tier'] =
    total >= 75 ? 'Strong' :
    total >= 50 ? 'Good' :
    total >= 25 ? 'Partial' : 'Weak'

  return {
    total,
    sectorMatch: Math.round(sectorMatch * 100),
    specialismOverlap: Math.round(specialismOverlap * 100),
    jurisdictionFit: Math.round(jurisdictionFit * 100),
    locationProximity: Math.round(locationProximity * 100),
    seniorityAlignment: Math.round(seniorityAlignment * 100),
    firmTypeMatch: Math.round(firmTypeMatch * 100),
    languageCapability: Math.round(languageCapability * 100),
    qualityBaseline: Math.round(qualityBaseline * 100),
    tier,
  }
}

// ── Batch computation (for all lawyers) ───────────────
export function computeAllFitScores(
  lawyers: Lawyer[],
  mandate: Mandate,
  firmDealsMap: Map<string, Deal[]>,
): Map<string, FitScoreBreakdown> {
  const results = new Map<string, FitScoreBreakdown>()
  for (const lawyer of lawyers) {
    results.set(lawyer.id, computeFitScore(lawyer, mandate, firmDealsMap))
  }
  return results
}

// ── LocalStorage persistence ──────────────────────────
const MANDATES_KEY = 'gcc_talent_mandates'
const ACTIVE_MANDATE_KEY = 'gcc_talent_active_mandate'

export function saveMandates(mandates: Mandate[]) {
  try { localStorage.setItem(MANDATES_KEY, JSON.stringify(mandates)) } catch {}
}

export function loadMandates(): Mandate[] {
  try {
    const raw = localStorage.getItem(MANDATES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveActiveMandate(mandate: Mandate | null) {
  try {
    if (mandate) localStorage.setItem(ACTIVE_MANDATE_KEY, JSON.stringify(mandate))
    else localStorage.removeItem(ACTIVE_MANDATE_KEY)
  } catch {}
}

export function loadActiveMandate(): Mandate | null {
  try {
    const raw = localStorage.getItem(ACTIVE_MANDATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
