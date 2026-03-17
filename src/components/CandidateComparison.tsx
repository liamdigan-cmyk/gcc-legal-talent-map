'use client'

import { useState, useMemo } from 'react'
import { Lawyer, Deal } from '@/lib/supabase'
import { FitScoreBreakdown } from '@/lib/fitScore'

// ── Radar Chart (custom SVG) ────────────────────────────
const RADAR_AXES = [
  { key: 'technical', label: 'Technical' },
  { key: 'experience', label: 'Experience' },
  { key: 'responsiveness', label: 'Responsiveness' },
  { key: 'sectorFit', label: 'Sector Fit' },
  { key: 'specialismDepth', label: 'Specialism' },
  { key: 'accessibility', label: 'Accessibility' },
]

const CANDIDATE_COLORS = [
  { stroke: '#6366f1', fill: 'rgba(99,102,241,0.12)', label: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-200' },
  { stroke: '#10b981', fill: 'rgba(16,185,129,0.12)', label: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.12)', label: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  { stroke: '#ec4899', fill: 'rgba(236,72,153,0.12)', label: 'text-pink-600', bg: 'bg-pink-50', ring: 'ring-pink-200' },
]

interface RadarData {
  technical: number
  experience: number
  responsiveness: number
  sectorFit: number
  specialismDepth: number
  accessibility: number
}

function normalizeRadarData(l: Lawyer, fitScore?: FitScoreBreakdown, dealCount?: number): RadarData {
  // Normalize each axis to 0-100
  return {
    technical: Math.min(100, (Number(l.tech_wtd) / 7.67) * 100),
    experience: Math.min(100, (Number(l.exp_wtd) / 7.67) * 100),
    responsiveness: Math.min(100, (Number(l.resp_wtd) / 7.67) * 100),
    sectorFit: fitScore ? fitScore.sectorMatch : Math.min(100, (l.total_score / 23) * 100),
    specialismDepth: fitScore ? fitScore.specialismOverlap : (l.focus_areas ? Math.min(100, l.focus_areas.split(',').length * 20) : 20),
    accessibility: Math.min(100,
      ((l.connection_degree === 1 ? 80 : l.connection_degree === 2 ? 50 : 20) +
      (l.linkedin_url && l.linkedin_url.startsWith('http') ? 20 : 0))
    ),
  }
}

function RadarChart({ candidates, size = 260 }: {
  candidates: { data: RadarData; color: typeof CANDIDATE_COLORS[0] }[]
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 40
  const angleStep = (2 * Math.PI) / 6

  function polarToXY(angle: number, r: number) {
    // Start from top (-π/2)
    const a = angle - Math.PI / 2
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0]

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Grid */}
      {rings.map(r => (
        <polygon key={r}
          points={RADAR_AXES.map((_, i) => {
            const p = polarToXY(i * angleStep, maxR * r)
            return `${p.x},${p.y}`
          }).join(' ')}
          fill="none" stroke="#e2e8f0" strokeWidth={r === 1 ? 1.5 : 0.5}
        />
      ))}

      {/* Axis lines + labels */}
      {RADAR_AXES.map((axis, i) => {
        const end = polarToXY(i * angleStep, maxR)
        const labelPos = polarToXY(i * angleStep, maxR + 22)
        return (
          <g key={axis.key}>
            <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={labelPos.x} y={labelPos.y}
              textAnchor="middle" dominantBaseline="middle"
              className="text-[9px] fill-[#94a3b8] font-medium">
              {axis.label}
            </text>
          </g>
        )
      })}

      {/* Data polygons */}
      {candidates.map((cand, ci) => {
        const points = RADAR_AXES.map((axis, i) => {
          const val = cand.data[axis.key as keyof RadarData] / 100
          return polarToXY(i * angleStep, maxR * val)
        })
        return (
          <g key={ci}>
            <polygon
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill={cand.color.fill}
              stroke={cand.color.stroke}
              strokeWidth={2}
            />
            {points.map((p, pi) => (
              <circle key={pi} cx={p.x} cy={p.y} r={3}
                fill={cand.color.stroke} stroke="white" strokeWidth={1.5} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// ── Main Component ──────────────────────────────────────
interface CandidateComparisonProps {
  candidates: Lawyer[]
  onClose: () => void
  onRemove: (id: string) => void
  onSelectLawyer: (l: Lawyer) => void
  fitScores: Map<string, FitScoreBreakdown>
  firmDealsMap: Map<string, Deal[]>
}

export default function CandidateComparison({
  candidates,
  onClose,
  onRemove,
  onSelectLawyer,
  fitScores,
  firmDealsMap,
}: CandidateComparisonProps) {
  const [notes, setNotes] = useState<Record<string, string>>({})

  // Radar data
  const radarCandidates = useMemo(() => {
    return candidates.map((l, i) => ({
      data: normalizeRadarData(l, fitScores.get(l.id), firmDealsMap.get(l.firm_id || '')?.length || 0),
      color: CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
    }))
  }, [candidates, fitScores, firmDealsMap])

  // Deal counts per candidate
  const dealCounts = useMemo(() => {
    return candidates.map(l => l.firm_id ? (firmDealsMap.get(l.firm_id)?.length || 0) : 0)
  }, [candidates, firmDealsMap])

  // Helper to determine the "winner" for a numeric dimension
  const winnerIdx = (values: number[]) => {
    if (values.length < 2) return -1
    let maxI = 0
    let tied = false
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[maxI]) { maxI = i; tied = false }
      else if (values[i] === values[maxI]) tied = true
    }
    return tied ? -1 : maxI
  }

  // Comparison rows
  type CompRow = {
    label: string
    values: { display: string | React.ReactNode; raw: number }[]
  }

  const rows: CompRow[] = useMemo(() => {
    const r: CompRow[] = []

    // Overall Score
    r.push({
      label: 'Overall Score',
      values: candidates.map(l => ({ display: String(l.total_score), raw: l.total_score })),
    })

    // Fit Score (if any scores exist)
    if (fitScores.size > 0) {
      r.push({
        label: 'Fit Score',
        values: candidates.map(l => {
          const fs = fitScores.get(l.id)
          return { display: fs ? `${fs.total}%` : '—', raw: fs?.total || 0 }
        }),
      })
    }

    // Technical / Experience / Responsiveness
    r.push({ label: 'Technical', values: candidates.map(l => ({ display: Number(l.tech_wtd).toFixed(1), raw: Number(l.tech_wtd) })) })
    r.push({ label: 'Experience', values: candidates.map(l => ({ display: Number(l.exp_wtd).toFixed(1), raw: Number(l.exp_wtd) })) })
    r.push({ label: 'Responsiveness', values: candidates.map(l => ({ display: Number(l.resp_wtd).toFixed(1), raw: Number(l.resp_wtd) })) })

    // Deal Exposure
    r.push({
      label: 'Deal Exposure',
      values: candidates.map((l, i) => ({ display: `${dealCounts[i]} deals`, raw: dealCounts[i] })),
    })

    // Confidence
    r.push({ label: 'Confidence', values: candidates.map(l => ({ display: `${l.confidence}/12`, raw: l.confidence })) })

    // Connection
    r.push({
      label: 'Connection',
      values: candidates.map(l => ({
        display: l.connection_degree ? `${l.connection_degree}°` : '—',
        raw: l.connection_degree ? (4 - l.connection_degree) : 0, // lower degree = better
      })),
    })

    return r
  }, [candidates, fitScores, dealCounts])

  return (
    <>
      <div className="overlay-enter fixed inset-0 bg-black/40 backdrop-blur-[3px] z-[300]" onClick={onClose} />
      <div className="fixed inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl z-[301] overflow-hidden flex flex-col border border-[#e2e8f0]">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#e2e8f0] bg-[#fafbfc] flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#0f172a]">Candidate Comparison</h2>
            <p className="text-[12px] text-[#94a3b8] mt-0.5">{candidates.length} candidates selected</p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#0f172a] transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {/* Candidate headers */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `180px repeat(${candidates.length}, 1fr)` }}>
            <div /> {/* Spacer for label column */}
            {candidates.map((l, i) => {
              const color = CANDIDATE_COLORS[i % CANDIDATE_COLORS.length]
              const tierCls = l.tier === 'T1' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : l.tier === 'T2' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
              return (
                <div key={l.id} className={`${color.bg} rounded-xl p-4 ring-1 ${color.ring} relative group`}>
                  <button onClick={() => onRemove(l.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/60 text-[#94a3b8] hover:text-red-500 transition-all text-sm">&times;</button>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${tierCls}`}>{l.tier}</span>
                    <span className={`text-[20px] font-bold ${color.label}`}>{l.total_score}</span>
                  </div>
                  <div className="text-[13px] font-bold text-[#0f172a] truncate cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => onSelectLawyer(l)}>
                    {l.name}
                  </div>
                  <div className="text-[11px] text-[#94a3b8] truncate">{l.title || '—'}</div>
                  <div className="text-[11px] text-[#475569] truncate mt-0.5">{l.firms?.name || '—'}</div>
                </div>
              )
            })}
          </div>

          {/* Radar Chart */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 mb-6 shadow-sm">
            <h3 className="text-[13px] font-bold text-[#0f172a] mb-3">Competency Radar</h3>
            <RadarChart candidates={radarCandidates} size={280} />
            {/* Legend */}
            <div className="flex justify-center gap-5 mt-3">
              {candidates.map((l, i) => {
                const color = CANDIDATE_COLORS[i % CANDIDATE_COLORS.length]
                return (
                  <div key={l.id} className="flex items-center gap-1.5 text-[11px] text-[#475569]">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color.stroke }} />
                    <span className="truncate max-w-[120px]">{l.name}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-[#e2e8f0]">
              <h3 className="text-[13px] font-bold text-[#0f172a]">Dimension Comparison</h3>
              <p className="text-[11px] text-[#94a3b8] mt-0.5">Leading candidate highlighted per dimension</p>
            </div>
            <table className="w-full">
              <tbody>
                {rows.map(row => {
                  const wi = winnerIdx(row.values.map(v => v.raw))
                  return (
                    <tr key={row.label} className="border-b border-[#f1f5f9] last:border-0">
                      <td className="py-3 px-5 text-[12px] text-[#94a3b8] font-medium w-[180px]">{row.label}</td>
                      {row.values.map((v, i) => {
                        const isWinner = wi === i
                        const color = CANDIDATE_COLORS[i % CANDIDATE_COLORS.length]
                        return (
                          <td key={i} className={`py-3 px-4 text-center text-[13px] font-bold transition-colors ${
                            isWinner ? `${color.label}` : 'text-[#0f172a]'
                          }`}>
                            <span className={isWinner ? `px-2 py-0.5 rounded-md ${color.bg}` : ''}>
                              {v.display}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Detail rows: Sector, Location, Languages, Jurisdiction */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-[#e2e8f0]">
              <h3 className="text-[13px] font-bold text-[#0f172a]">Profile Details</h3>
            </div>
            <table className="w-full">
              <tbody>
                {[
                  { label: 'Sector', render: (l: Lawyer) => l.sub_sectors?.sectors?.name || '—' },
                  { label: 'Sub-Sector', render: (l: Lawyer) => l.sub_sectors?.name || '—' },
                  { label: 'Firm', render: (l: Lawyer) => l.firms?.name || '—' },
                  { label: 'Firm Type', render: (l: Lawyer) => l.company_type_label || '—' },
                  { label: 'Location', render: (l: Lawyer) => l.location || '—' },
                  { label: 'Languages', render: (l: Lawyer) => l.languages || '—' },
                  { label: 'Jurisdiction', render: (l: Lawyer) => l.qual_jurisdiction || '—' },
                  { label: 'Qual Year', render: (l: Lawyer) => l.qual_year ? String(l.qual_year) : '—' },
                  { label: 'PQE Band', render: (l: Lawyer) => l.pqe_band || '—' },
                ].map(detail => (
                  <tr key={detail.label} className="border-b border-[#f1f5f9] last:border-0">
                    <td className="py-3 px-5 text-[12px] text-[#94a3b8] font-medium w-[180px]">{detail.label}</td>
                    {candidates.map((l, i) => {
                      const val = detail.render(l)
                      // Highlight shared values
                      const allVals = candidates.map(c => detail.render(c))
                      const isCommon = allVals.filter(v => v === val && v !== '—').length > 1 && val !== '—'
                      return (
                        <td key={l.id} className={`py-3 px-4 text-center text-[12px] ${isCommon ? 'text-indigo-600 font-semibold' : 'text-[#0f172a]'}`}>
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fit Score Breakdown (if mandate active) */}
          {fitScores.size > 0 && (
            <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-[#e2e8f0]">
                <h3 className="text-[13px] font-bold text-[#0f172a]">Fit Score Breakdown</h3>
              </div>
              <table className="w-full">
                <tbody>
                  {[
                    { label: 'Sector Match', key: 'sectorMatch' as const },
                    { label: 'Specialism Overlap', key: 'specialismOverlap' as const },
                    { label: 'Jurisdiction Fit', key: 'jurisdictionFit' as const },
                    { label: 'Location Proximity', key: 'locationProximity' as const },
                    { label: 'Seniority Alignment', key: 'seniorityAlignment' as const },
                    { label: 'Firm Type Match', key: 'firmTypeMatch' as const },
                    { label: 'Language Capability', key: 'languageCapability' as const },
                    { label: 'Quality Baseline', key: 'qualityBaseline' as const },
                  ].map(dim => {
                    const values = candidates.map(l => fitScores.get(l.id)?.[dim.key] ?? 0)
                    const wi = winnerIdx(values)
                    return (
                      <tr key={dim.key} className="border-b border-[#f1f5f9] last:border-0">
                        <td className="py-2.5 px-5 text-[12px] text-[#94a3b8] font-medium w-[180px]">{dim.label}</td>
                        {values.map((v, i) => {
                          const isWinner = wi === i
                          const color = CANDIDATE_COLORS[i % CANDIDATE_COLORS.length]
                          return (
                            <td key={i} className="py-2.5 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
                                  <div className={`h-full rounded-full transition-all`}
                                    style={{ width: `${v}%`, backgroundColor: color.stroke }} />
                                </div>
                                <span className={`text-[11px] font-bold min-w-[32px] text-right ${isWinner ? color.label : 'text-[#0f172a]'}`}>{v}%</span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-5 mb-6">
            <h3 className="text-[13px] font-bold text-[#0f172a] mb-3">Notes</h3>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${candidates.length}, 1fr)` }}>
              {candidates.map((l, i) => {
                const color = CANDIDATE_COLORS[i % CANDIDATE_COLORS.length]
                return (
                  <div key={l.id}>
                    <div className={`text-[11px] font-semibold ${color.label} mb-1.5`}>{l.name}</div>
                    <textarea
                      value={notes[l.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [l.id]: e.target.value }))}
                      placeholder="Add comparison notes..."
                      className="w-full h-20 px-3 py-2 text-[12px] border border-[#e2e8f0] rounded-lg resize-none outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all placeholder:text-[#cbd5e1]"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .overlay-enter { animation: fadeIn 0.15s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  )
}
