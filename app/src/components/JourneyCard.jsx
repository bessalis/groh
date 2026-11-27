// En gro-resa på fröets sida: samma frö sått samma dag. Visar var fröerna
// står, dag N och OG-faserna Frö → Grodd → Växer → Mogen. Faserna räknas
// fram ur stegen; trycker man på en fas sparas det som ett steg på hela resan.

import { forwardRef, useState } from 'react'
import { SectionLabel } from './ui'
import { Icon } from './Icon'
import MarkDot from './MarkDot'
import { isoDate } from '../lib/timeline'
import { PHASES, placesOf, setJourneyPhase, stepForPhase } from '../lib/journeys'
import { containerLabel, dayOf, waitingText } from '../lib/containers'

const dayText = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })

const NEXT = {
  growing: 'Plantan växer. Ge den ljus, och härda av den några dagar innan den planteras ut.',
  mature: 'Plantan blommar eller ger skörd. Anteckna gärna hur det gick, så minns du det till nästa år.',
}

const slotText = slots => (slots.length > 1 ? `plats ${slots[0]}–${slots.at(-1)}` : slots.length ? `plats ${slots[0]}` : null)

const JourneyCard = forwardRef(function JourneyCard({ journey, highlight, onChanged, children }, ref) {
  const todayIso = isoDate(new Date())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const day = dayOf(journey.sownDate, todayIso)
  const current = journey.phase || 'seed'
  const order = PHASES.map(p => p.id)
  const places = placesOf(journey)
  const count = journey.plants.reduce((n, p) => n + Math.max(1, p.slots?.length || 0), 0)

  async function choose(phase) {
    if (phase === current || busy) return
    setBusy(true); setError('')
    try { await setJourneyPhase(journey, phase, todayIso); await onChanged?.() } catch { setError('Det gick inte att spara.') }
    setBusy(false)
  }

  const text = current === 'seed' || current === 'seedling'
    ? waitingText({ sown_date: journey.sownDate, plants: journey.plants }, todayIso)
    : NEXT[current]

  return (
    <section ref={ref} className={`card journey${highlight ? ' journey--highlight' : ''}`} aria-label={`Sådd ${dayText(journey.sownDate)}`}>
      <div style={{ display: 'grid', gap: '2px' }}>
        <SectionLabel as="h3" style={{ margin: 0 }}>Sått {dayText(journey.sownDate)}</SectionLabel>
        <span className="t-small" style={{ color: 'var(--text-muted)' }}>
          {day > 0 ? `Dag ${day}` : day === 0 ? 'Sått i dag' : 'Planerad'}
          {count > 1 ? ` · ${count} platser` : ''}
        </span>
      </div>

      {places.length > 0 && (
        <ul className="journey__places">
          {places.map((pl, i) => (
            <li key={i}><MarkDot color={pl.container.color} /> {[containerLabel(pl.container), slotText(pl.slots)].filter(Boolean).join(', ')}</li>
          ))}
        </ul>
      )}

      <div className="phases" role="group" aria-label="Fas">
        {PHASES.map(phase => {
          const active = phase.id === current
          const passed = order.indexOf(current) > order.indexOf(phase.id)
          const possible = journey.plants.some(p => stepForPhase(phase.id, p.template))
          return (
            <button key={phase.id} type="button" className={`phase${active ? ' phase--active' : passed ? ' phase--passed' : ''}`}
              aria-pressed={active} disabled={!possible || busy} onClick={() => choose(phase.id)}>
              <span className="phase__dot"><Icon name={phase.icon} size={16} color="currentColor" /></span>
              <span className="phase__label">{phase.label}</span>
            </button>
          )
        })}
      </div>

      {text && <p className="t-small journey__text">{text}</p>}
      {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
      {children}
    </section>
  )
})

export default JourneyCard
