// "I kärlen": varje kärl ritas som det ser ut på fönsterbrädan, en ruta per
// plats med fröets bild. Väntande fröer är dämpade, de som grott syns i full
// färg med en grodd. Tryck på en ruta för att se fröet och bocka av att det grott.
// Visas överst i Mina frön och på Årets sådd. Hämtar själv. Skickar sidan med
// onChange anropas den när något sparats; sidan läser då om och ökar reloadKey.

import { useEffect, useState } from 'react'
import { Button, SectionLabel, AiNote } from './ui'
import MarkDot from './MarkDot'
import SeedImage from './SeedImage'
import { Icon } from './Icon'
import { isoDate } from '../lib/timeline'
import { markDone, undoDone } from '../lib/sowing'
import { loadImageIndex, imageFor } from '../lib/seedImages'
import { containerLabel, loadActiveSowings, waitingText, dayOf, inContainer, hasGerminated, slotCount } from '../lib/containers'
import '../styles/containers.css'

const dayText = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })

// Rutorna i kärlet: en per plats (brätte, kruka), annars en per planta (friland).
function cellsFor(sowing) {
  const plants = sowing.plants.filter(inContainer)
  const count = slotCount(sowing.container)
  if (!count) return plants.map(p => ({ key: p.id, plant: p }))
  const bySlot = new Map()
  for (const p of plants) for (const n of p.slots || []) bySlot.set(n, p)
  const cells = Array.from({ length: count }, (_, i) => ({ key: `s${i + 1}`, slot: i + 1, plant: bySlot.get(i + 1) || null }))
  // Plantor utan plats (äldre sådder) läggs sist så att de inte försvinner.
  const placed = new Set(bySlot.values())
  return cells.concat(plants.filter(p => !placed.has(p)).map(p => ({ key: p.id, plant: p })))
}

function ContainerCard({ sowing, todayIso, imageIndex, onOpenSeed, onSaved }) {
  const [open, setOpen] = useState(null)   // plantans id
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const day = dayOf(sowing.sown_date, todayIso)
  const cells = cellsFor(sowing)
  const plants = sowing.plants.filter(inContainer)
  const grown = plants.filter(hasGerminated).length
  const selected = plants.find(p => p.id === open) || null

  async function toggle(plant) {
    setBusy(true); setError('')
    try {
      if (hasGerminated(plant)) await undoDone(plant, 'germinate')
      else await markDone(plant, 'germinate', todayIso)
      await onSaved()
    } catch { setError('Det gick inte att spara.') }
    setBusy(false)
  }

  return (
    <article className="card tray-card">
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <MarkDot color={sowing.container.color} large />
        <div style={{ minWidth: 0 }}>
          <h3 className="t-heading-s" style={{ margin: 0 }}>{containerLabel(sowing.container)}</h3>
          <span className="t-caption" style={{ color: 'var(--text-muted)' }}>
            {day > 0 ? `Dag ${day}` : day === 0 ? 'Sått i dag' : 'Planerad'} · sått {dayText(sowing.sown_date)}
            {plants.length > 0 && ` · ${grown} av ${plants.length} grott`}
          </span>
        </div>
      </header>

      <div className="tray" role="list" aria-label={`Platserna i ${containerLabel(sowing.container)}`}>
        {cells.map(c => {
          if (!c.plant) {
            return <div key={c.key} role="listitem" className="tray__cell tray__cell--empty"><span className="tray__no">{c.slot}</span></div>
          }
          const g = hasGerminated(c.plant)
          const label = `${c.slot ? `Plats ${c.slot}: ` : ''}${c.plant.seed.name}, ${g ? 'har grott' : 'väntar'}`
          return (
            <div key={c.key} role="listitem">
              <button type="button" className={`tray__cell${g ? ' tray__cell--grown' : ''}`} aria-pressed={open === c.plant.id} aria-label={label}
                onClick={() => setOpen(open === c.plant.id ? null : c.plant.id)}>
                <SeedImage image={imageIndex && imageFor(c.plant.seed, imageIndex)} name="" className="tray__image" />
                {c.slot && <span className="tray__no">{c.slot}</span>}
                {g && <span className="tray__sprout"><Icon name="seedling" size={14} color="currentColor" /></span>}
              </button>
            </div>
          )
        })}
      </div>

      {selected ? (
        <div className="tray-detail">
          <SeedImage image={imageIndex && imageFor(selected.seed, imageIndex)} name={selected.seed.name} className="tray-detail__image" />
          <div style={{ minWidth: 0, display: 'grid', gap: '2px' }}>
            <span className="t-heading-s">{selected.seed.name}</span>
            <span className="t-caption" style={{ color: 'var(--text-muted)' }}>
              {[selected.slots?.length ? `Plats ${selected.slots.join(', ')}` : null, hasGerminated(selected) ? 'har grott' : 'väntar'].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div className="tray-detail__actions">
            {day >= 0 && (
              <Button variant={hasGerminated(selected) ? 'ghost' : 'primary'} onClick={() => toggle(selected)} disabled={busy}>
                {busy ? 'Sparar …' : hasGerminated(selected) ? 'Ångra grott' : 'Har grott'}
              </Button>
            )}
            <Button variant="link" onClick={() => onOpenSeed?.(selected.seed)}>Öppna fröet</Button>
          </div>
          {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0, gridColumn: '1 / -1' }}>{error}</p>}
        </div>
      ) : (
        <p className="t-small tray-card__wait">{waitingText(sowing, todayIso)}</p>
      )}
    </article>
  )
}

export default function ContainerCards({ onOpenSeed, onChange, reloadKey }) {
  const todayIso = isoDate(new Date())
  const [sowings, setSowings] = useState([])
  const [imageIndex, setImageIndex] = useState(null)

  useEffect(() => { loadImageIndex().then(setImageIndex).catch(() => {}) }, [])
  useEffect(() => {
    let live = true
    loadActiveSowings().then(s => { if (live) setSowings(s) }).catch(() => {})
    return () => { live = false }
  }, [reloadKey])

  async function saved() {
    if (onChange) await onChange()
    else setSowings(await loadActiveSowings())
  }

  if (!sowings.length) return null
  const anyImage = imageIndex && sowings.some(s => s.plants.some(p => imageFor(p.seed, imageIndex)))

  return (
    <section style={{ display: 'grid', gap: '10px' }}>
      <SectionLabel style={{ margin: 0 }}>I kärlen</SectionLabel>
      <p className="t-caption" style={{ margin: 0, color: 'var(--text-muted)' }}>Tryck på en ruta när något tittar fram.</p>
      {sowings.map(s => (
        <ContainerCard key={s.id} sowing={s} todayIso={todayIso} imageIndex={imageIndex} onOpenSeed={onOpenSeed} onSaved={saved} />
      ))}
      {anyImage && <AiNote>Illustrationerna är gjorda med AI, i Ernst Haeckels manér.</AiNote>}
    </section>
  )
}
