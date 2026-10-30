import { useEffect, useState } from 'react'
import { loadPending, saveReview, loadSummary, OUTCOMES, REASONS, SEASON } from '../lib/review'

// Höstbokslut: ett frö i taget, tre val, sedan en sammanfattning.
export default function Review({ onDone }) {
  const [queue, setQueue] = useState(null)
  const [index, setIndex] = useState(0)
  const [outcome, setOutcome] = useState(null)
  const [reasons, setReasons] = useState([])
  const [note, setNote] = useState('')
  const [growAgain, setGrowAgain] = useState(true)
  const [savedSeeds, setSavedSeeds] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)

  const bg = 'var(--bg)'
  const cardBg = 'var(--surface)'
  const text = 'var(--text)'
  const muted = 'var(--text-muted)'
  const border = 'var(--border-color)'
  const chosenBg = 'var(--accent-selected)'

  useEffect(() => {
    loadPending().then(setQueue).catch(() => setError('Kunde inte hämta årets sådder.'))
  }, [])

  const seed = queue?.[index]
  const finished = queue && index >= queue.length

  useEffect(() => {
    if (finished) loadSummary().then(setSummary)
  }, [finished])

  function reset() {
    setOutcome(null); setReasons([]); setNote(''); setGrowAgain(true); setSavedSeeds(false); setError('')
  }

  async function next(skip = false) {
    if (!skip) {
      setSaving(true)
      try {
        await saveReview(seed, { outcome, reasons, note, growAgain, savedSeeds })
      } catch {
        setError('Kunde inte spara. Försök igen.')
        setSaving(false)
        return
      }
      setSaving(false)
    }
    reset()
    setIndex(i => i + 1)
  }

  const chip = (active) => ({
    padding: '10px 14px', borderRadius: '999px', cursor: 'pointer',
    border: '1px solid ' + (active ? muted : border), background: active ? chosenBg : 'transparent', color: text,
  })
  const page = { background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', padding: '24px 16px calc(100px + env(safe-area-inset-bottom))' }

  if (error && !queue) return <div style={page}><p className="t-body" style={{ color: text }}>{error}</p></div>
  if (!queue) return <div style={page}><p className="t-body" style={{ color: muted }}>Hämtar årets sådder…</p></div>

  if (finished) {
    const count = k => (summary || []).filter(r => r.outcome === k).length
    const again = (summary || []).filter(r => r.grow_again).map(r => r.seed_name)
    const saved = (summary || []).filter(r => r.saved_seeds).map(r => r.seed_name)
    return (
      <div style={page}>
        <p className="t-label" style={{ color: muted, margin: '0 0 6px' }}>Höstbokslut {SEASON}</p>
        <h1 className="t-display-l" style={{ color: text, margin: '0 0 16px' }}>Säsongen är stängd</h1>
        {summary && summary.length > 0 ? (
          <div style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p className="t-prose" style={{ color: text, margin: 0 }}>
              {summary.length} sådder: {count('good')} blev bra, {count('so_so')} sådär och {count('failed')} blev inget.
            </p>
            {again.length > 0 && <p className="t-small" style={{ color: text, margin: 0 }}><b>Odla igen:</b> {again.join(', ')}</p>}
            {saved.length > 0 && <p className="t-small" style={{ color: text, margin: 0 }}><b>Egna frön sparade:</b> {saved.join(', ')}</p>}
            {count('failed') > 0 && <p className="t-small" style={{ color: muted, margin: 0 }}>Det som blev inget ligger i Komposten i Fröarkivet. Där kan du plocka tillbaka det.</p>}
          </div>
        ) : (
          <p className="t-prose" style={{ color: text }}>Det fanns inga sådder att gå igenom i år.</p>
        )}
        <p className="t-small" style={{ color: muted, margin: '16px 0' }}>Fröpåsarna står kvar i Fröarkivet, redo för nästa år.</p>
        <button type="button" onClick={onDone} className="t-body" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 700, cursor: 'pointer' }}>Klar</button>
      </div>
    )
  }

  return (
    <div style={page}>
      <button type="button" onClick={onDone} className="t-small" style={{ background: 'none', border: 'none', padding: 0, color: muted, cursor: 'pointer', marginBottom: '12px' }}>← Avbryt, fortsätt senare</button>
      <p className="t-label" style={{ color: muted, margin: '0 0 6px' }}>Höstbokslut {SEASON} · {index + 1} av {queue.length}</p>
      <div aria-hidden="true" style={{ height: 4, borderRadius: 2, background: border, margin: '0 0 20px' }}>
        <div style={{ height: '100%', width: `${(index / queue.length) * 100}%`, background: muted, borderRadius: 2 }} />
      </div>

      <h1 className="t-display-l" style={{ color: text, margin: 0 }}>{seed.name}</h1>
      {seed.species && <p className="t-latin" style={{ color: muted, margin: '4px 0 0', fontSize: '15px' }}>{seed.species}</p>}
      {seed.sown_date && (
        <p className="t-small" style={{ color: muted, margin: '6px 0 0' }}>
          Sått {new Date(seed.sown_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })}
        </p>
      )}

      <p className="t-heading" style={{ color: text, margin: '24px 0 12px' }}>Hur gick det?</p>
      <div role="radiogroup" aria-label="Hur gick det" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {Object.entries(OUTCOMES).map(([key, label]) => (
          <button key={key} type="button" role="radio" aria-checked={outcome === key} onClick={() => setOutcome(key)} className="t-body" style={chip(outcome === key)}>{label}</button>
        ))}
      </div>

      {outcome === 'good' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
          <label className="t-body" style={{ color: text, display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="checkbox" checked={growAgain} onChange={e => setGrowAgain(e.target.checked)} style={{ width: 20, height: 20 }} /> Odla igen nästa år
          </label>
          <label className="t-body" style={{ color: text, display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="checkbox" checked={savedSeeds} onChange={e => setSavedSeeds(e.target.checked)} style={{ width: 20, height: 20 }} /> Jag sparade egna frön
          </label>
        </div>
      )}

      {outcome === 'failed' && (
        <>
          <p className="t-small" style={{ color: muted, margin: '18px 0 8px' }}>Vad hände? Välj det som stämmer.</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {REASONS.map(([key, label]) => {
              const on = reasons.includes(key)
              return <button key={key} type="button" aria-pressed={on} onClick={() => setReasons(r => on ? r.filter(x => x !== key) : [...r, key])} className="t-small" style={chip(on)}>{label}</button>
            })}
          </div>
        </>
      )}

      {outcome && (
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Anteckning till nästa år (valfritt)"
          className="t-body" style={{ width: '100%', marginTop: '18px', padding: '12px', borderRadius: '12px', border: '0.5px solid ' + border, background: cardBg, color: text, boxSizing: 'border-box', resize: 'vertical' }} />
      )}

      {outcome === 'failed' && <p className="t-caption" style={{ color: muted, margin: '8px 0 0' }}>Fröet flyttas till Komposten. Du kan plocka tillbaka det därifrån.</p>}
      {error && <p className="t-small" style={{ color: 'var(--danger-text)', margin: '12px 0 0' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
        <button type="button" onClick={() => next(true)} className="t-body" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '0.5px solid ' + border, background: 'transparent', color: text, cursor: 'pointer' }}>Hoppa över</button>
        <button type="button" disabled={!outcome || saving} onClick={() => next(false)} className="t-body" style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: outcome ? 'var(--accent)' : 'var(--surface-raised)', color: outcome ? 'var(--on-accent)' : 'var(--text-subtle)', fontWeight: 700, cursor: outcome ? 'pointer' : 'default' }}>
          {saving ? 'Sparar…' : index + 1 === queue.length ? 'Spara och avsluta' : 'Spara och nästa'}
        </button>
      </div>
    </div>
  )
}
