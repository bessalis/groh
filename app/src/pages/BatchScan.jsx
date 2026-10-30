import { useEffect, useRef, useState } from 'react'
import { Button, SectionLabel, AiNote } from '../components/ui'
import PacketForm from '../components/PacketForm'
import { compressPhoto } from '../lib/photo'
import {
  startScan, uploadPhoto, readPacket, saveItem, updateItem, confirmPacket,
  setScanStatus, abandonScan, loadScanItems, downloadPhoto,
} from '../lib/scan'
import { toForm, toValues, errorText, seedFrom, uncertainLabels } from '../lib/scanForm'

// Batchläge: fota framsidorna på upp till 12 påsar, vänd dem och fota baksidorna
// (appen visar vilken påse baksidan hör till), AI läser alla, användaren går
// igenom listan och sparar. När påsarna är lästa kan skanningen fortsätta senare.

const MAX = 12
const PARALLEL = 3

// En påse i batchen. Fotona finns i minnet (photo) tills de laddats upp, sedan som sökväg.
function newItem(position, front) {
  return {
    position, front, back: null, frontPath: null, backPath: null, itemId: null,
    reading: null, readState: 'idle', error: '', form: null, amount: null, reviewed: false, status: 'pending',
  }
}

const previewOf = side => side?.preview || side?.url || null

