import { useEffect, useRef, useState } from 'react'
import { Button, SectionLabel, AiNote } from '../components/ui'
import { compressPhoto } from '../lib/photo'
import { startScan, uploadPhoto, readPacket, saveItem, confirmPacket, abandonScan } from '../lib/scan'

// Skanna en fröpåse: framsida, baksida (valfri), AI läser av, användaren granskar
// och rättar, sedan sparas fröet. Inget sparas som frö förrän användaren bekräftat.

const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
const AMOUNTS = [['full', 'Full'], ['half', 'Halv'], ['little', 'Lite kvar'], ['empty', 'Slut']]
const LABELS = {
  name: 'Namn', cultivar: 'Sort', species: 'Latinskt namn', supplier: 'Fröfirma',
  packed_for_season: 'Årgång', best_before: 'Bäst före', sow_indoor_months: 'Förodla inne',
  sow_outdoor_months: 'Så ute', days_to_germination_min: 'Groningstid', days_to_germination_max: 'Groningstid',
  sowing_depth_cm: 'Sådjup', light_germination: 'Ljusgroende', frost_sensitive: 'Frostkänslig',
  pretreatment_note: 'Förbehandling', sowing_note: 'Anteckning',
}

const EMPTY = {
  name: '', cultivar: '', species: '', supplier: '', packed_for_season: '', best_before: '',
  sow_indoor_months: [], sow_outdoor_months: [], days_to_germination_min: '', days_to_germination_max: '',
  sowing_depth_cm: '', light_germination: false, frost_sensitive: false, pretreatment_note: '', sowing_note: '',
}

// Läsningen (null för saknat) → formulärets värden (tomma strängar och listor).
function toForm(reading) {
  const form = { ...EMPTY }
  for (const key of Object.keys(EMPTY)) {
    const v = reading?.[key]
    if (v === null || v === undefined) continue
    form[key] = typeof EMPTY[key] === 'string' ? String(v) : v
  }
  return form
}

// Formulärets värden → samma form som läsningen (null för tomt), för att jämföra och spara.
function toValues(form) {
  const text = v => (v.trim() ? v.trim() : null)
  const number = v => (String(v).trim() === '' ? null : Number(String(v).replace(',', '.')))
  const months = v => (v.length ? [...v].sort((a, b) => a - b) : null)
  return {
    name: text(form.name), cultivar: text(form.cultivar), species: text(form.species), supplier: text(form.supplier),
    packed_for_season: number(form.packed_for_season), best_before: form.best_before || null,
    sow_indoor_months: months(form.sow_indoor_months), sow_outdoor_months: months(form.sow_outdoor_months),
    days_to_germination_min: number(form.days_to_germination_min), days_to_germination_max: number(form.days_to_germination_max),
    sowing_depth_cm: number(form.sowing_depth_cm), light_germination: form.light_germination, frost_sensitive: form.frost_sensitive,
    pretreatment_note: text(form.pretreatment_note), sowing_note: text(form.sowing_note),
  }
}

function errorText(e) {
  if (e?.status === 429) return 'Dagens gräns för AI-läsningar är nådd. Fyll i fröet själv eller försök i morgon.'
  if (e?.status === 422 || e?.status === 413) return e.message
  return 'Det gick inte att läsa påsen just nu.'
}

