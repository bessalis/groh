import { SectionLabel } from './ui'
import { MONTHS, AMOUNTS } from '../lib/scanForm'

// Granskningsformuläret för en skannad fröpåse. Används av ScanPacket (en påse)
// och BatchScan (flera). form/setForm i scanForm-format, amount separat.
export default function PacketForm({ form, setForm, amount, setAmount, uncertain = [] }) {
  const unsure = new Set(uncertain)
  const check = key => unsure.has(key)
  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }
  function toggleMonth(key, m) {
    setForm(f => ({ ...f, [key]: f[key].includes(m) ? f[key].filter(x => x !== m) : [...f[key], m] }))
  }
  return (
    <>
      <SectionLabel style={{ marginTop: '20px' }}>Påsen</SectionLabel>
      <TextField id="name" label="Namn" value={form.name} onChange={v => set('name', v)} check={check('name')} required />
      <TextField id="cultivar" label="Sort" value={form.cultivar} onChange={v => set('cultivar', v)} check={check('cultivar')} />
      <TextField id="species" label="Latinskt namn" value={form.species} onChange={v => set('species', v)} check={check('species')} className="t-latin" />
      <TextField id="supplier" label="Fröfirma" value={form.supplier} onChange={v => set('supplier', v)} check={check('supplier')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <TextField id="season" label="Årgång" inputMode="numeric" value={form.packed_for_season} onChange={v => set('packed_for_season', v.replace(/\D/g, '').slice(0, 4))} check={check('packed_for_season')} />
        <TextField id="best" label="Bäst före" type="date" value={form.best_before} onChange={v => set('best_before', v)} check={check('best_before')} />
      </div>

      <fieldset className="field" style={{ border: 'none', padding: 0 }}>
        <legend className="field-label" style={{ marginBottom: '6px' }}>Hur mycket finns kvar?</legend>
        <div className="chips" role="radiogroup" aria-label="Hur mycket finns kvar">
          {AMOUNTS.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={amount === value} className="chip" onClick={() => setAmount(amount === value ? null : value)}>{label}</button>
          ))}
        </div>
      </fieldset>

      <SectionLabel style={{ marginTop: '8px' }}>Sådd enligt påsen</SectionLabel>
      <MonthField label="Förodla inne" value={form.sow_indoor_months} onToggle={m => toggleMonth('sow_indoor_months', m)} check={check('sow_indoor_months')} />
      <MonthField label="Så ute" value={form.sow_outdoor_months} onToggle={m => toggleMonth('sow_outdoor_months', m)} check={check('sow_outdoor_months')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <TextField id="gmin" label="Grodd från, dagar" inputMode="numeric" value={form.days_to_germination_min} onChange={v => set('days_to_germination_min', v.replace(/\D/g, ''))} check={check('days_to_germination_min')} />
        <TextField id="gmax" label="till, dagar" inputMode="numeric" value={form.days_to_germination_max} onChange={v => set('days_to_germination_max', v.replace(/\D/g, ''))} check={check('days_to_germination_max')} />
        <TextField id="depth" label="Sådjup, cm" inputMode="decimal" value={form.sowing_depth_cm} onChange={v => set('sowing_depth_cm', v.replace(/[^\d.,]/g, ''))} check={check('sowing_depth_cm')} />
      </div>
      <CheckField id="light" label="Ljusgroende – täck inte fröet" value={form.light_germination} onChange={v => set('light_germination', v)} check={check('light_germination')} />
      <CheckField id="frost" label="Frostkänslig" value={form.frost_sensitive} onChange={v => set('frost_sensitive', v)} check={check('frost_sensitive')} />
      <TextField id="pre" label="Förbehandling" placeholder="T.ex. blötlägg 24 timmar" value={form.pretreatment_note} onChange={v => set('pretreatment_note', v)} check={check('pretreatment_note')} />
      <TextField id="note" label="Anteckning" multiline value={form.sowing_note} onChange={v => set('sowing_note', v)} check={check('sowing_note')} />
    </>
  )
}

function CheckHint({ show }) {
  return show ? <span className="field-check"> · Kontrollera</span> : null
}

function TextField({ id, label, value, onChange, check, multiline, className, ...rest }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}<CheckHint show={check} /></label>
      <Tag id={id} className={['field-input', check && 'field-input--check', className].filter(Boolean).join(' ')}
        value={value} onChange={e => onChange(e.target.value)} rows={multiline ? 3 : undefined}
        aria-describedby={check ? `${id}-check` : undefined} {...rest} />
      {check && <span id={`${id}-check`} hidden>AI:n var osäker här</span>}
    </div>
  )
}

function CheckField({ id, label, value, onChange, check }) {
  return (
    <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
      <input id={id} type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
      <label className="field-label" htmlFor={id}>{label}<CheckHint show={check} /></label>
    </div>
  )
}

function MonthField({ label, value, onToggle, check }) {
  return (
    <fieldset className="field" style={{ border: 'none', padding: 0 }}>
      <legend className="field-label" style={{ marginBottom: '6px' }}>{label}<CheckHint show={check} /></legend>
      <div className="chips" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
        {MONTHS.map((name, i) => (
          <button key={name} type="button" className="chip" aria-pressed={value.includes(i + 1)} aria-label={name}
            onClick={() => onToggle(i + 1)} style={{ minWidth: 0, padding: '8px 0', textTransform: 'capitalize' }}>
            {name.slice(0, 3)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
