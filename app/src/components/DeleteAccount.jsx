// Radera konto (Profil). Två steg: förklaring, sedan skriv "radera" och bekräfta.
// Servern (/api/delete-account) tar bort påsfoton, fröer, plantor, skanningar,
// höstbokslut och själva kontot. Den delade växtdatan ligger kvar.

import { useState } from 'react'
import { Button } from './ui'
import { callAi } from '../lib/api'
import { supabase } from '../lib/supabase'

export default function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    setBusy(true); setError('')
    try {
      await callAi('/api/delete-account', { confirm: 'RADERA' })
      await supabase.auth.signOut()
    } catch (err) {
      setError(err?.message || 'Kontot kunde inte raderas. Försök igen.')
      setBusy(false)
    }
  }

  if (!open) {
    return <Button variant="danger-ghost" full onClick={() => setOpen(true)}>Radera konto</Button>
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '10px' }}>
      <h2 className="t-heading-s" style={{ margin: 0 }}>Radera ditt konto?</h2>
      <p className="t-small" style={{ margin: 0 }}>
        Allt ditt tas bort för gott: fröer, påsfoton, anteckningar, sådder, höstbokslut och inloggningen. Det går inte att ångra.
      </p>
      <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0 }}>
        Kvar blir bara gemensam växtfakta som inte är knuten till dig, till exempel en arts latinska namn och såtips.
      </p>
      <div className="field">
        <label className="field-label" htmlFor="confirm-delete">Skriv <strong>radera</strong> för att bekräfta</label>
        <input id="confirm-delete" className="field-input" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" autoCapitalize="none" />
      </div>
      {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
      <Button variant="danger" full onClick={remove} disabled={typed.trim().toLowerCase() !== 'radera' || busy}>
        {busy ? 'Raderar …' : 'Radera mitt konto'}
      </Button>
      <Button variant="ghost" full onClick={() => { setOpen(false); setTyped(''); setError('') }} disabled={busy}>Avbryt</Button>
    </div>
  )
}
