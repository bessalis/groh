// Sådagen: välj kärl (eller skapa ett), fyll platserna med fröer, spara.
// Nås från Årets sådd. Se lib/containers.js.

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, SectionLabel, AiNote } from '../components/ui'
import MarkDot from '../components/MarkDot'
import { Icon } from '../components/Icon'
import SeedImage from '../components/SeedImage'
import { loadImageIndex, imageFor } from '../lib/seedImages'
import { isoDate } from '../lib/timeline'
import { currentSeason, frostSettings, suggestionFor } from '../lib/sowing'
import {
  COLORS, KINDS, DEFAULT_TRAY_SLOTS, containerLabel, slotCount, listContainers, createContainer,
  loadActiveSowings, occupiedSlots, saveSowing,
} from '../lib/containers'

const VIEW_KEY = 'groh-sowing-view'
const readView = () => { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'cards' } catch { return 'cards' } }

// Det som skiljer två påsar av samma frö åt: sort (om den inte redan står i namnet), fröfirma och årgång.
function seedDetail(seed) {
  const cultivar = seed.cultivar?.trim()
  const parts = [
    cultivar && !seed.name.toLowerCase().includes(cultivar.toLowerCase()) ? cultivar : null,
    seed.supplier?.trim() || null,
    seed.packed_for_season ? String(seed.packed_for_season) : null,
  ]
  return parts.filter(Boolean).join(' · ')
}

const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']

