import { useEffect, useRef, useState } from 'react'
import { Button, SectionLabel, AiNote } from '../components/ui'
import { compressPhoto } from '../lib/photo'
import { startScan, uploadPhoto, readPacket, saveItem, confirmPacket, abandonScan } from '../lib/scan'
import { EMPTY, toForm, toValues, errorText, seedFrom, uncertainLabels } from '../lib/scanForm'
import PacketForm from '../components/PacketForm'

// Skanna en fröpåse: framsida, baksida (valfri), AI läser av, användaren granskar
// och rättar, sedan sparas fröet. Inget sparas som frö förrän användaren bekräftat.

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

  async function save() {
    const values = toValues(form)
    if (!values.name) { setError('Fröet behöver ett namn.'); return }
    setSaving(true); setError('')
    const seed = seedFrom(values, amount, scan.paths)
    try {
      await confirmPacket({ scanId: scan.scanId, itemId: scan.itemId, seed, reading: scan.reading, final: values })
      savedRef.current = true
      onSaved && onSaved()
    } catch {
      setError('Fröet kunde inte sparas. Försök igen.')
      setSaving(false)
    }
  }

  const unsure = uncertainLabels(scan?.reading)

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
              {unsure.length > 0 && <><br /><strong>Kontrollera särskilt:</strong> {unsure.join(', ')}.</>}
            </AiNote>
            <Thumbs front={front} back={back} />

            <PacketForm form={form} setForm={setForm} amount={amount} setAmount={setAmount} uncertain={scan?.reading?.uncertain} />

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