export default function ScanPacket({ onBack, onSaved, onManual }) {
  const [step, setStep] = useState('front')      // front | back | reading | review | error
  const [front, setFront] = useState(null)        // komprimerat foto + förhandsbild
  const [back, setBack] = useState(null)
  const [scan, setScan] = useState(null)          // { scanId, itemId, reading, paths }
  const [form, setForm] = useState(EMPTY)
  const [amount, setAmount] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const scanIdRef = useRef(null)
  const savedRef = useRef(false)
  const previewsRef = useRef([])

  // När sidan stängs: en osparad skanning markeras som övergiven (fotona finns kvar
  // tills vidare) och förhandsbilderna släpps.
  useEffect(() => () => {
    if (!savedRef.current) abandonScan(scanIdRef.current)
    for (const url of previewsRef.current) URL.revokeObjectURL(url)
  }, [])

  async function choose(file, side) {
    if (!file) return
    setError('')
    try {
      const photo = await compressPhoto(file)
      photo.preview = URL.createObjectURL(photo.blob)
      previewsRef.current.push(photo.preview)
      if (side === 'front') { setFront(photo); setStep('back') }
      else { setBack(photo); read(front, photo) }
    } catch {
      setError('Fotot kunde inte läsas. Prova att ta det igen.')
    }
  }

  async function read(frontPhoto, backPhoto) {
    setStep('reading'); setError('')
    try {
      const scanId = scanIdRef.current || await startScan()
      scanIdRef.current = scanId
      const [frontPath, backPath, result] = await Promise.all([
        uploadPhoto(scanId, 1, 'front', frontPhoto),
        backPhoto ? uploadPhoto(scanId, 1, 'back', backPhoto) : null,
        readPacket(frontPhoto, backPhoto),
      ])
      const itemId = await saveItem(scanId, 1, {
        front_photo_path: frontPath, back_photo_path: backPath,
        ai_status: 'read', ai_reading: result.reading, model: result.model,
      })
      setScan({ scanId, itemId, reading: result.reading, paths: { frontPath, backPath } })
      setForm(toForm(result.reading))
      setStep('review')
    } catch (e) {
      console.error('Skanningen misslyckades', e)
      setError(errorText(e))
      setStep('error')
    }
  }

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }
  function toggleMonth(key, m) {
    setForm(f => ({ ...f, [key]: f[key].includes(m) ? f[key].filter(x => x !== m) : [...f[key], m] }))
  }

  async function save() {
    const values = toValues(form)
    if (!values.name) { setError('Fröet behöver ett namn.'); return }
    setSaving(true); setError('')
    const seed = {
      name: values.name, species: values.species, cultivar: values.cultivar, supplier: values.supplier,
      packed_for_season: values.packed_for_season, best_before: values.best_before, amount,
      sow_indoor_months: values.sow_indoor_months, sow_outdoor_months: values.sow_outdoor_months,
      days_to_germination_min: values.days_to_germination_min, days_to_germination_max: values.days_to_germination_max,
      sowing_depth_cm: values.sowing_depth_cm, light_germination: values.light_germination,
      frost_sensitive: values.frost_sensitive,
      requires_pretreatment: Boolean(values.pretreatment_note), pretreatment_notes: values.pretreatment_note,
      notes: values.sowing_note,
      sowing_type: !values.sow_indoor_months && values.sow_outdoor_months ? 'outdoor' : 'indoor',
      front_photo_path: scan.paths.frontPath, back_photo_path: scan.paths.backPath,
    }
    try {
      await confirmPacket({ scanId: scan.scanId, itemId: scan.itemId, seed, reading: scan.reading, final: values })
      savedRef.current = true
      onSaved && onSaved()
    } catch {
      setError('Fröet kunde inte sparas. Försök igen.')
      setSaving(false)
    }
  }

  const uncertain = new Set(scan?.reading?.uncertain || [])
  const check = key => uncertain.has(key)

  return (
    <div style={{ minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: 'calc(140px + env(safe-area-inset-bottom))' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', padding: '20px 16px 16px' }}>
        <Button variant="link" onClick={onBack} style={{ justifySelf: 'start' }}>← Tillbaka</Button>
        <h1 className="t-display-s" style={{ margin: 0 }}>Skanna påse</h1>
        <span aria-hidden="true" />
      </div>

      <div style={{ padding: '0 16px' }}>
        {step === 'front' && (
          <PhotoStep
            label="Steg 1 av 2" title="Fotografera framsidan"
            hint="Lägg påsen på en plan yta i bra ljus, så att hela påsen syns."
            onFile={f => choose(f, 'front')}
          />
        )}

        {step === 'back' && (
          <PhotoStep
            label="Steg 2 av 2" title="Vänd påsen"
            hint="Baksidan har oftast såtid, sådjup och groningstid. Saknar påsen baksida kan du hoppa över det här steget."
            preview={front?.preview}
            onFile={f => choose(f, 'back')}
            onSkip={() => read(front, null)}
          />
        )}

        {step === 'reading' && (
          <div className="card card--roomy" role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
            <Thumbs front={front} back={back} />
            <div className="spinner" aria-hidden="true" />
            <p className="t-body" style={{ margin: 0 }}>Läser påsen…</p>
            <p className="t-caption" style={{ margin: 0, color: 'var(--text-muted)' }}>Det tar några sekunder.</p>
          </div>
        )}

        {step === 'error' && (
          <div className="card card--roomy" role="alert">
            <p className="t-body" style={{ margin: '0 0 14px' }}>{error}</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="primary" onClick={() => read(front, back)}>Försök igen</Button>
              <Button onClick={() => { setFront(null); setBack(null); setStep('front') }}>Ta nya foton</Button>
              {onManual && <Button variant="ghost" onClick={onManual}>Fyll i själv</Button>}
            </div>
          </div>
        )}

        {step === 'review' && (
          <form onSubmit={e => { e.preventDefault(); save() }} noValidate>
            <AiNote box style={{ marginBottom: '16px' }}>
              AI har läst av påsen. Granska och rätta innan du sparar.
              {uncertain.size > 0 && <><br /><strong>Kontrollera särskilt:</strong> {[...new Set([...uncertain].map(k => LABELS[k]))].join(', ')}.</>}
            </AiNote>
            <Thumbs front={front} back={back} />

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

            {error && <p className="t-small" role="alert" style={{ color: 'var(--danger-text)', margin: '8px 0 0' }}>{error}</p>}

            <div style={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'min(358px, calc(100% - 32px))', display: 'flex', gap: '8px' }}>
              <Button large onClick={onBack} style={{ flex: 1, background: 'var(--surface)' }}>Avbryt</Button>
              <Button variant="primary" large type="submit" disabled={saving} style={{ flex: 2 }}>{saving ? 'Sparar…' : 'Spara fröet'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function PhotoStep({ label, title, hint, preview, onFile, onSkip }) {
  const cameraRef = useRef(null)
  const libraryRef = useRef(null)
  const pick = e => { onFile(e.target.files?.[0]); e.target.value = '' }
  return (
    <div className="card card--roomy">
      <SectionLabel>{label}</SectionLabel>
      <p className="t-heading" style={{ margin: '0 0 6px' }}>{title}</p>
      <p className="t-small" style={{ margin: '0 0 16px', color: 'var(--text-muted)' }}>{hint}</p>
      {preview && <img src={preview} alt="Framsidan du fotograferade" style={{ width: '96px', borderRadius: 'var(--radius-sm)', margin: '0 0 16px', display: 'block' }} />}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={pick} hidden />
      <input ref={libraryRef} type="file" accept="image/*" onChange={pick} hidden />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Button variant="primary" large full onClick={() => cameraRef.current?.click()}>Ta foto</Button>
        <Button full onClick={() => libraryRef.current?.click()}>Välj från bilder</Button>
        {onSkip && <Button variant="ghost" full onClick={onSkip}>Hoppa över baksidan</Button>}
      </div>
    </div>
  )
}

function Thumbs({ front, back }) {
  if (!front) return null
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <img src={front.preview} alt="Framsidan" style={{ width: '72px', height: '96px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
      {back && <img src={back.preview} alt="Baksidan" style={{ width: '72px', height: '96px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />}
    </div>
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
