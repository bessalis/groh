// Årets sådd: vad som ska göras nu och framåt, och vilka fröer som ska sås i år.
// Nås från Planera på startsidan. Stegen räknas ut i lib/timeline.js.

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, SectionLabel } from '../components/ui'
import { ROMAN } from '../lib/zone'
import { lastFrost, isoDate, TEMPLATES } from '../lib/timeline'
import { currentSeason, frostSettings, loadSeason, timelineFor, nextStep, markDone, suggestionFor, addToSeason } from '../lib/sowing'
import { containerLabel, loadActiveSowings, waitingText, dayOf, inContainer, hasGerminated } from '../lib/containers'
import MarkDot from '../components/MarkDot'

const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
const dayText = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })
const SOON_DAYS = 7

function whenText(iso, todayIso) {
  const diff = Math.round((new Date(`${iso}T12:00:00Z`) - new Date(`${todayIso}T12:00:00Z`)) / 86400000)
  if (diff === 0) return 'i dag'
  if (diff === 1) return 'i morgon'
  if (diff === -1) return 'i går'
  if (diff < 0) return `för ${-diff} dagar sedan`
  if (diff <= SOON_DAYS) return `om ${diff} dagar`
  return dayText(iso)
}

export default function SowingPlan({ onOpenSeed, onSowingDay }) {
  const season = currentSeason()
  const todayIso = isoDate(new Date())
  const [frost, setFrost] = useState(null)
  const [plants, setPlants] = useState(null)
  const [sowings, setSowings] = useState([])
  const [candidates, setCandidates] = useState([])
  const [picked, setPicked] = useState(new Set())
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const [f, season_, seeds, active] = await Promise.all([
      frostSettings(),
      loadSeason(season),
      supabase.from('seeds').select('*').eq('is_archived', false).order('name'),
      loadActiveSowings().catch(() => []),
    ])
    const planned = new Set(season_.map(p => p.seed_id))
    return { f, season_, active, free: (seeds.data || []).filter(s => !planned.has(s.id)) }
  }
  async function reload() {
    const r = await load()
    setFrost(r.f); setPlants(r.season_); setSowings(r.active); setCandidates(r.free)
  }
  useEffect(() => {
    let live = true
    load().then(r => { if (live) { setFrost(r.f); setPlants(r.season_); setSowings(r.active); setCandidates(r.free) } })
      .catch(() => { if (live) { setPlants([]); setError('Årets sådd gick inte att hämta.') } })
    return () => { live = false }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  async function done(plant, step) {
    setBusy(plant.id); setError('')
    try { await markDone(plant, step, todayIso); await reload() } catch { setError('Det gick inte att spara.') }
    setBusy('')
  }

  async function addPicked() {
    setBusy('add'); setError('')
    try {
      for (const seed of candidates.filter(s => picked.has(s.id))) {
        await addToSeason(seed, suggestionFor(seed, null, frost, { season }), season)
      }
      setPicked(new Set())
      await reload()
    } catch { setError('Alla fröer kunde inte läggas till. Försök igen.') }
    setBusy('')
  }

  if (!plants || !frost) {
    return <p role="status" className="t-body" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>Hämtar årets sådd …</p>
  }

  // Nästa steg per plantering, sorterat på datum.
  const rows = plants.map(p => {
    const timeline = timelineFor(p, p.seed, p.variety, frost)
    return { plant: p, next: nextStep(timeline), timeline }
  })
  // Groningen följs per kärl (I kärlen), så den visas inte en gång till här.
  const active = rows.filter(r => r.next && !(r.plant.sowing_id && r.next.step === 'germinate')).sort((a, b) => a.next.date.localeCompare(b.next.date))
  const soonLimit = isoDate(new Date(Date.now() + SOON_DAYS * 86400000))
  const now = active.filter(r => r.next.date <= soonLimit)
  const later = active.filter(r => r.next.date > soonLimit)
  const byMonth = later.reduce((acc, r) => {
    const m = Number(r.next.date.slice(5, 7)) - 1
    ;(acc[m] ||= []).push(r)
    return acc
  }, {})
  const finished = rows.filter(r => !r.next)
  const frostDate = lastFrost(season, frost)

  const Row = ({ r, showButton }) => (
    <li style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '8px', alignItems: 'center' }}>
      <button type="button" onClick={() => onOpenSeed?.(r.plant.seed)} style={{ all: 'unset', cursor: 'pointer', minWidth: 0 }}>
        <span className="t-body" style={{ display: 'block' }}>{r.plant.seed.name}</span>
        <span className="t-caption" style={{ color: 'var(--text-muted)' }}>{r.next.label} {whenText(r.next.date, todayIso)}</span>
      </button>
      {showButton && <Button onClick={() => done(r.plant, r.next.step)} disabled={Boolean(busy)}>{busy === r.plant.id ? 'Sparar …' : 'Gjort'}</Button>}
    </li>
  )

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', padding: '24px 16px calc(100px + env(safe-area-inset-bottom))', display: 'grid', gap: '16px' }}>
      <div>
        <h1 className="t-display-m" style={{ margin: '0 0 4px' }}>Årets sådd</h1>
        <p className="t-small" style={{ color: 'var(--text-muted)', margin: 0 }}>
          Sista frost runt {dayText(isoDate(frostDate))} {frost.override ? '(ditt eget datum)' : `(ungefär för zon ${ROMAN[frost.zone]})`}. Ändra under Profil.
        </p>
      </div>

      <Button variant="primary" full large onClick={onSowingDay}>Sådag – så i ett kärl</Button>

      {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}

      {sowings.length > 0 && (
        <section style={{ display: 'grid', gap: '10px' }}>
          <SectionLabel style={{ margin: 0 }}>I kärlen</SectionLabel>
          {sowings.map(s => {
            const day = dayOf(s.sown_date, todayIso)
            return (
              <article key={s.id} className="card" style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MarkDot color={s.container.color} large />
                  <div>
                    <h3 className="t-heading-s" style={{ margin: 0 }}>{containerLabel(s.container)}</h3>
                    <span className="t-caption" style={{ color: 'var(--text-muted)' }}>
                      {day > 0 ? `Dag ${day}` : day === 0 ? 'Sått i dag' : 'Planerad'} · sått {dayText(s.sown_date)}
                    </span>
                  </div>
                </div>
                <p className="t-small" style={{ margin: 0, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)' }}>{waitingText(s, todayIso)}</p>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
                  {s.plants.filter(inContainer).map(p => {
                    const grown = hasGerminated(p)
                    const place = p.slots?.length ? `Plats ${p.slots.length > 1 ? `${p.slots[0]}–${p.slots.at(-1)}` : p.slots[0]}` : null
                    return (
                      <li key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '8px', alignItems: 'center' }}>
                        <button type="button" onClick={() => onOpenSeed?.(p.seed)} style={{ all: 'unset', cursor: 'pointer', minWidth: 0 }}>
                          <span className="t-body" style={{ display: 'block' }}>{p.seed.name}</span>
                          <span className="t-caption" style={{ color: 'var(--text-muted)' }}>{[place, grown ? 'grott' : 'väntar'].filter(Boolean).join(' · ')}</span>
                        </button>
                        {!grown && day >= 0 && (
                          <Button onClick={() => done(p, 'germinate')} disabled={Boolean(busy)}>{busy === p.id ? 'Sparar …' : 'Grott'}</Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </article>
            )
          })}
        </section>
      )}

      {plants.length === 0 && (
        <p className="t-body" style={{ margin: 0 }}>Inget i årets sådd än. Välj fröer nedan, så får de en tidslinje.</p>
      )}

      {now.length > 0 && (
        <section className="card card--soft" style={{ display: 'grid', gap: '10px' }}>
          <SectionLabel style={{ margin: 0 }}>Att göra nu</SectionLabel>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px' }}>
            {now.map(r => <Row key={r.plant.id} r={r} showButton />)}
          </ul>
        </section>
      )}

      {Object.entries(byMonth).map(([m, list]) => (
        <section key={m} className="card" style={{ display: 'grid', gap: '10px' }}>
          <SectionLabel style={{ margin: 0 }}>{MONTHS[m]}</SectionLabel>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px' }}>
            {list.map(r => <Row key={r.plant.id} r={r} />)}
          </ul>
        </section>
      ))}

      {finished.length > 0 && (
        <p className="t-small" style={{ color: 'var(--text-muted)', margin: 0 }}>
          Klara med alla steg: {finished.map(r => r.plant.seed.name).join(', ')}.
        </p>
      )}

      {candidates.length > 0 && (
        <section className="card" style={{ display: 'grid', gap: '10px' }}>
          <SectionLabel style={{ margin: 0 }}>Välj fröer att så {season}</SectionLabel>
          <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0 }}>
            Varje frö får ett förslag på hur och när utifrån påsen. Du kan ändra på fröets sida.
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '6px' }}>
            {candidates.map(seed => {
              const s = suggestionFor(seed, null, frost, { season })
              const id = `pick-${seed.id}`
              return (
                <li key={seed.id}>
                  <label htmlFor={id} style={{ display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr)', gap: '10px', alignItems: 'start', cursor: 'pointer', minHeight: '44px' }}>
                    <input id={id} type="checkbox" checked={picked.has(seed.id)} style={{ width: '20px', height: '20px', marginTop: '2px' }}
                      onChange={e => setPicked(prev => { const n = new Set(prev); if (e.target.checked) n.add(seed.id); else n.delete(seed.id); return n })} />
                    <span>
                      <span className="t-body" style={{ display: 'block' }}>{seed.name}</span>
                      <span className="t-caption" style={{ color: 'var(--text-muted)' }}>{TEMPLATES[s.template].label}, {s.template === 'bulb' ? 'sätt' : 'så'} runt {dayText(s.start)}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          <Button variant="primary" full onClick={addPicked} disabled={!picked.size || Boolean(busy)}>
            {busy === 'add' ? 'Lägger till …' : picked.size ? `Lägg till ${picked.size} ${picked.size === 1 ? 'frö' : 'fröer'}` : 'Välj fröer ovan'}
          </Button>
        </section>
      )}
    </div>
  )
}
