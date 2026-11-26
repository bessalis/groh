// Årets sådd på fröets sida: lägg till fröet (mall och första datum, med förslag)
// och följ tidslinjen. "Gjort" sparar dagens datum, och stegen efter räknas om.

import { useEffect, useState } from 'react'
import { Button, SectionLabel } from './ui'
import { TEMPLATES } from '../lib/timeline'
import {
  currentSeason, frostSettings, plantForSeed, suggestionFor, addToSeason, removeFromSeason,
  markDone, undoDone, movePlanned, timelineFor, nextStep,
} from '../lib/sowing'

const dayText = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })
const today = () => new Date().toISOString().slice(0, 10)

export default function SeasonCard({ seed, variety, onChanged }) {
  const season = currentSeason()
  const [frost, setFrost] = useState(null)
  const [plant, setPlant] = useState(undefined)     // undefined = hämtas
  const [form, setForm] = useState(null)            // { template, start } när man lägger till
  const [editing, setEditing] = useState(null)      // { step, date } när ett datum ändras
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = () => Promise.all([frostSettings(), plantForSeed(seed.id, season)])
  async function reload() {
    const [f, p] = await load()
    setFrost(f); setPlant(p)
  }
  useEffect(() => {
    let live = true
    load().then(([f, p]) => { if (live) { setFrost(f); setPlant(p) } }).catch(() => { if (live) setPlant(null) })
    return () => { live = false }
  }, [seed.id])   // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn) {
    setBusy(true); setError('')
    try { await fn(); await reload(); onChanged?.() } catch (e) { setError(e?.message || 'Det gick inte att spara.') }
    setBusy(false)
  }

  if (plant === undefined || !frost) return null

  if (!plant) {
    if (!form) {
      return (
        <div className="card" style={{ marginBottom: '12px', display: 'grid', gap: '10px' }}>
          <SectionLabel style={{ margin: 0 }}>Årets sådd</SectionLabel>
          <p className="t-small" style={{ margin: 0 }}>Ska du så den {season}? Då får den en tidslinje med när du ska så, skola om och plantera ut.</p>
          <Button onClick={() => setForm(suggestionFor(seed, variety, frost, { season }))} style={{ justifySelf: 'start' }}>Lägg till i årets sådd</Button>
        </div>
      )
    }
    return (
      <div className="card" style={{ marginBottom: '12px', display: 'grid', gap: '12px' }}>
        <SectionLabel style={{ margin: 0 }}>Lägg till i årets sådd</SectionLabel>
        <div className="chips" role="radiogroup" aria-label="Hur den odlas">
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <button key={key} type="button" className="chip" role="radio" aria-checked={form.template === key}
              onClick={() => setForm({ ...suggestionFor(seed, variety, frost, { season }), template: key, ...(key === form.template ? { start: form.start } : {}) })}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="season-start">{form.template === 'bulb' ? 'Sätt' : 'Så'} ungefär</label>
          <input id="season-start" className="field-input" type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
          <p className="field-hint">Förslaget kommer från påsen och sista frostdatum i din zon. Ändra om du vill.</p>
        </div>
        {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" onClick={() => run(async () => { await addToSeason(seed, form, season); setForm(null) })} disabled={busy || !form.start}>Lägg till</Button>
          <Button variant="ghost" onClick={() => setForm(null)} disabled={busy}>Avbryt</Button>
        </div>
      </div>
    )
  }

  const timeline = timelineFor(plant, seed, variety, frost)
  const next = nextStep(timeline)

  return (
    <div className="card" style={{ marginBottom: '12px', display: 'grid', gap: '12px' }}>
      <SectionLabel style={{ margin: 0 }}>Årets sådd · {TEMPLATES[plant.template].label.toLowerCase()}</SectionLabel>
      <ol className="timeline">
        {timeline.map(s => {
          const isNext = next?.step === s.step
          return (
            <li key={s.step} className={`timeline__step${s.done ? ' timeline__step--done' : ''}${isNext ? ' timeline__step--next' : ''}`}>
              <span className="timeline__dot" aria-hidden="true">{s.done ? '✓' : ''}</span>
              <div className="timeline__body">
                <p className="t-body" style={{ margin: 0 }}>{s.label}</p>
                <p className="t-caption" style={{ margin: 0, color: 'var(--text-muted)' }}>
                  {s.done ? `Gjort ${dayText(s.date)}` : `${s.moved ? 'Flyttat till' : 'Runt'} ${dayText(s.date)}`}
                </p>
                {editing?.step === s.step && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'end', marginTop: '6px', flexWrap: 'wrap' }}>
                    <input className="field-input" type="date" aria-label={`Datum för ${s.label.toLowerCase()}`} value={editing.date}
                      onChange={e => setEditing({ ...editing, date: e.target.value })} style={{ flex: '1 1 160px' }} />
                    <Button onClick={() => run(() => (s.done ? markDone(plant, s.step, editing.date) : movePlanned(plant, s.step, editing.date))).then(() => setEditing(null))}
                      disabled={busy || !editing.date}>Spara</Button>
                    <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Avbryt</Button>
                  </div>
                )}
                {editing?.step !== s.step && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                    {!s.done && isNext && <Button variant="secondary" onClick={() => run(() => markDone(plant, s.step, today()))} disabled={busy}>Gjort i dag</Button>}
                    <Button variant="ghost" onClick={() => setEditing({ step: s.step, date: s.date })} disabled={busy}>{s.done ? 'Ändra datum' : 'Flytta'}</Button>
                    {s.done && <Button variant="ghost" onClick={() => run(() => undoDone(plant, s.step))} disabled={busy}>Ångra</Button>}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {!next && <p className="t-small" style={{ margin: 0 }}>Alla steg är gjorda. Nu får den växa!</p>}
      <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0 }}>
        Datumen räknas från sista frostdatum ({frost.override ? 'ditt eget' : 'ungefär för din zon'}). Gör du ett steg tidigare eller senare flyttas stegen efter.
      </p>
      {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
      <Button variant="danger-ghost" onClick={() => run(() => removeFromSeason(plant.id))} disabled={busy} style={{ justifySelf: 'start' }}>Ta bort från årets sådd</Button>
    </div>
  )
}
