# GCC Legal Talent Map — Design & Functionality Handoff Briefing

## What This Is

A Next.js dashboard deployed on Vercel that visualizes a legal talent database of 2,434 lawyers and 898 deals across 8 sectors in the GCC region. It's a recruitment intelligence tool — the user (Liam, 500.co) uses it to find, filter, score, and shortlist lawyers.

**Live URL:** https://gcc-talent-map.vercel.app
**Repo:** https://github.com/liamdigan-cmyk/gcc-legal-talent-map
**Vercel team:** team_OrvMohxogOLqqJzswigcJfB2
**Vercel project:** gcc-talent-map (prj_ZVgDcXwXpFN2lKOJABPDbuZDTf21)

---

## Tech Stack

- **Framework:** Next.js 16.1.6 (Turbopack), React 19, TypeScript
- **Styling:** Tailwind CSS v4 (utility classes only, no config file)
- **Backend:** Supabase (PostgreSQL) — project ID: `vmosplvjtbyyolbolkve`
- **Hosting:** Vercel (auto-deploys from GitHub main branch)
- **Font:** Inter (Google Fonts CDN)
- **Architecture:** Single-page `'use client'` app — everything lives in `src/app/page.tsx` (~1,215 lines)

### Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Entire dashboard UI — all tabs, filters, tables, drawer |
| `src/app/layout.tsx` | Root layout, font import, body styles |
| `src/app/globals.css` | Tailwind base import |
| `src/lib/supabase.ts` | Supabase client + TypeScript interfaces (Lawyer, Deal, Sector, SubSector, Firm) |
| `vercel.json` | Framework detection fix (`{"framework": "nextjs"}`) |
| `.env.local` | Supabase URL + anon key (also set in Vercel env vars) |

### Env Vars (set in Vercel dashboard)

```
NEXT_PUBLIC_SUPABASE_URL=https://vmosplvjtbyyolbolkve.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtb3NwbHZqdGJ5eW9sYm9sa3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTU5MTcsImV4cCI6MjA2ODA3MTkxN30.ePUMM2t-YMfgNPUIGdmLwFxsP2H0V1WM03bAKNHEzV0
```

---

## Database Schema (Supabase)

### Tables

**lawyers** (2,434 rows) — core talent records
- Identity: `id`, `name`, `title`, `linkedin_url`
- Org: `firm_id` → firms, `sub_sector_id` → sub_sectors, `company_type_label`, `location`
- Enrichment: `focus_areas`, `languages`, `qual_jurisdiction`, `qual_year`, `pqe_band`, `notable_experience`
- Scoring (12 fields): `f1_company_quality` through `f11_career_stall` + computed `tech_wtd`, `exp_wtd`, `resp_wtd`, `total_score` (0–23), `tier` (T1/T2/T3), `confidence` (0–12)
- Meta: `connection_degree`, `enrichment_status`, `is_starred`, `tags`

**deals** (898 rows) — deal/transaction records
- `description`, `firm_name`, `firm_id`, `client_name`, `deal_type`, `deal_value`, `year`
- `asset_class_keywords`, `legal_specialism_keywords`, `transaction_keywords`
- `confidence` (High/Medium), `sub_sector_id` → sub_sectors

**sectors** (8 rows) — Real Estate, Financial Services, Energy & Infrastructure, Consumer & Hospitality, Healthcare & Life Sciences, Technology & Telecoms, Industrials, UAE Nationals

**sub_sectors** (29 rows) — linked to sectors via `sector_id`

**firms** (653 rows) — `name`, `type`, `quality_tier`, `health_score`

### Sector Distribution

| Sector | Lawyers | Deals |
|--------|---------|-------|
| Real Estate | 209 | 207 |
| Financial Services | 656 | 188 |
| Energy & Infrastructure | 561 | 162 |
| Consumer & Hospitality | 403 | 54 |
| Healthcare & Life Sciences | 153 | 64 |
| Technology & Telecoms | 262 | 56 |
| Industrials | 83 | 167 |
| UAE Nationals | 107 | 0 |

### Tier System

- **T1:** total_score >= 18 (top talent)
- **T2:** total_score >= 12
- **T3:** total_score < 12

### Data Quality Notes (cleaned in this session)

- **Locations** normalized to 10 clean values: Dubai, Abu Dhabi, UAE, Sharjah, Al Ain, Ras Al Khaimah, Ajman, Saudi Arabia, Bahrain, Oman (previously had ~50 dirty variants including job titles)
- **Jurisdictions** cleaned: 31 distinct values. Multi-qualified lawyers stored as comma/semicolon-separated (e.g., "Ireland; England & Wales"). Non-qualified entries set to "N/A"
- **Languages** cleaned: no more "4 additional (see profile)" or "+ X more" entries

---

## Current UI Structure (4 tabs)

