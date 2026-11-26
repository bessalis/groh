// Välj frö på sådagen: som kort (med bild) eller som lista, sorterat på såtid
// eller namn. Valet av visning och sortering sparas i webbläsaren.

import { useEffect, useMemo, useState } from 'react'
import SeedImage from './SeedImage'
import { loadImageIndex, imageFor } from '../lib/seedImages'
import { seedTitle } from '../lib/packet'

const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
const STORE = 'groh.seedPicker'

function readPrefs() {
  try { return { view: 'cards', sort: 'time', ...JSON.parse(localStorage.getItem(STORE) || '{}') } } catch { return { view: 'cards', sort: 'time' } }
}
function savePrefs(p) {
  try { localStorage.setItem(STORE, JSON.stringify(p)) } catch { /* privat läge e.d., spelar ingen roll */ }
}

function Toggle({ label, value, options, onChange }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map(([key, text]) => (
        <button key={key} type="button" className="chip" role="radio" aria-checked={value === key} onClick={() => onChange(key)}>{text}</button>
      ))}
    </div>
  )
}

/**
 * rows = [{ seed, start: 'YYYY-MM-DD' }] (föreslaget sådatum).
 * isSelected(seed) → bool, onPick(seed).
 */
export default function SeedPicker({ rows, isSelected, onPick, multi }) {
  const [prefs, setPrefs] = useState(readPrefs)
  const [images, setImages] = useState(null)
  useEffect(() => { let live = true; loadImageIndex().then(i => { if (live) setImages(i) }); return () => { live = false } }, [])

  const update = patch => setPrefs(prev => { const next = { ...prev, ...patch }; savePrefs(next); return next })

  const groups = useMemo(() => {
    if (prefs.sort === 'name') {
      return [{ label: null, rows: [...rows].sort((a, b) => seedTitle(a.seed).localeCompare(seedTitle(b.seed), 'sv')) }]
    }
    const sorted = [...rows].sort((a, b) => a.start.localeCompare(b.start) || seedTitle(a.seed).localeCompare(seedTitle(b.seed), 'sv'))
    const out = []
    for (const r of sorted) {
      const label = MONTHS[Number(r.start.slice(5, 7)) - 1]
      if (out.at(-1)?.label !== label) out.push({ label, rows: [] })
      out.at(-1).rows.push(r)
    }
    return out
  }, [rows, prefs.sort])

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <Toggle label="Visa som" value={prefs.view} options={[['cards', 'Kort'], ['list', 'Lista']]} onChange={view => update({ view })} />
        <Toggle label="Sortera" value={prefs.sort} options={[['time', 'Såtid'], ['name', 'A–Ö']]} onChange={sort => update({ sort })} />
      </div>

      {groups.map(g => (
        <div key={g.label || 'all'} style={{ display: 'grid', gap: '8px' }}>
          {g.label && <span className="t-caption" style={{ color: 'var(--text-muted)' }}>{g.label}</span>}
          <div className={prefs.view === 'cards' ? 'seed-pick-grid' : 'seed-pick-list'}>
            {g.rows.map(({ seed }) => {
              const image = images ? imageFor(seed, images) : null
              const title = seedTitle(seed)
              return (
                <button key={seed.id} type="button" className={`seed-pick seed-pick--${prefs.view}`}
                  aria-pressed={isSelected(seed)} onClick={() => onPick(seed)}>
                  <SeedImage image={image} name={title} className="seed-pick__image" />
                  <span className="seed-pick__name">{title}</span>
                  {multi && isSelected(seed) && <span className="t-caption" style={{ color: 'var(--text-accent)' }}>Vald</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
