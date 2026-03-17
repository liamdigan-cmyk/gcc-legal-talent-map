'use client'

import { useState, useEffect } from 'react'
import { Mandate, createEmptyMandate } from '@/lib/fitScore'

interface MandateBuilderProps {
  open: boolean
  onClose: () => void
  onActivate: (mandate: Mandate) => void
  sectors: { id: string; name: string }[]
  subSectors: { name: string; sectorName: string }[]
  locations: string[]
  languages: string[]
  qualJurisdictions: string[]
  specialisms: string[]
  companyTypes: string[]
  existingMandate?: Mandate | null
}

export default function MandateBuilder({
  open, onClose, onActivate, sectors, subSectors, locations, languages,
  qualJurisdictions, specialisms, companyTypes, existingMandate,
}: MandateBuilderProps) {
  const [step, setStep] = useState(1)
  const [mandate, setMandate] = useState<Mandate>(existingMandate || createEmptyMandate())
  const [specialismSearch, setSpecialismSearch] = useState('')

  // Sync state when panel opens or existingMandate changes
  useEffect(() => {
    if (open) {
      if (existingMandate) setMandate({ ...existingMandate })
      else setMandate(createEmptyMandate())
      setStep(1)
    }
  }, [open, existingMandate])

  if (!open) return null

  const filteredSubSectors = mandate.sector
    ? subSectors.filter(ss => ss.sectorName === mandate.sector).map(ss => ss.name)
    : []

  const update = (fields: Partial<Mandate>) => setMandate(prev => ({ ...prev, ...fields }))

  const toggleInArray = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]

  const canActivate = mandate.sector || mandate.seniority || mandate.specialisms.length > 0

  const selectCls = "w-full px-3 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-[13px] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 outline-none transition-all cursor-pointer"
  const labelCls = "block text-[12px] font-semibold text-[#475569] mb-1.5"
  const pillBase = "px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-all border"

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[250]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 w-[480px] h-screen bg-white shadow-2xl z-[251] flex flex-col mandate-panel-enter">

        {/* Header */}
        <div className="px-7 py-5 border-b border-[#e2e8f0] flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-[15px] font-bold text-[#0f172a]">
                {existingMandate ? 'Edit Mandate' : 'New Mandate'}
              </h2>
              <p className="text-[12px] text-[#94a3b8] mt-0.5">Define your role specification to score candidates</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#0f172a] transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2 mt-4">
            {[
              { n: 1, label: 'Role Basics' },
              { n: 2, label: 'Requirements' },
              { n: 3, label: 'Preferences' },
            ].map(s => (
              <button key={s.n} onClick={() => setStep(s.n)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                  step === s.n
                    ? 'bg-[#0f172a] text-white shadow-sm'
                    : step > s.n
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-[#f8fafc] text-[#94a3b8] border border-[#e2e8f0]'
                }`}>
                {step > s.n && <span className="mr-1">&#10003;</span>}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* ── STEP 1: Role Basics ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Mandate Title</label>
                <input type="text" value={mandate.title} onChange={e => update({ title: e.target.value })}
                  placeholder="e.g. Senior Real Estate Partner, Dubai"
                  className="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-[13px] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all placeholder:text-[#cbd5e1]" />
              </div>

              <div>
                <label className={labelCls}>Sector</label>
                <select value={mandate.sector} onChange={e => update({ sector: e.target.value, subSector: '' })} className={selectCls}>
                  <option value="">Any sector</option>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              {filteredSubSectors.length > 0 && (
                <div>
                  <label className={labelCls}>Sub-Sector</label>
                  <select value={mandate.subSector} onChange={e => update({ subSector: e.target.value })} className={selectCls}>
                    <option value="">Any sub-sector</option>
                    {filteredSubSectors.map(ss => <option key={ss} value={ss}>{ss}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Seniority Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Partner', 'Senior Associate', 'Associate', 'Counsel'].map(level => (
                    <button key={level} onClick={() => update({ seniority: mandate.seniority === level ? '' : level })}
                      className={`${pillBase} ${
                        mandate.seniority === level
                          ? 'bg-[#0f172a] text-white border-[#0f172a]'
                          : 'bg-white text-[#475569] border-[#e2e8f0] hover:border-[#cbd5e1]'
                      }`}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Requirements ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Key Specialisms <span className="text-[#94a3b8] font-normal">({mandate.specialisms.length} selected)</span></label>
                <input type="text" value={specialismSearch} onChange={e => setSpecialismSearch(e.target.value)}
                  placeholder="Filter specialisms..."
                  className="w-full px-3 py-2 mb-2 bg-white border border-[#e2e8f0] rounded-lg text-[12px] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all placeholder:text-[#cbd5e1]" />
                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto p-3 bg-[#fafbfc] rounded-lg border border-[#f1f5f9]">
                  {specialisms
                    .filter(s => !specialismSearch || s.toLowerCase().includes(specialismSearch.toLowerCase()) || mandate.specialisms.includes(s))
                    .slice(0, 80)
                    .map(s => (
                    <button key={s} onClick={() => update({ specialisms: toggleInArray(mandate.specialisms, s) })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        mandate.specialisms.includes(s)
                          ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                          : 'bg-white text-[#475569] border border-[#e2e8f0] hover:border-[#cbd5e1]'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Jurisdiction Requirements <span className="text-[#94a3b8] font-normal">({mandate.jurisdictions.length} selected)</span></label>
                <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto p-3 bg-[#fafbfc] rounded-lg border border-[#f1f5f9]">
                  {qualJurisdictions.map(j => (
                    <button key={j} onClick={() => update({ jurisdictions: toggleInArray(mandate.jurisdictions, j) })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        mandate.jurisdictions.includes(j)
                          ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                          : 'bg-white text-[#475569] border border-[#e2e8f0] hover:border-[#cbd5e1]'
                      }`}>
                      {j}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Preferred Location</label>
                <select value={mandate.location} onChange={e => update({ location: e.target.value })} className={selectCls}>
                  <option value="">Any location</option>
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── STEP 3: Preferences ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Firm Type Preference</label>
                <div className="grid grid-cols-2 gap-2">
                  {companyTypes.slice(0, 8).map(type => (
                    <button key={type} onClick={() => update({ firmType: mandate.firmType === type ? '' : type })}
                      className={`${pillBase} text-[11px] ${
                        mandate.firmType === type
                          ? 'bg-[#0f172a] text-white border-[#0f172a]'
                          : 'bg-white text-[#475569] border-[#e2e8f0] hover:border-[#cbd5e1]'
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Required Languages <span className="text-[#94a3b8] font-normal">({mandate.languages.length} selected)</span></label>
                <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto p-3 bg-[#fafbfc] rounded-lg border border-[#f1f5f9]">
                  {languages.map(l => (
                    <button key={l} onClick={() => update({ languages: toggleInArray(mandate.languages, l) })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        mandate.languages.includes(l)
                          ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                          : 'bg-white text-[#475569] border border-[#e2e8f0] hover:border-[#cbd5e1]'
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary preview */}
              <div className="bg-[#fafbfc] rounded-xl p-4 border border-[#f1f5f9]">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">Mandate Summary</h4>
                <div className="space-y-1.5 text-[12px]">
                  {mandate.title && <div className="font-semibold text-[#0f172a]">{mandate.title}</div>}
                  <div className="text-[#475569]">
                    {[
                      mandate.seniority,
                      mandate.sector,
                      mandate.subSector,
                      mandate.location,
                    ].filter(Boolean).join(' / ') || 'No criteria set'}
                  </div>
                  {mandate.specialisms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {mandate.specialisms.map(s => (
                        <span key={s} className="px-1.5 py-0.5 bg-indigo-50 rounded text-[10px] text-indigo-600 font-medium">{s}</span>
                      ))}
                    </div>
                  )}
                  {mandate.jurisdictions.length > 0 && (
                    <div className="text-[11px] text-[#94a3b8] mt-1">
                      Jurisdictions: {mandate.jurisdictions.join(', ')}
                    </div>
                  )}
                  {mandate.languages.length > 0 && (
                    <div className="text-[11px] text-[#94a3b8]">
                      Languages: {mandate.languages.join(', ')}
                    </div>
                  )}
                  {mandate.firmType && (
                    <div className="text-[11px] text-[#94a3b8]">Firm type: {mandate.firmType}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-[#e2e8f0] flex-shrink-0 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[13px] font-medium text-[#475569] hover:border-[#cbd5e1] transition-all">
              Back
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="px-6 py-2.5 bg-[#0f172a] text-white rounded-lg text-[13px] font-semibold hover:bg-[#1e293b] transition-all shadow-sm">
              Next
            </button>
          ) : (
            <button onClick={() => {
              const finalMandate = { ...mandate }
              if (!finalMandate.title) {
                const parts = [finalMandate.seniority, finalMandate.sector, finalMandate.location].filter(Boolean)
                finalMandate.title = parts.length > 0 ? parts.join(' — ') : 'Untitled Mandate'
              }
              onActivate(finalMandate)
              onClose()
            }}
              disabled={!canActivate}
              className={`px-6 py-2.5 rounded-lg text-[13px] font-semibold transition-all shadow-sm ${
                canActivate
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
              }`}>
              {existingMandate ? 'Update & Score' : 'Activate & Score'}
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .mandate-panel-enter {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </>
  )
}
