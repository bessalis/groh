import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { callAi } from '../lib/api'
import { CATEGORIES } from '../lib/categories'
import { Button, SectionLabel, AiNote } from '../components/ui'

export default function AddSeed({ onBack, onSaved, editSeed }) {
  const [name, setName] = useState(editSeed?.name || '')
  const [species, setSpecies] = useState(editSeed?.species || '')
  const [notes, setNotes] = useState(editSeed?.notes || '')
  const [companion, setCompanion] = useState(editSeed?.companion_planting || '')
  const [frostSensitive, setFrostSensitive] = useState(editSeed?.frost_sensitive || false)
  const [pretreatment, setPretreatment] = useState(editSeed?.requires_pretreatment || false)
  const [pretreatmentNote, setPretreatmentNote] = useState(editSeed?.pretreatment_notes || '')
  const [highMaintenance, setHighMaintenance] = useState(editSeed?.maintenance_level === 'high' || false)
  const [thumb, setThumb] = useState(editSeed?.thumb || null)
  const [sownDate, setSownDate] = useState(editSeed?.sown_date || '')
  const [sowingType, setSowingType] = useState(editSeed?.sowing_type || 'indoor')
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)
  const [factStatus, setFactStatus] = useState(null)
  const [category, setCategory] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const bg = 'var(--bg)'
  const text = 'var(--text)'
  const muted = 'var(--text-muted)'
  const border = 'var(--border-color)'
  const inputBg = 'var(--surface)'
  const inputStyle = { width: '100%', background: inputBg, border: '0.5px solid ' + border, borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: text, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }

  async function lookupWithAI() {
    if (!name.trim()) { setError('Skriv in ett namn först'); return }
    setAiLoading(true); setError('')
    try {
      const info = await callAi('/api/ai-lookup', { name })
      if (info.species) setSpecies(info.species)
      if (info.frost_sensitive !== undefined) setFrostSensitive(info.frost_sensitive)
      if (info.requires_pretreatment !== undefined) setPretreatment(info.requires_pretreatment)
      if (info.pretreatment_note) setPretreatmentNote(info.pretreatment_note)
      if (info.maintenance_level === 'high') setHighMaintenance(true)
      if (info.companion_planting) setCompanion(info.companion_planting)
      if (info.sowing_note) setNotes(info.sowing_note)
      setFactStatus(info.status || null)
      setCategory(info.category || null)
      setAiDone(true)
    } catch (e) {
      setError(e.status === 429 ? 'Dagens gräns för AI-uppslag är nådd. Fyll i manuellt eller försök i morgon.' : 'AI-sökning misslyckades. Fyll i manuellt.')
    }
    setAiLoading(false)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Namn krävs'); return }
    setSaving(true)
    const payload = {
      name: name.trim(), species: species.trim() || null,
      notes: notes.trim() || null, companion_planting: companion.trim() || null,
      frost_sensitive: frostSensitive, requires_pretreatment: pretreatment,
      pretreatment_notes: pretreatmentNote || null,
      maintenance_level: highMaintenance ? 'high' : 'low',
      thumb, sown_date: sownDate || null, sowing_type: sowingType,
    }
    const { error: err } = editSeed
      ? await supabase.from('seeds').update(payload).eq('id', editSeed.id)
      : await supabase.from('seeds').insert({ ...payload, user_id: userId, is_archived: false })
    setSaving(false)
    if (err) { setError('Något gick fel. Försök igen.'); return }
    onSaved && onSaved(); onBack && onBack()
  }

  function Toggle({ value, onChange }) {
    return (
      <div onClick={() => onChange(!value)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: value ? 'var(--accent)' : 'var(--surface-raised)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--surface)', position: 'absolute', top: '2px', left: value ? '18px' : '2px', transition: 'left 0.2s' }} />
      </div>
    )
  }

  function ToggleRow({ label, sub, value, onChange }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: inputBg, border: '0.5px solid ' + border, borderRadius: '10px', padding: '12px 14px', marginBottom: '6px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '14px', color: text }}>{label}</p>
          {sub && <p style={{ margin: 0, fontSize: '11px', color: muted }}>{sub}</p>}
        </div>
        <Toggle value={value} onChange={onChange} />
      </div>
    )
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '20px 64px 16px 16px' }}>
        <Button variant="link" onClick={onBack}>← Tillbaka</Button>
        <h1 style={{ fontSize: 'var(--display-s)', fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'normal', letterSpacing: '0.01em', color: text, margin: 0 }}>{editSeed ? 'Redigera frö' : 'Nytt frö'}</h1>
        <Button variant="link" onClick={handleSave} disabled={saving}>{saving ? 'Sparar…' : 'Spara'}</Button>
      </div>

      <div style={{ padding: '0 16px' }}>
        <SectionLabel>Namn</SectionLabel>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input value={name} onChange={e => { setName(e.target.value); setAiDone(false) }} placeholder="t.ex. Luktärt Cupani" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={lookupWithAI} disabled={aiLoading || !name.trim()}
            style={{ background: aiDone ? 'var(--accent-soft)' : 'var(--accent-selected)', border: '0.5px solid ' + (aiDone ? 'var(--accent-border)' : 'var(--accent)'), borderRadius: '10px', padding: '0 14px', cursor: 'pointer', color: 'var(--text-accent)', fontSize: '12px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {aiLoading ? <div style={{ width: '14px', height: '14px', border: '1.5px solid var(--accent-border)', borderTopColor: 'var(--text-muted)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : aiDone ? '✓ Klar' : 'AI-sök'}
          </button>
        </div>

        {aiDone && (
          <AiNote box status={factStatus} style={{ marginBottom: '16px' }}>
            {factStatus === 'reviewed'
              ? 'AI fyllde i latinskt namn och skötselkrav från granskad växtfakta. Justera nedan om något inte stämmer för just ditt frö.'
              : 'AI fyllde i latinskt namn och skötselkrav. Det är ännu inte granskat, så justera nedan om något är fel.'}
            {CATEGORIES[category] && <><br />Kategori: {CATEGORIES[category].label}</>}
          </AiNote>
        )}

        <SectionLabel>Latinskt namn</SectionLabel>
        <input value={species} onChange={e => setSpecies(e.target.value)} placeholder="t.ex. Lathyrus odoratus" style={{ ...inputStyle, fontFamily: 'var(--font-latin)', fontVariationSettings: 'var(--fraunces-soft)', fontStyle: 'italic', marginBottom: '16px' }} />

        <div style={{ height: '0.5px', background: border, margin: '4px 0 20px' }} />
        <SectionLabel>Egenskaper</SectionLabel>
        <ToggleRow label="Frostkänslig" value={frostSensitive} onChange={setFrostSensitive} />
        <ToggleRow label="Kräver förbehandling" sub={pretreatment && pretreatmentNote ? pretreatmentNote : null} value={pretreatment} onChange={setPretreatment} />
        <ToggleRow label="Hög skötsel" value={highMaintenance} onChange={setHighMaintenance} />

        <div style={{ height: '0.5px', background: border, margin: '14px 0 20px' }} />
        <SectionLabel>Ditt betyg</SectionLabel>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <div onClick={() => setThumb(thumb === 'up' ? null : 'up')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '0.5px solid ' + (thumb === 'up' ? 'var(--accent)' : border), background: thumb === 'up' ? 'var(--accent-soft)' : inputBg, cursor: 'pointer', textAlign: 'center', fontSize: '13px', color: muted }}>↑ Odla igen</div>
          <div onClick={() => setThumb(thumb === 'down' ? null : 'down')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '0.5px solid ' + (thumb === 'down' ? 'var(--warn-border)' : border), background: thumb === 'down' ? 'var(--warn-bg)' : inputBg, cursor: 'pointer', textAlign: 'center', fontSize: '13px', color: thumb === 'down' ? 'var(--warn-text)' : muted }}>↓ Tänk efter</div>
        </div>

        <div style={{ height: '0.5px', background: border, margin: '0 0 20px' }} />
        <SectionLabel>Sådd</SectionLabel>
        <div style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', color: text, margin: '0 0 5px' }}>Sådatum</p>
          <input type="date" value={sownDate} onChange={e => setSownDate(e.target.value)} style={{ ...inputStyle }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: text, margin: '0 0 8px' }}>Typ av sådd</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div onClick={() => setSowingType('indoor')} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '0.5px solid ' + (sowingType === 'indoor' ? 'var(--accent)' : border), background: sowingType === 'indoor' ? 'var(--accent-soft)' : inputBg, cursor: 'pointer', textAlign: 'center', fontSize: '13px', color: muted }}>Förrodling</div>
            <div onClick={() => setSowingType('outdoor')} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '0.5px solid ' + (sowingType === 'outdoor' ? 'var(--accent)' : border), background: sowingType === 'outdoor' ? 'var(--accent-soft)' : inputBg, cursor: 'pointer', textAlign: 'center', fontSize: '13px', color: muted }}>Direktsådd</div>
          </div>
        </div>

        <div style={{ height: '0.5px', background: border, margin: '0 0 20px' }} />
        <SectionLabel>Anteckningar</SectionLabel>
        <div style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', color: text, margin: '0 0 5px' }}>Notering / såningstips</p>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Var hittade du det? Såningstips?" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: text, margin: '0 0 5px' }}>Samodling</p>
          <input value={companion} onChange={e => setCompanion(e.target.value)} placeholder="Vad gillar den som granne?" style={inputStyle} />
        </div>

        {error && <p style={{ fontSize: '13px', color: 'var(--danger-text)', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'min(358px, calc(100% - 32px))', display: 'flex', gap: '8px' }}>
        <Button large onClick={onBack} style={{ flex: 1, background: 'var(--surface)' }}>Avbryt</Button>
        <Button variant="primary" large onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Sparar...' : editSeed ? 'Spara ändringar' : 'Lägg till frö'}</Button>
      </div>
    </div>
  )
}
