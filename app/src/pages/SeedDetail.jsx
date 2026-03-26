import { useState } from 'react'
import { supabase } from '../lib/supabase'

const PHASES = [
  { id: 'seed', label: 'Fro', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
  { id: 'seedling', label: 'Grodd', icon: 'M17 8C8 10 5.9 16.17 3.82 19.54c-.06.09.15.1.22.02C6.27 17.26 9 13 17 8z' },
  { id: 'growing', label: 'Vaxter', icon: 'M12 22V12m0 0C12 7 7 4 7 4s0 5 5 8zm0 0c0-5 5-8 5-8s0 5-5 8z' },
  { id: 'mature', label: 'Mogen', icon: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16z' },
]

const CARE_DATA = {
  'Limonium sinuatum': { water: 'Var 10-14 dag', light: 'Fullt sol', temp: '15-25C' },
  'Lathyrus odoratus': { water: 'Var 3-4 dag', light: 'Sol/halvskugga', temp: '10-20C' },
  'Antirrhinum majus': { water: 'Var 5-7 dag', light: 'Sol/halvskugga', temp: '15-22C' },
  'Phlox drummondii': { water: 'Var 5-7 dag', light: 'Fullt sol', temp: '15-25C' },
  'Delphinium': { water: 'Var 3-5 dag', light: 'Sol', temp: '12-20C' },
  'Briza maxima': { water: 'Var 7-10 dag', light: 'Sol/halvskugga', temp: '10-22C' },
  'Tagetes erecta': { water: 'Var 5-7 dag', light: 'Fullt sol', temp: '18-28C' },
  'Amaranthus': { water: 'Var 5-7 dag', light: 'Fullt sol', temp: '18-28C' },
  'Zinnia elegans': { water: 'Var 5-7 dag', light: 'Fullt sol', temp: '20-30C' },
}

const PHASE_IMAGES = {
  luktart: 'luktart',
  rosenskara: 'rosenskara',
  rosenskära: 'rosenskara',
  aster: 'aster',
  riddarsporre: 'riddarsporre',
  lejongap: 'lejongap',
  jungfruhirs: 'jungfruhirs',
  brysselkal: 'brysselkal',
  brysselkål: 'brysselkal',
  lavendel: 'lavendel',
  vallmo: 'vallmo',
  sibirisk: 'vallmo',
}

export default function SeedDetail({ seed, dark, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const borderColor = dark ? '#2A2E24' : '#E8E4DA'
  const iconBg = dark ? '#1E3020' : '#E8EDE4'

  const care = CARE_DATA[seed.species] || { water: '-', light: '-', temp: '-' }
  const currentPhase = seed.current_phase || 'seed'

  function getImage() {
    const key = Object.keys(PHASE_IMAGES).find(k => seed.name.toLowerCase().includes(k))
    if (!key) return null
    try { return new URL('../assets/' + PHASE_IMAGES[key] + '_' + currentPhase + '.png', import.meta.url).href }
    catch { return null }
  }

  async function handleDelete() {
    await supabase.from('seeds').delete().eq('id', seed.id)
    onBack && onBack()
  }

  async function handleArchive() {
    await supabase.from('seeds').update({ is_archived: true }).eq('id', seed.id)
    onBack && onBack()
  }

  const img = getImage()

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '180px' }}>

      <div style={{ position: 'relative' }}>
        <div style={{ height: '260px', background: dark ? '#1A1C17' : '#E8EDE4', overflow: 'hidden' }}>
          {img
            ? <img src={img} alt={seed.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill={borderColor}>
                  <path d="M17 8C8 10 5.9 16.17 3.82 19.54c-.06.09.15.1.22.02C6.27 17.26 9 13 17 8z"/>
                </svg>
              </div>
          }
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
              <p style={{ margin: 0, fontSize: '13px', color: text }}>Satt {new Date(seed.sown_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p style={{ margin: 0, fontSize: '11px', color: muted }}>{seed.sowing_type === 'indoor' ? 'Forodling inomhus' : 'Direktsadd'}</p>
            </div>
          </div>
        )}

        <div style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0 0 14px' }}>TILLVAXTFAS</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '18px', left: '10%', right: '10%', height: '2px', background: borderColor }} />
            {PHASES.map((phase, i) => {
              const active = phase.id === currentPhase
              const passed = PHASES.findIndex(p => p.id === currentPhase) > i
              return (
                <div key={phase.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 1 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: active ? '#4E6E44' : passed ? '#2A3828' : (dark ? '#1A1C17' : '#F0EDE6'), border: '2px solid ' + (active ? '#7A9E6E' : borderColor), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? '#F2F0E8' : muted}>
                      <path d={phase.icon}/>
                    </svg>
                  </div>
                  <span style={{ fontSize: '10px', color: active ? muted : borderColor }}>{phase.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
          <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0', padding: '14px 16px 10px' }}>SKOTSELINSTRUKTIONER</p>
          {[
            { icon: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z', label: 'Vattning', sub: 'Hall fuktigt', value: care.water },
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
            <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0 0 10px' }}>ATT TANKA PA</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {seed.frost_sensitive && <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: dark ? '#301010' : '#FFF0E8', color: '#E28080', border: '0.5px solid #7A2020' }}>Frostkanslig</span>}
              {seed.requires_pretreatment && <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: dark ? '#1E1A30' : '#F0EEFF', color: '#9F99CC', border: '0.5px solid #534AB7' }}>Forbehandling kravs</span>}
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
        <button style={{ width: '100%', padding: '14px', background: '#4E6E44', border: 'none', borderRadius: '12px', color: '#F2F0E8', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
          Logga tillvaxt
        </button>
        <button onClick={handleArchive} style={{ width: '100%', padding: '12px', background: 'transparent', border: '0.5px solid ' + borderColor, borderRadius: '12px', color: muted, fontSize: '14px', cursor: 'pointer' }}>
          Arkivera frot
        </button>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', borderRadius: '12px', color: '#E24B4A', fontSize: '13px', cursor: 'pointer' }}>
            Ta bort frot permanent
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid ' + borderColor, borderRadius: '12px', color: muted, fontSize: '13px', cursor: 'pointer' }}>
              Avbryt
            </button>
            <button onClick={handleDelete} style={{ flex: 1, padding: '10px', background: '#C0392B', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
              Ja, ta bort
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
