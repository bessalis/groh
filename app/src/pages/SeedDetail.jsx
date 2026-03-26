import { useState } from 'react'
import { supabase } from '../lib/supabase'

const PHASES = [
  { id: 'seed', label: 'Frö', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
  { id: 'seedling', label: 'Grodd', icon: 'M17 8C8 10 5.9 16.17 3.82 19.54c-.06.09.15.1.22.02C6.27 17.26 9 13 17 8z' },
  { id: 'growing', label: 'Växer', icon: 'M12 22V12m0 0C12 7 7 4 7 4s0 5 5 8zm0 0c0-5 5-8 5-8s0 5-5 8z' },
  { id: 'mature', label: 'Mogen', icon: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16z' },
]

const CARE_DATA = {
  'Limonium sinuatum': { water: 'Var 10-14 dag', light: 'Fullt sol', temp: '15-25°C' },
  'Lathyrus odoratus': { water: 'Var 3-4 dag', light: 'Sol/halvskugga', temp: '10-20°C' },
  'Antirrhinum majus': { water: 'Var 5-7 dag', light: 'Sol/halvskugga', temp: '15-22°C' },
  'Phlox drummondii': { water: 'Var 5-7 dag', light: 'Fullt sol', temp: '15-25°C' },
  'Delphinium': { water: 'Var 3-5 dag', light: 'Sol', temp: '12-20°C' },
  'Briza maxima': { water: 'Var 7-10 dag', light: 'Sol/halvskugga', temp: '10-22°C' },
  'Amaranthus': { water: 'Var 5-7 dag', light: 'Fullt sol', temp: '18-28°C' },
  'Zinnia elegans': { water: 'Var 5-7 dag', light: 'Fullt sol', temp: '20-30°C' },
  'Cosmos bipinnatus': { water: 'Var 5-7 dag', light: 'Fullt sol', temp: '15-25°C' },
  'Consolida ajacis': { water: 'Var 5-7 dag', light: 'Sol', temp: '10-18°C' },
  'Lavandula': { water: 'Var 10-14 dag', light: 'Fullt sol', temp: '15-25°C' },
  'Papaver': { water: 'Var 7-10 dag', light: 'Sol/halvskugga', temp: '10-18°C' },
}

const IMG_MAP = {
  luktart: 'luktart', luktärt: 'luktart',
  rosenskara: 'rosenskara', rosenskära: 'rosenskara',
  aster: 'aster', riddarsporre: 'riddarsporre',
  lejongap: 'lejongap', jungfruhirs: 'jungfruhirs',
  brysselkal: 'brysselkal', brysselkål: 'brysselkal',
  lavendel: 'lavendel', vallmo: 'vallmo', sibirisk: 'vallmo',
}

function autoPhase(sownDate) {
  if (!sownDate) return null
  const days = Math.floor((Date.now() - new Date(sownDate).getTime()) / 86400000)
  if (days <= 14) return 'seed'
  return 'seedling'
}

export default function SeedDetail({ seed, dark, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [currentPhase, setCurrentPhase] = useState(
    seed.current_phase || autoPhase(seed.sown_date) || 'seed'
  )
  const [savingPhase, setSavingPhase] = useState(false)

  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const borderColor = dark ? '#2A2E24' : '#E8E4DA'
  const iconBg = dark ? '#1E3020' : '#E8EDE4'

  const care = CARE_DATA[seed.species] || { water: '-', light: '-', temp: '-' }

  async function handlePhaseChange(phaseId) {
    if (phaseId === currentPhase) return
    setSavingPhase(true)
    setCurrentPhase(phaseId)
    await supabase.from('seeds').update({ current_phase: phaseId }).eq('id', seed.id)
    setSavingPhase(false)
  }

  function getImage() {
    const nameLower = seed.name.toLowerCase()
    const key = Object.keys(IMG_MAP).find(k => nameLower.includes(k))
    const file = key ? IMG_MAP[key] : 'fallback'
    const fallback = new URL('../assets/fallback_growing.png', import.meta.url).href
    try {
      return new URL('../assets/' + file + '_' + currentPhase + '.png', import.meta.url).href
    } catch { return fallback }
  }

  async function handleDelete() {
    await supabase.from('seeds').delete().eq('id', seed.id)
    onBack && onBack()
  }

  async function handleArchive() {
    await supabase.from('seeds').update({ is_archived: true }).eq('id', seed.id)
    onBack && onBack()
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '160px' }}>

      <div style={{ position: 'relative' }}>
        <div style={{ height: '260px', background: dark ? '#1A1C17' : '#E8EDE4', overflow: 'hidden' }}>
          <img src={getImage()} alt={seed.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.src = new URL('../assets/fallback_growing.png', import.meta.url).href }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, transparent 50%, ' + bg + ')' }} />
        </div>
        <button onClick={onBack} style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '20px', padding: '6px 14px', color: '#F2F0E8', fontSize: '13px', cursor: 'pointer' }}>
          ← Tillbaka
        </button>
      </div>

      <div style={{ padding: '0 16px', marginTop: '-20px', position: 'relative' }}>
        <h1 style={{ fontSize: '26px', fontFamily: 'Georgia, serif', fontWeight: 400, color: text, margin: '0 0 4px' }}>{seed.name}</h1>
        <p style={{ fontSize: '14px', color: muted, fontStyle: 'italic', margin: '0 0 20px' }}>{seed.species}</p>

        {seed.sown_date && (
          <div style={{ background: dark ? '#1A2518' : '#E8EDE4', border: '0.5px solid ' + (dark ? '#2A3828' : '#C0D0B8'), borderRadius: '12px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '18px' }}>🌱</span>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: text }}>
                Sått {new Date(seed.sown_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: muted }}>{seed.sowing_type === 'indoor' ? 'Förrodling inomhus' : 'Direktsådd'}</p>
            </div>
          </div>
        )}

        <div style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: 0 }}>TILLVÄXTFAS</p>
            {savingPhase && <p style={{ fontSize: '11px', color: muted, margin: 0 }}>Sparar...</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '18px', left: '10%', right: '10%', height: '2px', background: borderColor }} />
            {PHASES.map((phase) => {
              const active = phase.id === currentPhase
              const phaseOrder = ['seed', 'seedling', 'growing', 'mature']
              const passed = phaseOrder.indexOf(currentPhase) > phaseOrder.indexOf(phase.id)
              return (
                <div key={phase.id}
                  onClick={() => handlePhaseChange(phase.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 1, cursor: 'pointer' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: active ? '#4E6E44' : passed ? '#2A3828' : (dark ? '#1A1C17' : '#F0EDE6'), border: '2px solid ' + (active ? '#7A9E6E' : passed ? '#3B5E35' : borderColor), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? '#F2F0E8' : passed ? '#7A9E6E' : muted}>
                      <path d={phase.icon}/>
                    </svg>
                  </div>
                  <span style={{ fontSize: '10px', color: active ? muted : passed ? '#4A5244' : borderColor }}>{phase.label}</span>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: '10px', color: borderColor, margin: '12px 0 0', textAlign: 'center' }}>
            Tryck på en fas för att uppdatera
          </p>
        </div>

        <div style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
          <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0', padding: '14px 16px 10px' }}>SKÖTSELINSTRUKTIONER</p>
          {[
            { icon: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z', label: 'Vattning', sub: 'Håll fuktigt', value: care.water },
            { icon: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z', label: 'Ljus', sub: 'Placering', value: care.light },
            { icon: 'M9 12c0 1.66 1.34 3 3 3s3-1.34 3-3V5H9v7zM12 1a1 1 0 00-1 1v1H9v9c0 2.21 1.79 4 4 4s4-1.79 4-4V3h-2V2a1 1 0 00-1-1h-2z', label: 'Temperatur', sub: 'Optimal', value: care.temp },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: i === 0 ? 'none' : '0.5px solid ' + borderColor }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={muted}><path d={item.icon}/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 1px', fontSize: '14px', color: text }}>{item.label}</p>
                <p style={{ margin: 0, fontSize: '11px', color: muted }}>{item.sub}</p>
              </div>
              <span style={{ fontSize: '13px', color: muted }}>{item.value}</span>
            </div>
          ))}
        </div>

        {(seed.frost_sensitive || seed.requires_pretreatment) && (
          <div style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0 0 10px' }}>ATT TÄNKA PÅ</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {seed.frost_sensitive && <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: dark ? '#301010' : '#FFF0E8', color: '#E28080', border: '0.5px solid #7A2020' }}>Frostkänslig</span>}
              {seed.requires_pretreatment && <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: dark ? '#1E1A30' : '#F0EEFF', color: '#9F99CC', border: '0.5px solid #534AB7' }}>Förbehandling krävs</span>}
            </div>
          </div>
        )}

        {seed.notes && (
          <div style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0 0 8px' }}>ANTECKNING</p>
            <p style={{ fontSize: '14px', color: text, margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>{seed.notes}</p>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: '358px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={handleArchive} style={{ width: '100%', padding: '13px', background: 'transparent', border: '0.5px solid ' + borderColor, borderRadius: '12px', color: muted, fontSize: '14px', cursor: 'pointer' }}>
          Arkivera frö
        </button>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', borderRadius: '12px', color: '#E24B4A', fontSize: '13px', cursor: 'pointer' }}>
            Ta bort frö permanent
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid ' + borderColor, borderRadius: '12px', color: muted, fontSize: '13px', cursor: 'pointer' }}>Avbryt</button>
            <button onClick={handleDelete} style={{ flex: 1, padding: '10px', background: '#C0392B', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>Ja, ta bort</button>
          </div>
        )}
      </div>
    </div>
  )
}