### 1. Dashboard Tab
- 6 KPI cards (Total Lawyers, T1/T2/T3 counts, Total Deals, Avg Score)
- Lawyers by Sector horizontal bar chart
- Tier Distribution stacked bar chart
- Top 20 Lawyers by Score table

### 2. Lawyers Tab
- Sector tabs across top (All, Real Estate, Financial Services, etc.)
- Filter bar: search, tier, sub-sector, company type, location, jurisdiction (multi-select), qual year (multi-select), language, connection degree, confidence
- Filter pills showing active filters
- Full scrollable table (no pagination — all results shown) with columns: Star, LinkedIn, Tier, Score (hover shows Tech/Exp/Resp breakdown), Name+Title, Company, Sector (colored bubble), Location, Focus Areas (tags), Qual Jurisdiction (colored bubble), Qual Year (colored bubble), Connection, Confidence
- Click row → opens lawyer detail drawer

### 3. Deals Tab
- Sector tabs
- KPI cards (total, high/medium confidence, linked to mapping, with value)
- Filter bar: search, firm, type, asset class, specialism, year, confidence
- Full table: Description, Firm, Client, Type, Asset, Value, Year, Specialism, Confidence

### 4. Enrichment Tab
- KPI cards (total, fully enriched, needs enrichment, with LinkedIn, avg fill rate)
- Fill rate bars per field (LinkedIn, Focus Areas, Languages, Qual Jurisdiction, Qual Year, Notable Exp, Location, PQE Band, Connection)
- By-sector enrichment breakdown table
- Least enriched lawyers table (bottom 20)

### Lawyer Detail Drawer (slide-in from right)
- Score display with tier badge and Tech/Exp/Resp bar charts
- Profile fields (Company, Type, Sector, Location, PQE, Connection, Languages, Qualification)
- Focus areas as tags
- Notable experience text
- LinkedIn profile button
- Full 11-field scoring breakdown

---

## Current Design System

- **Background:** `#f8fafc` (slate-50)
- **Cards:** white with `border-[#e2e8f0]`, `rounded-2xl`, `shadow-sm`
- **Text primary:** `#0f172a` (slate-900)
- **Text secondary:** `#64748b` (slate-500)
- **Text muted:** `#94a3b8` (slate-400)
- **Borders:** `#e2e8f0` (slate-200)
- **Subtle bg:** `#f1f5f9` (slate-100)
- **Tooltips:** `#1e293b` (slate-800)
- **Font:** Inter 300–700
- **Tier colors:** T1 green (#16a34a), T2 blue (#2563eb), T3 amber (#d97706)
- **Sector colors:** Real Estate=emerald, Financial Services=blue, Energy=amber, Consumer=pink, Healthcare=violet, Tech=cyan, Industrials=orange, UAE Nationals=red
- **Jurisdiction colors:** per-country color mapping (E&W=red, Egypt=amber, UAE=emerald, India=orange, etc.)

---

## Key Components/Patterns in page.tsx

- `MultiSelect` — custom dropdown component for jurisdiction and qual year filters (checkbox-based multi-select with "clear all")
- `SECTOR_COLORS` / `JURISDICTION_COLORS` — color maps for bubbles
- `getJurColor()` — partial match color lookup for jurisdictions
- `fetchAllLawyers()` — paginated Supabase fetch (batches of 1000) to bypass default row limit
- `getFirmName()` — sanitizes firm names (filters out URLs stored as names)
- `tierBadge()` / `scoreColor()` / `confColor()` — display helpers
- CSV export for filtered list and starred shortlist

---

## Deployment Workflow

1. Edit files locally (the repo is at `mnt/AI Recruitment Intelligence/gcc-legal-talent-map/`)
2. Liam pushes from his local machine: `git add -A && git commit -m "msg" && git push`
3. Vercel auto-deploys from main branch
4. No CI/CD pipeline beyond Vercel's built-in build

**Important:** The sandbox VM cannot push to GitHub — no credentials. Liam pushes manually.

---

## Known Issues / Limitations

1. **Single-file architecture** — page.tsx is 1,215 lines and growing. Consider breaking into components.
2. **No virtualization** — rendering 2,434 rows at once (pagination removed per user request). May need virtual scrolling if performance suffers.
3. **Client-side only** — all data fetched on mount, all filtering in-browser. No server-side filtering.
4. **No auth** — dashboard is publicly accessible.
5. **No dark mode.**
6. **Drawer is basic** — no edit capability, no deal history for a lawyer.
7. **No responsive/mobile design** — built for desktop use.
8. **3 duplicate Vercel projects may still exist** (gcc-legal-talent-map, gcc-legal-dashboard, legal-bible) — user was asked to delete them manually.

---

## What Liam Wants Next

Design and functionality improvements. He said the UI "looks dated" (the original cream/beige was replaced with a modern slate/white palette in this session, but there's room for further refinement). He's thinking about levelling up both the visual design and the feature set.
