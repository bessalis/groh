// "I kärlen": aktiva sådder per kärl, med dag N, väntetext och knappen Grott.
// Visas överst i Mina frön och på Årets sådd. Hämtar själv. Skickar sidan med
// onChange anropas den när något sparats; sidan läser då om och ökar reloadKey.

import { useEffect, useState } from 'react'
import { Button, SectionLabel } from './ui'
import MarkDot from './MarkDot'
import { isoDate } from '../lib/timeline'
import { markDone } from '../lib/sowing'
import { containerLabel, loadActiveSowings, waitingText, dayOf, inContainer, hasGerminated } from '../lib/containers'

const dayText = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })

export default function ContainerCards({ onOpenSeed, onChange, reloadKey }) {
  const todayIso = isoDate(new Date())
  const [sowings, setSowings] = useState([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    loadActiveSowings().then(s => { if (live) setSowings(s) }).catch(() => {})
    return () => { live = false }
  }, [reloadKey])

  async function germinated(plant) {
    setBusy(plant.id); setError('')
    try {
      await markDone(plant, 'germinate', todayIso)
      // Sidan runt omkring läser om och ökar reloadKey, annars läser vi om här.
      if (onChange) await onChange()
      else setSowings(await loadActiveSowings())
    } catch { setError('Det gick inte att spara.') }
    setBusy('')
  }

  if (!sowings.length) return null

  return (
    <section style={{ display: 'grid', gap: '10px' }}>
      <SectionLabel style={{ margin: 0 }}>I kärlen</SectionLabel>
      {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
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
                      <Button onClick={() => germinated(p)} disabled={Boolean(busy)}>{busy === p.id ? 'Sparar …' : 'Grott'}</Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </article>
        )
      })}
    </section>
  )
}
