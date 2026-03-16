import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Lawyer {
  id: string
  name: string
  title: string | null
  firm_id: string | null
  company_type_label: string | null
  sub_sector_id: string | null
  location: string | null
  focus_areas: string | null
  pqe_band: string | null
  notable_experience: string | null
  linkedin_url: string | null
  connection_degree: number | null
  // Scoring
  f1_company_quality: number
  f2_role_tenure: number
  f3_stability: number
  f4_education: number
  f5_deal_exposure: number
  f6_specialisation: number
  f7_multi_jurisd: number
  f8_li_freshness: number
  f9_li_activity: number
  f10_firm_health: number
  f11_career_stall: number
  // Computed
  tech_raw: number
  exp_raw: number
  resp_raw: number
  tech_wtd: number
  exp_wtd: number
  resp_wtd: number
  total_score: number
  tier: string
  confidence: number
  // Enrichment
  languages: string | null
  qual_jurisdiction: string | null
  qual_year: number | null
  enrichment_status: string
  is_starred: boolean
  tags: string[] | null
  // Relations
  firms?: { name: string; type: string | null }
  sub_sectors?: { name: string; sectors: { name: string } }
}

export interface Deal {
  id: string
  description: string
  firm_name: string | null
  firm_id: string | null
  client_name: string | null
  client_type_keywords: string | null
  deal_type: string | null
  transaction_keywords: string | null
  asset_class_keywords: string | null
  deal_value: string | null
  year: number | null
  location_keywords: string | null
  legal_specialism_keywords: string | null
  source_url: string | null
  source_type: string | null
  confidence: string | null
  sub_sector_id: string | null
  sub_sectors?: { name: string; sectors: { name: string } }
}

export interface Sector {
  id: string
  name: string
  display_order: number
  sub_sectors: SubSector[]
}

export interface SubSector {
  id: string
  name: string
  sector_id: string
  display_order: number
}

export interface Firm {
  id: string
  name: string
  type: string | null
  quality_tier: number | null
  health_score: number | null
}
