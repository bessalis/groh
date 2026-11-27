// AI i Groh!: var och hur AI används, vad som skickas vart, och samtycket till
// att fröpåsarnas foton läses av AI. Nås från Profil och från samtyckesfrågan.

import { useEffect, useState } from 'react'
import { Button, SectionLabel } from '../components/ui'
import { photoConsentDate, setPhotoConsent } from '../lib/aiConsent'

const USES = [
  {
    title: 'Fotografera fröpåsar',
    what: 'AI läser namn, sort, fröfirma, årgång och såinformation från påsens fram- och baksida.',
    sent: 'Fotona av påsarna.',
    note: 'Du granskar och rättar allt innan det sparas. Kräver ditt samtycke.',
  },
  {
    title: 'Slå upp en växt',
    what: 'Latinskt namn, svenskt namn, skötsel, förbehandling och såtips när du lägger till ett frö eller öppnar ett som saknar uppgifter.',
    sent: 'Växtens namn och sort.',
    note: 'Svaret sparas och delas, så samma växt slås bara upp en gång. Det märks som AI-utkast tills det har granskats.',
  },
  {
    title: 'Växtkategori',
    what: 'Om arten är grönsak, rotfrukt, ört, ettårig blomma och så vidare, för ikonerna i kalendern.',
    sent: 'Artens namn.',
    note: 'Sparas per art och delas.',
  },
  {
    title: 'Kalendern och startsidan',
    what: 'Säsongstext och tips för månaden i din odlingszon.',
    sent: 'Odlingszon, månad och namnen på dina fröer.',
    note: 'Tipsen sparas per zon och månad och delas med andra i samma zon.',
  },
  {
    title: 'Illustrationerna',
    what: 'Planscherna i Ernst Haeckels manér görs för hand av Groh! i ChatGPT, en gång per art eller sort.',
    sent: 'Inget av dina uppgifter.',
    note: 'Märks som AI-gjorda där de visas.',
  },
]

export default function AiInfo({ onBack }) {
  const [consent, setConsent] = useState(undefined)   // undefined = hämtas
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { photoConsentDate().then(setConsent).catch(() => setConsent(null)) }, [])

  async function change(value) {
    setSaving(true); setError('')
    try {
      await setPhotoConsent(value)
      setConsent(await photoConsentDate())
    } catch {
      setError('Det gick inte att spara. Försök igen.')
    }
    setSaving(false)
  }

  const date = consent ? new Date(consent).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', padding: '24px 16px calc(100px + env(safe-area-inset-bottom))', display: 'grid', gap: '16px' }}>
      <div>
        {onBack && <Button variant="link" onClick={onBack}>← Profil</Button>}
        <h1 className="t-display-m" style={{ margin: '8px 0 8px' }}>AI i Groh!</h1>
        <p className="t-prose" style={{ margin: 0 }}>
          Groh! använder AI på några få ställen. Allt AI har gjort märks i appen, och det du sparar har du granskat själv.
        </p>
      </div>

      <section className="card" aria-labelledby="ai-uses" style={{ display: 'grid', gap: '16px' }}>
        <SectionLabel id="ai-uses" style={{ margin: 0 }}>Var AI används</SectionLabel>
        {USES.map(u => (
          <div key={u.title} style={{ display: 'grid', gap: '4px' }}>
            <h3 className="t-heading-s" style={{ margin: 0 }}>{u.title}</h3>
            <p className="t-small" style={{ margin: 0 }}>{u.what}</p>
            <p className="t-small" style={{ margin: 0 }}><strong>Skickas:</strong> {u.sent}</p>
            <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0 }}>{u.note}</p>
          </div>
        ))}
      </section>

      <section className="card" aria-labelledby="ai-who" style={{ display: 'grid', gap: '8px' }}>
        <SectionLabel id="ai-who" style={{ margin: 0 }}>Vem som står för AI:n</SectionLabel>
        <p className="t-small" style={{ margin: 0 }}>
          AI-modellen är Claude Haiku från Anthropic. Anthropic tränar inte sina modeller på det Groh! skickar och raderar det normalt inom 30 dagar.
        </p>
        <p className="t-small" style={{ margin: 0 }}>
          Dina fröer, anteckningar och foton sparas i Groh!:s databas hos Supabase i Stockholm. Bara du kan se dina foton. Foton i odlingsloggen skickas aldrig till AI.
        </p>
      </section>

      <section className="card" aria-labelledby="ai-footprint" style={{ display: 'grid', gap: '8px' }}>
        <SectionLabel id="ai-footprint" style={{ margin: 0 }}>Så lite som möjligt</SectionLabel>
        <p className="t-small" style={{ margin: 0 }}>
          AI kostar energi. Groh! använder den minsta modell som räcker, sparar varje svar och delar det med alla, så att samma fråga inte ställs två gånger. Varje användare har ett tak för antal AI-anrop per dag.
        </p>
      </section>

      <section className="card" aria-labelledby="ai-consent" style={{ display: 'grid', gap: '10px' }}>
        <SectionLabel id="ai-consent" style={{ margin: 0 }}>Ditt samtycke</SectionLabel>
        {consent === undefined && <p className="t-small" style={{ color: 'var(--text-muted)', margin: 0 }}>Hämtar …</p>}
        {consent !== undefined && (
          <p className="t-small" style={{ margin: 0 }}>
            {consent
              ? `Du sa ja till att fröpåsarnas foton läses av AI den ${date}.`
              : 'Du har inte sagt ja till att fröpåsarnas foton läses av AI. Du får frågan när du fotograferar en påse första gången.'}
          </p>
        )}
        {consent !== undefined && (
          <Button onClick={() => change(!consent)} disabled={saving} style={{ justifySelf: 'start' }}>
            {saving ? 'Sparar …' : consent ? 'Återkalla samtycket' : 'Ge samtycke'}
          </Button>
        )}
        {consent && <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0 }}>Återkallar du kan du fortfarande lägga till fröer för hand. Påsfoton du redan sparat ligger kvar tills du tar bort fröet eller ditt konto.</p>}
        {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
      </section>
    </div>
  )
}
