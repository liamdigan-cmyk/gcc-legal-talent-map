'use client'

import { Mandate } from '@/lib/fitScore'

interface MandateBarProps {
  mandate: Mandate
  resultCount: number
  strongCount: number
  goodCount: number
  onEdit: () => void
  onClear: () => void
}

export default function MandateBar({ mandate, resultCount, strongCount, goodCount, onEdit, onClear }: MandateBarProps) {
  return (
    <div className="mandate-bar-enter mb-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl px-5 py-3 flex items-center gap-4">
      {/* Mandate icon */}
      <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          <path d="M11 8v6M8 11h6"/>
        </svg>
      </div>

      {/* Mandate info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-indigo-900 truncate">{mandate.title || 'Active Mandate'}</span>
          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">Scoring</span>
        </div>
        <div className="text-[11px] text-indigo-600/70 mt-0.5 truncate">
          {[
            mandate.seniority,
            mandate.sector,
            mandate.subSector,
            mandate.location,
            mandate.firmType,
            mandate.specialisms.length > 0 ? `${mandate.specialisms.length} specialisms` : '',
            mandate.jurisdictions.length > 0 ? `${mandate.jurisdictions.length} jurisdictions` : '',
            mandate.languages.length > 0 ? `${mandate.languages.length} languages` : '',
          ].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-center">
          <div className="text-[14px] font-bold text-emerald-600">{strongCount}</div>
          <div className="text-[9px] text-emerald-600/70 font-semibold uppercase">Strong</div>
        </div>
        <div className="text-center">
          <div className="text-[14px] font-bold text-blue-600">{goodCount}</div>
          <div className="text-[9px] text-blue-600/70 font-semibold uppercase">Good</div>
        </div>
        <div className="text-center">
          <div className="text-[14px] font-bold text-[#475569]">{resultCount}</div>
          <div className="text-[9px] text-[#94a3b8] font-semibold uppercase">Total</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={onEdit}
          className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-all">
          Edit
        </button>
        <button onClick={onClear}
          className="px-3 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-[11px] font-semibold text-[#94a3b8] hover:text-red-500 hover:border-red-200 transition-all">
          Clear
        </button>
      </div>

      <style jsx global>{`
        @keyframes mandateBarFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mandate-bar-enter {
          animation: mandateBarFadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
