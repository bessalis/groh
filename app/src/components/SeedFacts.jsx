// Korten på fröets sida som visar påsen och den delade växtdatan:
// PacketCard (påsfoton och påsens uppgifter), SowingCard (sådata, påsen går först)
// och SpeciesCard (artens råd, AI-märkta).

import { useEffect, useState } from 'react'
import { Button, SectionLabel, AiNote } from './ui'
import { photoUrl } from '../lib/scan'
import { sowingFor } from '../lib/packet'
import { monthText, germinationText, depthText, MAINTENANCE, AMOUNT_TEXT } from '../lib/plantData'

function Facts({ rows }) {
  const shown = rows.filter(r => r.value)
  if (!shown.length) return null
  return (
    <dl className="fact-list t-body">
      {shown.map(r => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.value}{r.ai && <span className="ai-chip" title="Från AI">AI</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

function PhotoViewer({ src, label, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={label}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="t-label" style={{ margin: 0 }}>{label}</p>
        <Button onClick={onClose} autoFocus>Stäng</Button>
      </div>
      <img src={src} alt={label} onClick={onClose} />
    </div>
  )
}

export function PacketCard({ seed }) {
  const [urls, setUrls] = useState({ front: null, back: null })
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let live = true
    Promise.all([photoUrl(seed.front_photo_path), photoUrl(seed.back_photo_path)])
      .then(([front, back]) => { if (live) setUrls({ front, back }) })
      .catch(() => {})
    return () => { live = false }
  }, [seed.front_photo_path, seed.back_photo_path])

  const hasPhotos = seed.front_photo_path || seed.back_photo_path
  const rows = [
    { label: 'Sort', value: seed.cultivar },
    { label: 'Fröfirma', value: seed.supplier },
    { label: 'Årgång', value: seed.packed_for_season },
    { label: 'Mängd kvar', value: AMOUNT_TEXT[seed.amount] },
  ]
  if (!hasPhotos && !rows.some(r => r.value)) return null

  const photos = [['front', 'Framsida'], ['back', 'Baksida']].filter(([side]) => seed[`${side}_photo_path`])

  return (
    <div className="card" style={{ marginBottom: '12px', display: 'grid', gap: '12px' }}>
      <SectionLabel style={{ margin: 0 }}>Fröpåsen</SectionLabel>
      {photos.length > 0 && (
        <div className="packet-photos">
          {photos.map(([side, label]) => (
            <button key={side} type="button" className="packet-photo" onClick={() => urls[side] && setOpen(side)} aria-label={`Visa ${label.toLowerCase()} större`}>
              {urls[side] ? <img src={urls[side]} alt="" loading="lazy" /> : <span className="packet-photo__empty" />}
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
      <Facts rows={rows} />
      {open && <PhotoViewer src={urls[open]} label={open === 'front' ? 'Påsens framsida' : 'Påsens baksida'} onClose={() => setOpen(null)} />}
    </div>
  )
}

export function SowingCard({ seed, variety }) {
  const { values: v, from } = sowingFor(seed, variety)
  const ai = field => from[field] === 'variety'
  const germFrom = from.days_to_germination_min || from.days_to_germination_max
  const rows = [
    { label: 'Förodla inne', value: monthText(v.sow_indoor_months), ai: ai('sow_indoor_months') },
    { label: 'Så ute', value: monthText(v.sow_outdoor_months), ai: ai('sow_outdoor_months') },
    { label: 'Groningstid', value: germinationText(v.days_to_germination_min, v.days_to_germination_max), ai: germFrom === 'variety' },
    { label: 'Sådjup', value: depthText(v.sowing_depth_cm), ai: ai('sowing_depth_cm') },
    { label: 'Ljusgroende', value: v.light_germination ? 'Ja, täck inte fröet' : null, ai: ai('light_germination') },
  ]
  if (!rows.some(r => r.value)) return null
  const anyAi = rows.some(r => r.value && r.ai)

  return (
    <div className="card" style={{ marginBottom: '12px', display: 'grid', gap: '12px' }}>
      <SectionLabel style={{ margin: 0 }}>Sådd</SectionLabel>
      <Facts rows={rows} />
      {anyAi && (
        <AiNote status={variety?.status}>
          Det som står på påsen gäller. Uppgifter märkta AI saknades på påsen och kommer från delad sortdata.
        </AiNote>
      )}
    </div>
  )
}

export function SpeciesCard({ facts, loading }) {
  if (loading && !facts) {
    return <p className="t-caption" style={{ color: 'var(--text-muted)', margin: '0 0 12px' }}>Hämtar råd om arten …</p>
  }
  if (!facts) return null
  const rows = [
    { label: 'Familj', value: facts.family },
    { label: 'Skötsel', value: MAINTENANCE[facts.maintenance_level] },
    { label: 'Såtips', value: facts.sowing_note },
    { label: 'Förbehandling', value: facts.requires_pretreatment ? (facts.pretreatment_note || 'Ja') : null },
    { label: 'Bra grannar', value: facts.companion_planting },
  ]
  if (!rows.some(r => r.value)) return null

  return (
    <div className="card" style={{ marginBottom: '12px', display: 'grid', gap: '12px' }}>
      <SectionLabel style={{ margin: 0 }}>Om arten</SectionLabel>
      <Facts rows={rows} />
      <AiNote status={facts.status} />
    </div>
  )
}