export default function BatchScan({ resumeScanId, onBack, onSaved }) {
  const [step, setStep] = useState(resumeScanId ? 'loading' : 'fronts')   // fronts | backs | reading | list | edit | loading | error
  const [items, setItems] = useState([])
  const [backIndex, setBackIndex] = useState(0)
  const [editIndex, setEditIndex] = useState(null)
  const [swapFor, setSwapFor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const scanIdRef = useRef(resumeScanId || null)
  const previewsRef = useRef([])

  useEffect(() => () => { for (const url of previewsRef.current) URL.revokeObjectURL(url) }, [])

  // Fortsätt en sparad skanning: hämta påsarna och läsningarna från databasen.
  useEffect(() => {
    if (!resumeScanId) return
    loadScanItems(resumeScanId).then(rows => {
      setItems(rows.map(r => ({
        ...newItem(r.position, r.frontUrl ? { url: r.frontUrl } : null),
        back: r.backUrl ? { url: r.backUrl } : null,
        frontPath: r.front_photo_path, backPath: r.back_photo_path, itemId: r.id,
        reading: r.ai_reading, readState: r.ai_status === 'read' ? 'read' : 'failed',
        error: r.ai_status === 'read' ? '' : 'Påsen kunde inte läsas.',
        form: r.ai_reading ? toForm(r.ai_reading) : null, status: r.status,
      })))
      setStep('list')
    }).catch(() => { setError('Skanningen kunde inte hämtas.'); setStep('error') })
  }, [resumeScanId])

  function patch(position, fields) {
    setItems(list => list.map(it => (it.position === position ? { ...it, ...fields } : it)))
  }

  async function addPhotos(files, side) {
    setError('')
    const list = [...(files || [])]
    if (!list.length) return
    try {
      const photos = []
      for (const file of list) {
        const photo = await compressPhoto(file)
        photo.preview = URL.createObjectURL(photo.blob)
        previewsRef.current.push(photo.preview)
        photos.push(photo)
      }
      if (side === 'front') {
        const room = MAX - items.length
        if (photos.length > room) setError(`Högst ${MAX} påsar per omgång. De första ${room} lades till.`)
        setItems([...items, ...photos.slice(0, room).map((p, i) => newItem(items.length + i + 1, p))])
      } else {
        // Baksidor fördelas från den påse som visas nu och framåt.
        const next = items.map((it, i) => (i >= backIndex && i < backIndex + photos.length ? { ...it, back: photos[i - backIndex] } : it))
        setItems(next)
        nextBack(backIndex + photos.length, next)
      }
    } catch {
      setError('Fotot kunde inte läsas. Prova att ta det igen.')
    }
  }

  // list: den aktuella listan (setItems hinner inte slå igenom före läsningen).
  function nextBack(i, list = items) {
    if (i >= list.length) readAll(list)
    else setBackIndex(i)
  }

  // Läser en påse. Fotona laddas upp först och påsen sparas även om läsningen
  // misslyckas, så att den går att läsa om senare (också efter "fortsätt senare").
  async function readOne(scanId, item) {
    patch(item.position, { readState: 'reading', error: '' })
    let { frontPath, backPath } = item
    try {
      const front = item.front?.base64 ? item.front : await downloadPhoto(item.frontPath)
      const back = item.back ? (item.back.base64 ? item.back : await downloadPhoto(item.backPath)) : null
      ;[frontPath, backPath] = await Promise.all([
        frontPath || uploadPhoto(scanId, item.position, 'front', front),
        back && item.back.base64 && !backPath ? uploadPhoto(scanId, item.position, 'back', back) : (back ? backPath : null),
      ])
      patch(item.position, { frontPath, backPath })
      const result = await readPacket(front, back)
      const itemId = await saveItem(scanId, item.position, {
        front_photo_path: frontPath, back_photo_path: backPath,
        ai_status: 'read', ai_reading: result.reading, model: result.model, status: 'pending',
      })
      patch(item.position, {
        itemId, reading: result.reading, readState: 'read', form: toForm(result.reading), reviewed: false,
        front: { ...front, preview: previewOf(item.front) }, back: back ? { ...back, preview: previewOf(item.back) } : null,
      })
    } catch (e) {
      console.error('Påsen kunde inte läsas', e)
      patch(item.position, { readState: 'failed', error: errorText(e) })
      if (frontPath) {
        const itemId = await saveItem(scanId, item.position, {
          front_photo_path: frontPath, back_photo_path: backPath, ai_status: 'failed', status: 'pending',
        }).catch(() => null)
        if (itemId) patch(item.position, { itemId })
      }
      if (e?.status === 429) throw e   // taket är nått: ingen idé att fortsätta med resten
    }
  }

  async function readAll(list = items) {
    setStep('reading'); setError('')
    try {
      const scanId = scanIdRef.current || await startScan()
      scanIdRef.current = scanId
      const queue = [...list]
      const workers = Array.from({ length: PARALLEL }, async () => {
        while (queue.length) await readOne(scanId, queue.shift())
      })
      await Promise.all(workers)
    } catch (e) {
      if (e?.status === 429) setError(errorText(e))
    }
    if (scanIdRef.current) await setScanStatus(scanIdRef.current, 'reviewing').catch(() => {})
    setStep('list')
  }

  async function reread(item) {
    try { await readOne(scanIdRef.current, item) } catch (e) { setError(errorText(e)) }
  }

  // Byter baksida mellan två påsar och läser om båda.
  async function swapBacks(a, b) {
    setSwapFor(null)
    const A = { ...a, back: b.back, backPath: b.backPath }
    const B = { ...b, back: a.back, backPath: a.backPath }
    patch(a.position, { back: A.back, backPath: A.backPath })
    patch(b.position, { back: B.back, backPath: B.backPath })
    // Fotona har bytt påse men ligger kvar under sina gamla namn i lagringen.
    await updateItem(a.itemId, { back_photo_path: A.backPath }).catch(() => {})
    await updateItem(b.itemId, { back_photo_path: B.backPath }).catch(() => {})
    const keepPaths = it => ({ ...it, back: it.back ? { ...it.back, base64: it.back.base64 && null } : null })
    await reread(keepPaths(A))
    await reread(keepPaths(B))
  }

  async function remove(item) {
    patch(item.position, { status: 'skipped' })
    if (item.itemId) await updateItem(item.itemId, { status: 'skipped' }).catch(() => {})
  }

  const active = items.filter(it => it.status === 'pending')
  const ready = active.filter(it => it.readState === 'read' && toValues(it.form).name)
  const notReady = active.length - ready.length

  async function saveAll() {
    setSaving(true); setError('')
    let saved = 0
    for (const it of ready) {
      const values = toValues(it.form)
      try {
        await confirmPacket({
          scanId: scanIdRef.current, itemId: it.itemId, reading: it.reading, final: values, finish: false,
          seed: seedFrom(values, it.amount, { frontPath: it.frontPath, backPath: it.backPath }),
        })
        patch(it.position, { status: 'confirmed' })
        saved++
      } catch {
        setError(`${saved} av ${ready.length} fröer sparades. Försök igen för resten.`)
        setSaving(false)
        return
      }
    }
    if (notReady === 0) await setScanStatus(scanIdRef.current, 'done').catch(() => {})
    setSaving(false)
    onSaved && onSaved(saved)
  }

  async function cancel() {
    if (scanIdRef.current && step !== 'list') await abandonScan(scanIdRef.current)
    onBack && onBack()
  }

  const header = (title, back = cancel) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', padding: '20px 16px 16px' }}>
      <Button variant="link" onClick={back} style={{ justifySelf: 'start' }}>← Tillbaka</Button>
      <h1 className="t-display-s" style={{ margin: 0 }}>{title}</h1>
      <span aria-hidden="true" />
    </div>
  )

  const page = { minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: 'calc(150px + env(safe-area-inset-bottom))' }
  const bottomBar = { position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'min(358px, calc(100% - 32px))', display: 'flex', gap: '8px' }

  // ── Granska en påse ──
  if (step === 'edit' && editIndex !== null) {
    const it = items[editIndex]
    const setForm = updater => patch(it.position, { form: typeof updater === 'function' ? updater(it.form) : updater })
    const unsure = uncertainLabels(it.reading)
    const done = () => { patch(it.position, { reviewed: true }); setEditIndex(null); setStep('list') }
    return (
      <div style={page}>
        {header(`Påse ${it.position}`, done)}
        <form style={{ padding: '0 16px' }} onSubmit={e => { e.preventDefault(); done() }} noValidate>
          <AiNote box style={{ marginBottom: '16px' }}>
            AI har läst av påsen. Granska och rätta innan du sparar.
            {unsure.length > 0 && <><br /><strong>Kontrollera särskilt:</strong> {unsure.join(', ')}.</>}
          </AiNote>
          <Thumbs front={it.front} back={it.back} />
          <div style={{ height: '20px' }} />
          <PacketForm form={it.form} setForm={setForm} amount={it.amount} setAmount={a => patch(it.position, { amount: a })} uncertain={it.reading?.uncertain} />
          <div style={bottomBar}>
            <Button variant="primary" large full type="submit">Klar med påsen</Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div style={page}>
      {header(step === 'list' ? 'Granska påsarna' : 'Skanna flera')}
      <div style={{ padding: '0 16px' }}>
        {error && <p className="t-small" role="alert" style={{ color: 'var(--danger-text)', margin: '0 0 12px' }}>{error}</p>}

        {step === 'loading' && <p className="t-body" role="status">Hämtar skanningen…</p>}

        {step === 'error' && (
          <div className="card card--roomy"><Button onClick={onBack}>Tillbaka</Button></div>
        )}

        {step === 'fronts' && (
          <PhotoCard
            label={`Steg 1 av 2 · ${items.length} av ${MAX}`}
            title={items.length ? 'Nästa framsida' : 'Fotografera framsidorna'}
            hint="Lägg ut påsarna i en rad och fota framsidorna en i taget, från vänster till höger."
            multiple onFiles={f => addPhotos(f, 'front')}
            disabled={items.length >= MAX}
          >
            {items.length > 0 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '6px', margin: '16px 0' }}>
                  {items.map(it => <img key={it.position} src={previewOf(it.front)} alt={`Påse ${it.position}, framsidan`} style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: '6px' }} />)}
                </div>
                <Button variant="secondary" full onClick={() => { setBackIndex(0); setStep('backs') }}>Klar med framsidorna ({items.length})</Button>
              </>
            )}
          </PhotoCard>
        )}

        {step === 'backs' && items[backIndex] && (
          <PhotoCard
            label={`Steg 2 av 2 · påse ${backIndex + 1} av ${items.length}`}
            title="Vänd påsarna och fota baksidan"
            hint="Baksidan till påsen här under. Saknar den baksida kan du hoppa över den."
            preview={previewOf(items[backIndex].front)}
            multiple onFiles={f => addPhotos(f, 'back')}
            onSkip={() => nextBack(backIndex + 1)}
            skipLabel="Ingen baksida på den här"
          />
        )}

        {step === 'reading' && (
          <div role="status" aria-live="polite">
            <p className="t-body" style={{ margin: '0 0 12px' }}>Läser påsarna… {items.filter(i => i.readState === 'read').length} av {items.length} klara.</p>
            <ItemList items={items} />
          </div>
        )}

        {step === 'list' && (
          <>
            <AiNote box style={{ marginBottom: '16px' }}>
              {(() => {
                const read = active.filter(it => it.readState === 'read').length
                return read === 0 ? 'AI har inte kunnat läsa någon påse än.' : `AI har läst av ${read === 1 ? 'en påse' : `${read} påsar`}. Granska de markerade innan du sparar; resten kan du spara direkt.`
              })()}
            </AiNote>
            <ItemList
              items={active}
              onEdit={it => { setEditIndex(items.indexOf(it)); setStep('edit') }}
              onRemove={remove}
              onReread={reread}
              swapFor={swapFor}
              onSwapStart={it => setSwapFor(swapFor === it.position ? null : it.position)}
              onSwap={swapBacks}
            />
            {notReady > 0 && (
              <p className="t-caption" style={{ color: 'var(--text-muted)', margin: '12px 0 0' }}>
                {notReady === 1 ? 'En påse' : `${notReady} påsar`} sparas inte förrän {notReady === 1 ? 'den' : 'de'} har lästs och har ett namn. Skanningen sparas, så du kan fortsätta senare.
              </p>
            )}
            <div style={bottomBar}>
              <Button variant="primary" large full disabled={saving || ready.length === 0} onClick={saveAll}>
                {saving ? 'Sparar…' : `Spara ${ready.length} ${ready.length === 1 ? 'frö' : 'fröer'}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PhotoCard({ label, title, hint, preview, multiple, onFiles, onSkip, skipLabel, disabled, children }) {
  const cameraRef = useRef(null)
  const libraryRef = useRef(null)
  const pick = e => { onFiles(e.target.files); e.target.value = '' }
  return (
    <div className="card card--roomy">
      <SectionLabel>{label}</SectionLabel>
      <p className="t-heading" style={{ margin: '0 0 6px' }}>{title}</p>
      <p className="t-small" style={{ margin: '0 0 16px', color: 'var(--text-muted)' }}>{hint}</p>
      {preview && <img src={preview} alt="Framsidan på påsen" style={{ width: '96px', borderRadius: 'var(--radius-sm)', margin: '0 0 16px', display: 'block' }} />}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={pick} hidden />
      <input ref={libraryRef} type="file" accept="image/*" multiple={multiple} onChange={pick} hidden />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Button variant="primary" large full disabled={disabled} onClick={() => cameraRef.current?.click()}>Ta foto</Button>
        <Button full disabled={disabled} onClick={() => libraryRef.current?.click()}>{multiple ? 'Välj från bilder (flera går bra)' : 'Välj från bilder'}</Button>
        {onSkip && <Button variant="ghost" full onClick={onSkip}>{skipLabel}</Button>}
      </div>
      {children}
    </div>
  )
}

function Thumbs({ front, back }) {
  const style = { width: '72px', height: '96px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {previewOf(front) && <img src={previewOf(front)} alt="Framsidan" style={style} />}
      {previewOf(back) && <img src={previewOf(back)} alt="Baksidan" style={style} />}
    </div>
  )
}

function ItemList({ items, onEdit, onRemove, onReread, swapFor, onSwapStart, onSwap }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map(it => {
        const unsure = uncertainLabels(it.reading)
        const mismatch = it.reading?.back_matches === false
        const name = it.form ? toValues(it.form).name : null
        const sub = it.form ? [toValues(it.form).cultivar, toValues(it.form).supplier].filter(Boolean).join(' · ') : ''
        const others = items.filter(o => o.position !== it.position && o.back)
        return (
          <li key={it.position} className="card card--compact">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <img src={previewOf(it.front)} alt="" style={{ width: '48px', height: '64px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="t-heading-s" style={{ margin: 0 }}>{name || `Påse ${it.position}`}</p>
                {sub && <p className="t-caption" style={{ margin: '2px 0 0', color: 'var(--text-muted)' }}>{sub}</p>}
                <p className="t-caption" style={{ margin: '4px 0 0', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                  {it.readState === 'reading' && <span>Läser…</span>}
                  {it.readState === 'idle' && <span style={{ color: 'var(--text-muted)' }}>Väntar</span>}
                  {it.readState === 'failed' && <span style={{ color: 'var(--danger-text)' }}>{it.error || 'Kunde inte läsas'}</span>}
                  {it.readState === 'read' && !it.back && <span style={{ color: 'var(--text-muted)' }}>Ingen baksida</span>}
                  {it.readState === 'read' && mismatch && <span className="field-check">Baksidan verkar höra till en annan påse</span>}
                  {it.readState === 'read' && unsure.length > 0 && !it.reviewed && <span className="field-check">Kontrollera: {unsure.join(', ')}</span>}
                  {it.readState === 'read' && !name && <span className="field-check">Namn saknas</span>}
                  {it.reviewed && <span style={{ color: 'var(--text-accent)', fontWeight: 700 }}>Granskad</span>}
                </p>
              </div>
            </div>
            {onEdit && it.readState !== 'reading' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {it.readState === 'read' && <Button onClick={() => onEdit(it)}>Granska</Button>}
                {it.readState === 'failed' && <Button onClick={() => onReread(it)}>Läs om</Button>}
                {it.back && others.length > 0 && <Button variant="ghost" aria-expanded={swapFor === it.position} onClick={() => onSwapStart(it)}>Byt baksida</Button>}
                <Button variant="danger-ghost" onClick={() => onRemove(it)}>Ta bort</Button>
              </div>
            )}
            {swapFor === it.position && (
              <div style={{ marginTop: '10px' }}>
                <p className="t-caption" style={{ margin: '0 0 6px' }}>Byt baksida med:</p>
                <div className="chips">
                  {others.map(o => (
                    <button key={o.position} type="button" className="chip" onClick={() => onSwap(it, o)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <img src={previewOf(o.back)} alt="" style={{ width: '20px', height: '26px', objectFit: 'cover', borderRadius: '3px' }} />
                      {o.form ? toValues(o.form).name || `Påse ${o.position}` : `Påse ${o.position}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
