// Sista frostdatum i Profil: zonens ungefärliga datum, eller ett eget.
// Styr tidslinjerna i årets sådd (lib/timeline.js).

import { useEffect, useState } from 'react'
import { Button } from './ui'
import { LAST_FROST_BY_ZONE } from '../lib/timeline'
import { ROMAN } from '../lib/zone'
import { frostSettings, saveFrostOverride } from '../lib/sowing'

const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
const mdText = md => `${Number(md.slice(3))} ${MONTHS[Number(md.slice(0, 2)) - 1]}`

export default function FrostSetting() {
  const [frost, setFrost] = useState(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    frostSettings().then(f => { if (live) { setFrost(f); setValue(f.override || '') } }).catch(() => {})
    return () => { live = false }
  }, [])

  if (!frost) return null
  const zoneDefault = LAST_FROST_BY_ZONE[frost.zone]

  async function save(next) {
    setBusy(true); setError('')
    try { await saveFrostOverride(next); setFrost({ ...frost, override: next || null }); setValue(next || '') } catch { setError('Det gick inte att spara.') }
    setBusy(false)
  }

  // <input type="date"> kräver ett år; vi sparar bara månad och dag.
  const year = new Date().getFullYear()
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <label className="field-label" htmlFor="last-frost">Sista frostdatum på våren</label>
      <p className="t-small" style={{ margin: 0 }}>
        {frost.override ? `Ditt eget: ${mdText(frost.override)}.` : `Ungefär ${mdText(zoneDefault)} i zon ${ROMAN[frost.zone]}.`} Tidslinjerna i årets sådd räknas från det.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input id="last-frost" className="field-input" type="date" style={{ flex: '1 1 160px' }}
          value={value ? `${year}-${value}` : ''} onChange={e => setValue(e.target.value ? e.target.value.slice(5) : '')} />
        <Button onClick={() => save(value)} disabled={busy || !value || value === frost.override}>Spara</Button>
        {frost.override && <Button variant="ghost" onClick={() => save('')} disabled={busy}>Använd zonens</Button>}
      </div>
      {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
    </div>
  )
}
