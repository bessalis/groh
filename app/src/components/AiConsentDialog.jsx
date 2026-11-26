// Frågan om samtycke innan fröpåsarnas foton skickas till AI första gången.
// Monteras en gång i App och visas när ensurePhotoConsent() behöver ett svar.

import { useEffect, useRef, useState } from 'react'
import { Button } from './ui'
import { onPhotoConsentRequest, setPhotoConsent } from '../lib/aiConsent'

export default function AiConsentDialog({ onReadMore }) {
  const [pending, setPending] = useState(null)   // resolve-funktion medan frågan visas
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef(null)

  useEffect(() => onPhotoConsentRequest(resolve => setPending(() => resolve)), [])
  useEffect(() => {
    const el = dialog.current
    if (pending && el && !el.open) el.showModal()
    if (!pending && el?.open) el.close()
  }, [pending])

  function answer(ok) {
    pending?.(ok)
    setPending(null); setError('')
  }

  async function accept() {
    setSaving(true); setError('')
    try { await setPhotoConsent(true); answer(true) } catch { setError('Det gick inte att spara. Försök igen.') }
    setSaving(false)
  }

  return (
    <dialog ref={dialog} className="consent-dialog" aria-labelledby="consent-title" onCancel={e => { e.preventDefault(); answer(false) }}>
      <h2 id="consent-title" className="t-heading" style={{ margin: '0 0 8px' }}>Får AI läsa dina fröpåsar?</h2>
      <p className="t-body" style={{ margin: '0 0 8px' }}>
        När du fotograferar fröpåsar skickas fotona till Anthropic, som gör AI-modellen Claude. AI:n läser namn, sort och såinformation, och du granskar allt innan något sparas.
      </p>
      <p className="t-small" style={{ color: 'var(--text-muted)', margin: '0 0 16px' }}>
        Anthropic tränar inte sina modeller på det som skickas och raderar det normalt inom 30 dagar. Fotona sparas i Groh! (Supabase, Stockholm) och bara du kan se dem. Du kan ändra ditt svar under Profil → AI i Groh!.
      </p>
      {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: '0 0 12px' }}>{error}</p>}
      <div style={{ display: 'grid', gap: '8px' }}>
        <Button variant="primary" full onClick={accept} disabled={saving}>{saving ? 'Sparar …' : 'Ja, det går bra'}</Button>
        <Button full onClick={() => answer(false)} disabled={saving}>Inte nu</Button>
        {onReadMore && <Button variant="link" onClick={() => { answer(false); onReadMore() }}>Läs mer om AI i Groh!</Button>}
      </div>
    </dialog>
  )
}