function NewContainer({ onCreated, onCancel }) {
  const [kind, setKind] = useState('tray')
  const [slots, setSlots] = useState(DEFAULT_TRAY_SLOTS)
  const [color, setColor] = useState('yellow')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const n = Number(slots)
    if (kind === 'tray' && !(n >= 1 && n <= 200)) { setError('Skriv hur många platser brättet har, 1–200.'); return }
    setBusy(true); setError('')
    try { onCreated(await createContainer({ name, color, kind, slots: n })) } catch { setError('Kärlet gick inte att spara. Försök igen.'); setBusy(false) }
  }

  const preview = containerLabel({ name, color, kind })
  return (
    <section className="card" style={{ display: 'grid', gap: '4px' }}>
      <SectionLabel style={{ margin: '0 0 8px' }}>Nytt kärl</SectionLabel>
      <div className="field">
        <span className="field-label" id="kind-label">Sort</span>
        <div className="chips" role="radiogroup" aria-labelledby="kind-label">
          {Object.entries(KINDS).map(([key, k]) => (
            <button key={key} type="button" className="chip" role="radio" aria-checked={kind === key} onClick={() => setKind(key)}>{k.label}</button>
          ))}
        </div>
      </div>
      {kind === 'tray' && (
        <div className="field">
          <label className="field-label" htmlFor="slots">Antal platser</label>
          <input id="slots" className="field-input" type="number" inputMode="numeric" min="1" max="200" value={slots}
            onChange={e => { setSlots(e.target.value); setError('') }} style={{ maxWidth: '120px' }} />
          <p className="field-hint">Platserna numreras 1, 2, 3 … Hur de sitter i brättet bestämmer du.</p>
        </div>
      )}
      <div className="field">
        <span className="field-label" id="color-label">Färgdutt</span>
        <div className="chips" role="radiogroup" aria-labelledby="color-label">
          {COLORS.map(c => (
            <button key={c.key} type="button" className="chip" role="radio" aria-checked={color === c.key} onClick={() => setColor(c.key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <MarkDot color={c.key} /> {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="cname">Namn (valfritt)</label>
        <input id="cname" className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder={preview} />
        <p className="field-hint">Utan namn heter det {preview}.</p>
      </div>
      {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Sparar …' : 'Spara kärlet'}</Button>
        <Button variant="ghost" onClick={onCancel}>Avbryt</Button>
      </div>
    </section>
  )
}

export default function SowingDay({ onDone, onBack }) {
  const season = currentSeason()
  const [containers, setContainers] = useState(null)
  const [taken, setTaken] = useState({})
  const [seeds, setSeeds] = useState([])
  const [frost, setFrost] = useState(null)
  const [creating, setCreating] = useState(false)
  const [container, setContainer] = useState(null)
  const [date, setDate] = useState(isoDate(new Date()))
  const [assigned, setAssigned] = useState({})     // plats → frö (brätte, kruka)
  const [bedSeeds, setBedSeeds] = useState([])     // friland: fröer utan platser
  const [selected, setSelected] = useState(null)   // vald plats
  const [lastSeed, setLastSeed] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState(readView)
  const [imageIndex, setImageIndex] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => { loadImageIndex().then(setImageIndex).catch(() => {}) }, [])
  function changeView(v) { setView(v); try { localStorage.setItem(VIEW_KEY, v) } catch { /* inte sparat */ } }

  useEffect(() => {
    let live = true
    Promise.all([listContainers(), loadActiveSowings(), supabase.from('seeds').select('*').eq('is_archived', false).order('name'), frostSettings()])
      .then(([c, sowings, s, f]) => {
        if (!live) return
        setContainers(c); setTaken(occupiedSlots(sowings)); setSeeds(s.data || []); setFrost(f)
        if (!c.length) setCreating(true)
      })
      .catch(() => { if (live) { setContainers([]); setError('Kärlen gick inte att hämta.') } })
    return () => { live = false }
  }, [])

  // Fröerna i såordning: grupperade på månaden då de föreslås sås.
  const byMonth = useMemo(() => {
    if (!frost) return []
    const rows = seeds.map(seed => ({ seed, start: suggestionFor(seed, null, frost, { season }).start }))
      .sort((a, b) => a.start.localeCompare(b.start) || a.seed.name.localeCompare(b.seed.name, 'sv'))
    const groups = []
    for (const r of rows) {
      const m = Number(r.start.slice(5, 7)) - 1
      if (groups.at(-1)?.month !== m) groups.push({ month: m, seeds: [] })
      groups.at(-1).seeds.push(r.seed)
    }
    return groups
  }, [seeds, frost, season])

  if (!containers) {
    return <p role="status" className="t-body" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>Hämtar dina kärl …</p>
  }

  const count = container ? slotCount(container) : null
  const takenHere = container ? taken[container.id] || new Map() : new Map()
  const freeSlots = count ? Array.from({ length: count }, (_, i) => i + 1).filter(n => !takenHere.has(n)) : []

  function choose(c) {
    setContainer(c); setCreating(false); setAssigned({}); setBedSeeds([]); setError('')
    const first = slotCount(c) ? Array.from({ length: slotCount(c) }, (_, i) => i + 1).find(n => !(taken[c.id] || new Map()).has(n)) : null
    setSelected(first ?? null)
  }

  function pick(seed) {
    setError('')
    if (container.kind === 'bed') {
      setBedSeeds(prev => (prev.some(s => s.id === seed.id) ? prev.filter(s => s.id !== seed.id) : [...prev, seed]))
      return
    }
    if (selected == null) return
    const next = { ...assigned, [selected]: seed }
    setAssigned(next); setLastSeed(seed)
    // Vidare till nästa lediga plats, så går det fort att fylla ett brätte.
    const after = freeSlots.find(n => n > selected && !next[n])
    setSelected(after ?? null)
  }

  function clearSlot(n) {
    const next = { ...assigned }; delete next[n]; setAssigned(next)
  }

  async function save() {
    const entries = container.kind === 'bed'
      ? bedSeeds.map(seed => ({ seed, slots: [] }))
      : Object.values(Object.entries(assigned).reduce((acc, [n, seed]) => {
          (acc[seed.id] ||= { seed, slots: [] }).slots.push(Number(n)); return acc
        }, {}))
    if (!entries.length) { setError('Välj minst ett frö först.'); return }
    if (!date) { setError('Skriv vilket datum du sådde.'); return }
    setBusy(true); setError('')
    try { await saveSowing({ container, date, entries, frost }); onDone?.() } catch { setError('Sådden gick inte att spara. Försök igen.'); setBusy(false) }
  }

  const page = { maxWidth: '390px', margin: '0 auto', padding: '24px 16px calc(100px + env(safe-area-inset-bottom))', display: 'grid', gap: '16px' }

  // ── Steg 1: välj kärl ────────────────────────────────────────────────────
  if (!container) {
    return (
      <div style={page}>
        <div>
          <Button variant="link" onClick={onBack}>← Årets sådd</Button>
          <h1 className="t-display-m" style={{ margin: '8px 0 4px' }}>Sådag</h1>
          <p className="t-small" style={{ color: 'var(--text-muted)', margin: 0 }}>Var sår du i dag?</p>
        </div>
        {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
        {containers.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {containers.map(c => {
              const n = slotCount(c); const used = (taken[c.id] || new Map()).size
              const status = n == null ? (used ? 'Något växer här' : 'Ledigt') : used >= n ? 'Fullt' : used ? `${used} av ${n} platser upptagna` : `${n} ${n === 1 ? 'plats' : 'platser'}, ledigt`
              return (
                <button key={c.id} type="button" className="card card--compact" onClick={() => choose(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                  <MarkDot color={c.color} large />
                  <span>
                    <span className="t-body" style={{ display: 'block' }}>{containerLabel(c)}</span>
                    <span className="t-caption" style={{ color: 'var(--text-muted)' }}>{status}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {creating
          ? <NewContainer onCreated={c => { setContainers(prev => [...prev, c]); choose(c) }} onCancel={() => setCreating(false)} />
          : <Button full onClick={() => setCreating(true)}>+ Nytt kärl</Button>}
      </div>
    )
  }

  // ── Steg 2: fyll platserna ───────────────────────────────────────────────
  const chosenIds = new Set(container.kind === 'bed' ? bedSeeds.map(s => s.id) : [])
  const isPicked = seed => (container.kind === 'bed' ? chosenIds.has(seed.id) : assigned[selected]?.id === seed.id)
  const filled = container.kind === 'bed' ? bedSeeds.length : Object.keys(assigned).length
  const q = query.trim().toLowerCase()
  const matches = seed => !q || [seed.name, seed.cultivar, seed.supplier, seed.species].some(v => v?.toLowerCase().includes(q))
  const groups = byMonth.map(g => ({ ...g, seeds: g.seeds.filter(matches) })).filter(g => g.seeds.length)
  const noun = container.kind === 'pot' ? 'Din kruka' : 'Ditt brätte'
  const hint = container.kind === 'bed'
    ? 'Välj ett eller flera fröer.'
    : selected != null ? 'Välj ett frö för den markerade platsen.'
      : filled ? 'Tryck på en plats för att ändra den.' : 'Tryck på en plats för att välja frö.'

  return (
    <div style={page}>
      <div>
        <Button variant="link" onClick={() => setContainer(null)}>← Välj ett annat kärl</Button>
        <h1 className="t-display-m" style={{ margin: '8px 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MarkDot color={container.color} large /> {containerLabel(container)}
        </h1>
        <p className="t-small" style={{ margin: 0, color: 'var(--text-muted)' }}>
          {container.kind === 'bed' ? 'Din sådd på friland' : 'Din sådd, plats för plats'}
        </p>
      </div>

      <label className="date-row" htmlFor="sown">
        <Icon name="calendar" size={24} color="var(--text-muted)" />
        <span className="t-small" style={{ color: 'var(--text-muted)' }}>Sådatum</span>
        <input id="sown" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </label>

      {count != null && (
        <section style={{ display: 'grid', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
            <h2 className="t-heading" style={{ margin: 0 }}>{noun}</h2>
            <span className="t-small" style={{ color: 'var(--text-muted)' }}>{filled} av {freeSlots.length} fyllda</span>
          </div>
          {freeSlots.length === 0 && <p className="t-small" style={{ margin: 0 }}>Alla platser är upptagna. Skola om eller välj ett annat kärl.</p>}
          <div className="card slots">
            {Array.from({ length: count }, (_, i) => i + 1).map(n => {
              const busyName = takenHere.get(n)
              if (busyName) {
                return <div key={n} className="slot slot--taken"><span className="slot__no">{n}</span><span className="slot__name">{busyName}</span></div>
              }
              const seed = assigned[n]
              return (
                <button key={n} type="button" className={`slot${seed ? ' slot--filled' : ''}`} aria-pressed={selected === n}
                  aria-label={`Plats ${n}: ${seed ? seed.name : 'tom'}`} onClick={() => setSelected(n)}>
                  <span className="slot__no">{n}</span><span className="slot__name">{seed ? seed.name : '+ frö'}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {container.kind === 'bed' && bedSeeds.length > 0 && (
        <p className="t-small" style={{ margin: 0 }}>Valda: {bedSeeds.map(s => s.name).join(', ')}</p>
      )}

      {(container.kind === 'bed' || selected != null) && (
        <section className="picker" aria-labelledby="picker-title">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <h2 id="picker-title" className="t-heading" style={{ margin: 0 }}>
              {container.kind === 'bed' ? 'Vad sår du?' : `Vad ska stå på plats ${selected}?`}
            </h2>
            {seeds.length > 0 && (
              <div className="view-toggle" role="radiogroup" aria-label="Visa fröerna som">
                {[['list', 'Lista', 'list'], ['cards', 'Kort', 'grid']].map(([key, label, icon]) => (
                  <button key={key} type="button" role="radio" aria-checked={view === key} aria-label={label} title={label} onClick={() => changeView(key)}>
                    <Icon name={icon} size={22} color="currentColor" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {container.kind !== 'bed' && (assigned[selected] || lastSeed) && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {lastSeed && !assigned[selected] && <Button onClick={() => pick(lastSeed)}>Samma igen: {lastSeed.name}</Button>}
              {assigned[selected] && <Button variant="ghost" onClick={() => clearSlot(selected)}>Töm platsen</Button>}
            </div>
          )}
          {seeds.length > 6 && (
            <label className="search-field">
              <Icon name="search" size={20} color="var(--text-muted)" />
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Sök bland dina fröer" aria-label="Sök bland dina fröer" />
            </label>
          )}
          {groups.map(g => (
            <div key={g.month} style={{ display: 'grid', gap: '8px' }}>
              <span className="t-caption" style={{ color: 'var(--text-muted)' }}>Sås i {MONTHS[g.month]}</span>
              {view === 'list' ? (
                <div className="chips">
                  {g.seeds.map(seed => {
                    const detail = seedDetail(seed)
                    return (
                      <button key={seed.id} type="button" className="chip" aria-pressed={isPicked(seed)}
                        onClick={() => pick(seed)}>{seed.name}{detail ? ` (${detail})` : ''}</button>
                    )
                  })}
                </div>
              ) : (
                <div className="pick-grid">
                  {g.seeds.map(seed => {
                    const detail = seedDetail(seed)
                    const on = isPicked(seed)
                    return (
                      <button key={seed.id} type="button" className="pick-card" aria-pressed={on} onClick={() => pick(seed)}>
                        <SeedImage image={imageIndex && imageFor(seed, imageIndex)} name={seed.name} className="pick-card__image" />
                        <span className="pick-card__name">{seed.name}</span>
                        {detail && <span className="pick-card__detail">{detail}</span>}
                        <span className="pick-card__foot">
                          <span>{on ? 'Vald' : 'Välj frö'}</span>
                          {!on && <Icon name="plus" size={20} color="currentColor" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {q && !groups.length && <p className="t-small" style={{ margin: 0 }}>Inget frö matchar ”{query.trim()}”.</p>}
          {imageIndex && view === 'cards' && groups.some(g => g.seeds.some(seed => imageFor(seed, imageIndex))) && (
            <AiNote>Illustrationerna är gjorda med AI, i Ernst Haeckels manér.</AiNote>
          )}
          {!seeds.length && <p className="t-small" style={{ margin: 0 }}>Du har inga fröer än. Lägg till fröer under Fröer först.</p>}
        </section>
      )}

      {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
      <div style={{ display: 'grid', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <p className="t-small" style={{ margin: 0, color: 'var(--text-muted)' }}>{hint}</p>
        <Button variant="primary" full large onClick={save} disabled={busy}>
          {busy ? 'Sparar …' : filled ? `Spara sådden (${filled} ${container.kind === 'bed' ? (filled === 1 ? 'frö' : 'fröer') : (filled === 1 ? 'plats' : 'platser')})` : 'Spara sådden'}
        </Button>
      </div>
    </div>
  )
}
