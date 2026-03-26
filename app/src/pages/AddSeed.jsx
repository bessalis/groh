import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AddSeed({ dark, onBack, onSaved }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [notes, setNotes] = useState('')
  const [companion, setCompanion] = useState('')
  const [frostSensitive, setFrostSensitive] = useState(false)
  const [pretreatment, setPretreatment] = useState(false)
  const [pretreatmentNote, setPretreatmentNote] = useState('')
  const [highMaintenance, setHighMaintenance] = useState(false)
  const [thumb, setThumb] = useState(null)
  const [sownDate, setSownDate] = useState('')
  const [sowingType, setSowingType] = useState('indoor')
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const border = dark ? '#2A2E24' : '#E8E4DA'
  const inputBg = dark ? '#1A1C17' : '#FFFFFF'
  const inputStyle = { width: '100%', background: inputBg, border: '0.5px solid ' + border, borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: text, fontFamily: 'Arial, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const sectionLabel = { fontSize: '10px', color: muted, letterSpacing: '0.1em', margin: '0 0 10px' }

  async function lookupWithAI() {
    if (!name.trim()) { setError('Skriv in ett namn först'); return }
    setAiLoading(true); setError('')
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          messages: [{ role: 'user', content: 'Du är en trädgårdsexpert. Svara BARA med JSON. För växten "' + name + '": { "species": "latinskt namn", "frost_sensitive": true/false, "requires_pretreatment": true/false, "pretreatment_note": "beskriv förbehandlingen kort eller null", "maintenance_level": "low/medium/high", "companion_planting": "bra grannar eller null", "sowing_note": "kort såningstips för zon 4 Sverige" }' }]
        })
      })
      const data = await response.json()
      const info = JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim())
      if (info.species) setSpecies(info.species)
      if (info.frost_sensitive !== undefined) setFrostSensitive(info.frost_sensitive)
      if (info.requires_pretreatment !== undefined) setPretreatment(info.requires_pretreatment)
      if (info.pretreatment_note) setPretreatmentNote(info.pretreatment_note)
      if (info.maintenance_level === 'high') setHighMaintenance(true)
      if (info.companion_planting) setCompanion(info.companion_planting)
      if (info.sowing_note) setNotes(info.sowing_note)
      setAiDone(true)
    } catch (e) { setError('AI-sökning misslyckades. Fyll i manuellt.') }
    setAiLoading(false)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Namn krävs'); return }
    setSaving(true)
    const { error: err } = await supabase.from('seeds').insert({
      user_id: userId, name: name.trim(), species: species.trim() || null,
      notes: notes.trim() || null, companion_planting: companion.trim() || null,
      frost_sensitive: frostSensitive, requires_pretreatment: pretreatment,
      pretreatment_notes: pretreatmentNote || null,
      maintenance_level: highMaintenance ? 'high' : 'low',
      thumb, sown_date: sownDate || null, sowing_type: sowingType, is_archived: false,
    })
    setSaving(false)
    if (err) { setError('Något gick fel. Försök igen.'); return }
    onSaved && onSaved(); onBack && onBack()
  }

  function Toggle({ value, onChange }) {
    return (
      <div onClick={() => onChange(!value)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: value ? '#4E6E44' : border, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#F2F0E8', position: 'absolute', top: '2px', left: value ? '18px' : '2px', transition: 'left 0.2s' }} />
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
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 16px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: muted, fontSize: '14px', cursor: 'pointer', padding: 0 }}>← Tillbaka</button>
        <h1 style={{ fontSize: '18px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: text, margin: 0 }}>Nytt frö</h1>
        <button onClick={handleSave} disabled={saving} style={{ background: 'none', border: 'none', color: muted, fontSize: '14px', fontWeight: 500, cursor: 'pointer', padding: 0 }}>{saving ? '...' : 'Spara'}</button>
      </div>

      <div style={{ padding: '0 16px' }}>
        <p style={sectionLabel}>NAMN</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input value={name} onChange={e => { setName(e.target.value); setAiDone(false) }} placeholder="t.ex. Luktärt Cupani" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={lookupWithAI} disabled={aiLoading || !name.trim()}
            style={{ background: aiDone ? '#1E3020' : '#2A3828', border: '0.5px solid ' + (aiDone ? '#4E6E44' : '#3B5E35'), borderRadius: '10px', padding: '0 14px', cursor: 'pointer', color: muted, fontSize: '12px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {aiLoading ? <div style={{ width: '14px', height: '14px', border: '1.5px solid #3B5E35', borderTopColor: '#7A9E6E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : aiDone ? '✓ Klar' : 'AI-sök'}
          </button>
        </div>

        {aiDone && (
          <div style={{ background: dark ? '#1A2518' : '#E8EDE4', border: '0.5px solid ' + (dark ? '#2A3828' : '#C0D0B8'), borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <p style={{ fontSize: '12px', color: muted, margin: 0 }}>✓ AI fyllde i latinskt namn och skötselkrav. Justera nedan om något stämmer fel.</p>
          </div>
        )}

        <p style={sectionLabel}>LATINSKT NAMN</p>
        <input value={species} onChange={e => setSpecies(e.target.value)} placeholder="t.ex. Lathyrus odoratus" style={{ ...inputStyle, fontStyle: 'italic', marginBottom: '16px' }} />

        <div style={{ height: '0.5px', background: border, margin: '4px 0 20px' }} />
        <p style={sectionLabel}>EGENSKAPER</p>
        <ToggleRow label="Frostkänslig" value={frostSensitive} onChange={setFrostSensitive} />
        <ToggleRow label="Kräver förbehandling" sub={pretreatment && pretreatmentNote ? pretreatmentNote : null} value={pretreatment} onChange={setPretreatment} />
        <ToggleRow label="Hög skötsel" value={highMaintenance} onChange={setHighMaintenance} />

        <div style={{ height: '0.5px', background: border, margin: '14px 0 20px' }} />
        <p style={sectionLabel}>DITT BETYG</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <div onClick={() => setThumb(thumb === 'up' ? null : 'up')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '0.5px solid ' + (thumb === 'up' ? '#4E6E44' : border), background: thumb === 'up' ? (dark ? '#1E3020' : '#E8EDE4') : inputBg, cursor: 'pointer', textAlign: 'center', fontSize: '13px', color: muted }}>↑ Odla igen</div>
          <div onClick={() => setThumb(thumb === 'down' ? null : 'down')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '0.5px solid ' + (thumb === 'down' ? '#7A2020' : border), background: thumb === 'down' ? (dark ? '#301010' : '#FFF0F0') : inputBg, cursor: 'pointer', textAlign: 'center', fontSize: '13px', color: thumb === 'down' ? '#E28080' : muted }}>↓ Tänk efter</div>
        </div>

        <div style={{ height: '0.5px', background: border, margin: '0 0 20px' }} />
        <p style={sectionLabel}>SÅDD</p>
        <div style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', color: text, margin: '0 0 5px' }}>Sådatum</p>
          <input type="date" value={sownDate} onChange={e => setSownDate(e.target.value)} style={{ ...inputStyle, colorScheme: dark ? 'dark' : 'light' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: text, margin: '0 0 8px' }}>Typ av sådd</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div onClick={() => setSowingType('indoor')} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '0.5px solid ' + (sowingType === 'indoor' ? '#4E6E44' : border), background: sowingType === 'indoor' ? (dark ? '#1E3020' : '#E8EDE4') : inputBg, cursor: 'pointer', textAlign: 'center', fontSize: '13px', color: muted }}>Förrodling</div>
            <div onClick={() => setSowingType('outdoor')} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '0.5px solid ' + (sowingType === 'outdoor' ? '#4E6E44' : border), background: sowingType === 'outdoor' ? (dark ? '#1E3020' : '#E8EDE4') : inputBg, cursor: 'pointer', textAlign: 'center', fontSize: '13px', color: muted }}>Direktsådd</div>
          </div>
        </div>

        <div style={{ height: '0.5px', background: border, margin: '0 0 20px' }} />
        <p style={sectionLabel}>ANTECKNINGAR</p>
        <div style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', color: text, margin: '0 0 5px' }}>Notering / såningstips</p>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Var hittade du det? Såningstips?" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: text, margin: '0 0 5px' }}>Samodling</p>
          <input value={companion} onChange={e => setCompanion(e.target.value)} placeholder="Vad gillar den som granne?" style={inputStyle} />
        </div>

        {error && <p style={{ fontSize: '13px', color: '#E28080', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: '358px', display: 'flex', gap: '8px' }}>
        <button onClick={onBack} style={{ flex: 1, padding: '13px', background: 'transparent', border: '0.5px solid ' + border, borderRadius: '12px', color: muted, fontSize: '14px', cursor: 'pointer' }}>Avbryt</button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '13px', background: '#4E6E44', border: 'none', borderRadius: '12px', color: '#F2F0E8', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>{saving ? 'Sparar...' : 'Lägg till frö'}</button>
      </div>
    </div>
  )
}
