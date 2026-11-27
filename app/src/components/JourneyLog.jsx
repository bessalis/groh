// Snabbloggen på en gro-resa: skriv en rad, ta ett foto om du vill och välj
// förhållanden. Loggen visas som en dagbok under resan, senaste först.

import { useEffect, useState } from 'react'
import { Button } from './ui'
import { Icon } from './Icon'
import { CONDITIONS, conditionLabel, logsOf, addLog, removeLog, logPhotoUrl } from '../lib/growthLog'

const when = iso => new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })

function LogPhoto({ path }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let live = true
    logPhotoUrl(path).then(u => { if (live) setUrl(u) })
    return () => { live = false }
  }, [path])
  if (!url) return <div className="log__photo" aria-hidden="true" />
  return <a href={url} target="_blank" rel="noreferrer"><img className="log__photo" src={url} alt="Foto från loggen" loading="lazy" /></a>
}

export default function JourneyLog({ journey, onChanged }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [conditions, setConditions] = useState([])
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const logs = logsOf(journey)

  function reset() { setNote(''); setConditions([]); setFile(null); setOpen(false); setError('') }

  async function save() {
    if (!note.trim() && !conditions.length && !file) { setError('Skriv något, välj ett förhållande eller ta ett foto.'); return }
    setBusy(true); setError('')
    try { await addLog(journey, { note, conditions, file }); reset(); await onChanged?.() } catch { setError('Loggen gick inte att spara. Försök igen.') }
    setBusy(false)
  }

  async function remove(log) {
    if (confirm !== log.id) { setConfirm(log.id); return }
    setBusy(true)
    try { await removeLog(log); setConfirm(null); await onChanged?.() } catch { setError('Det gick inte att ta bort.') }
    setBusy(false)
  }

  return (
    <div className="log">
      {!open && <Button onClick={() => setOpen(true)}>+ Logga</Button>}
      {open && (
        <div className="log__form">
          <div className="field" style={{ margin: 0 }}>
            <label className="field-label" htmlFor={`note-${journey.key}`}>Vad har hänt?</label>
            <textarea id={`note-${journey.key}`} className="field-input" rows={2} value={note} onChange={e => setNote(e.target.value)}
              placeholder="T.ex. första bladen syns, flyttade till fönstret" />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <span className="field-label" id={`cond-${journey.key}`}>Förhållanden</span>
            <div className="chips" role="group" aria-labelledby={`cond-${journey.key}`}>
              {CONDITIONS.map(c => (
                <button key={c.key} type="button" className="chip" aria-pressed={conditions.includes(c.key)}
                  onClick={() => setConditions(prev => (prev.includes(c.key) ? prev.filter(x => x !== c.key) : [...prev, c.key]))}>{c.label}</button>
              ))}
            </div>
          </div>
          <label className="log__file">
            <Icon name="camera" size={20} color="currentColor" />
            <span>{file ? file.name || 'Foto valt' : 'Ta ett foto (valfritt)'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Sparar …' : 'Spara'}</Button>
            <Button variant="ghost" onClick={reset} disabled={busy}>Avbryt</Button>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <ol className="log__list" aria-label="Loggen">
          {logs.map(log => (
            <li key={log.id} className="log__entry">
              <span className="t-caption" style={{ color: 'var(--text-muted)' }}>{when(log.logged_at)}</span>
              {log.conditions?.length > 0 && (
                <span className="log__tags">{log.conditions.map(conditionLabel).join(' · ')}</span>
              )}
              {log.note && <p className="t-small" style={{ margin: 0 }}>{log.note}</p>}
              {log.photo_path && <LogPhoto path={log.photo_path} />}
              <Button variant="danger-ghost" onClick={() => remove(log)} disabled={busy} style={{ justifySelf: 'start' }}>
                {confirm === log.id ? 'Ta bort? Tryck igen' : 'Ta bort'}
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
