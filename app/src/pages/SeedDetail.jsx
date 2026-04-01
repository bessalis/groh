import { Icon } from '../components/Icon'
import IconSeed from '../assets/seed.svg?react'
import IconSeedling from '../assets/seedling.svg?react'
import IconGrown from '../assets/grown.svg?react'
import IconMature from '../assets/mature.svg?react'
import IconWater from '../assets/water.svg?react'
import IconSun from '../assets/sun.svg?react'
import IconTemp from '../assets/temperature.svg?react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

const images = import.meta.glob('../assets/*.png', { eager: true })

const NEXT_STEP = {
  seed: 'Håll jorden fuktig och varm. Grodden brukar visa sig inom 1-3 veckor.',
  seedling: 'Låt grodden växa sig stark. Plantera om när den har 2-3 riktiga blad.',
  growing: 'Dags att plantera ut! Härda av plantan först genom att ställa den ute några timmar per dag.',
  mature: 'Växten är mogen. Skörda, spara frön eller låt den blomma ut.',
}

const PHASES = [
  { id: 'seed', label: 'Frö', icon: 'seed' },
  { id: 'seedling', label: 'Grodd', icon: 'seedling' },
  { id: 'growing', label: 'Växer', icon: 'grown' },
  { id: 'mature', label: 'Mogen', icon: 'mature' },
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
  // Befintliga
  luktart: 'luktart', luktärt: 'luktart',
  rosenskara: 'rosenskara', rosenskära: 'rosenskara',
  aster: 'aster', riddarsporre: 'riddarsporre',
  lejongap: 'lejongap', jungfruhirs: 'jungfruhirs',
  brysselkal: 'brysselkal', brysselkål: 'brysselkal',
  lavendel: 'lavendel', vallmo: 'vallmo', sibirisk: 'vallmo',
  // Nya
  flox: 'flox',
  amarant: 'amarant',
  celosia: 'celosia',
  kronartskocka: 'kronartskocka',
  praktvadd: 'praktvadd',
}

function autoPhase(sownDate) {
  if (!sownDate) return null
  const days = Math.floor((Date.now() - new Date(sownDate).getTime()) / 86400000)
  if (days <= 14) return 'seed'
  return 'seedling'
}

export default function SeedDetail({ seed, dark, onBack, onEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [currentPhase, setCurrentPhase] = useState(
    seed.current_phase || autoPhase(seed.sown_date) || 'seed'
  )
  const [savingPhase, setSavingPhase] = useState(false)
  const [userNotes, setUserNotes] = useState(seed.notes || '')
  const [savedNotes, setSavedNotes] = useState(false)
  const [isFavorite, setIsFavorite] = useState(seed.is_favorite || false)

  async function handleToggleFavorite() {
    const next = !isFavorite
    setIsFavorite(next)
    await supabase.from('seeds').update({ is_favorite: next }).eq('id', seed.id)
  }

  async function handleSaveNotes() {
    await supabase.from('seeds').update({ notes: userNotes }).eq('id', seed.id)
    setSavedNotes(true)
    setTimeout(() => setSavedNotes(false), 2000)
  }

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
  const fallback = images['../assets/fallback_growing.png']?.default

  const phasesToTry = [currentPhase, 'growing', 'seedling', 'seed']
  for (const phase of phasesToTry) {
    const src = images['../assets/' + file + '_' + phase + '.png']?.default
    if (src) return src
  }
  return fallback
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
            onError={e => { e.target.src = images['../assets/fallback_growing.png']?.default }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, transparent 50%, ' + bg + ')' }} />
        </div>
        <button onClick={onBack} style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '20px', padding: '6px 14px', color: '#F2F0E8', fontSize: '13px', cursor: 'pointer' }}>
          ← Tillbaka
        </button>
        <button onClick={handleToggleFavorite} style={{ position: 'absolute', top: '16px', right: '60px', background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '20px', padding: '6px 10px', cursor: 'pointer', lineHeight: 1, zIndex: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? '#F2F0E8' : 'none'} stroke="#F2F0E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
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
                    <Icon name={phase.icon} size={16} color={active ? '#F2F0E8' : muted} />
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

        <div style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0 0 12px' }}>SKÖTSELINSTRUKTIONER</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { icon: 'water', label: 'Vattning', value: care.water },
              { icon: 'sun', label: 'Ljus', value: care.light },
              { icon: 'temperature', label: 'Temp', value: care.temp },
            ].map((item, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: dark ? '#1A1C17' : '#F6F4EC', borderRadius: '10px', padding: '12px 6px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={item.icon} size={18} color={muted} />
                </div>
                <span style={{ fontSize: '11px', color: muted }}>{item.label}</span>
                <span style={{ fontSize: '12px', color: text, textAlign: 'center' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0 0 8px' }}>NÄSTA STEG</p>
          <p style={{ fontSize: '14px', color: text, margin: 0, lineHeight: 1.5 }}>{NEXT_STEP[currentPhase]}</p>
          {seed.frost_sensitive && (
            <p style={{ fontSize: '13px', color: '#E28080', margin: '8px 0 0', lineHeight: 1.5 }}>⚠ Frostkänslig – vänta tills nattfrosten är över innan utplantering.</p>
          )}
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

        <div style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0 0 8px' }}>ANTECKNINGAR</p>
          <textarea
            value={userNotes}
            onChange={e => setUserNotes(e.target.value)}
            placeholder="Skriv en anteckning..."
            style={{ width: '100%', minHeight: '80px', background: 'transparent', border: '0.5px solid ' + borderColor, borderRadius: '8px', padding: '8px 10px', fontSize: '14px', color: text, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            <button onClick={handleSaveNotes} style={{ padding: '7px 16px', background: '#4E6E44', border: 'none', borderRadius: '8px', color: '#F2F0E8', fontSize: '13px', cursor: 'pointer' }}>
              Spara
            </button>
            {savedNotes && <span style={{ fontSize: '12px', color: muted }}>Sparat!</span>}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', marginBottom: '32px' }}>
        <button onClick={() => onEdit && onEdit(seed)} style={{ width: '100%', padding: '13px', background: 'transparent', border: '0.5px solid ' + borderColor, borderRadius: '12px', color: muted, fontSize: '14px', cursor: 'pointer' }}>
          Redigera frö
        </button>
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
