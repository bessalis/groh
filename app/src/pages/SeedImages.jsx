// Fröbilder (bara admin). Kön visar sorter och arter som saknar bild, flest
// användare först. Välj en eller flera planscher från ChatGPT; appen gissar sort
// från filnamnet och du rättar i listan. Varje original går direkt till den
// privata bucketen via en engångslänk, sedan gör /api/seed-image om det till
// två WebP-storlekar. Uppladdning = godkännande.

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { callAi } from '../lib/api'
import { Button, SectionLabel, AiNote } from '../components/ui'

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
const QUEUE_SHOWN = 12

const cap = v => (v ? v.charAt(0).toUpperCase() + v.slice(1) : v)
const fold = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const wordsOf = v => fold(v).split(/[^a-z0-9]+/).filter(Boolean)

// Valbara arter och sorter med svenska namn (det användare skrivit, plant_names),
// sortnamn och latinskt namn. Svenska namnet först, det latinska som stöd.
function buildOptions(facts, varieties, names) {
  const byKey = {}
  for (const f of facts) byKey[f.key] = { latin: f.species, names: f.swedish_name ? [f.swedish_name] : [] }
  for (const n of names) byKey[n.key]?.names.push(n.name)
  // Kortaste namnet först: "potatis" hellre än "potatis cheri" som någon skrivit med sorten i.
  // Artens svenska namn (med å, ä, ö) går först om det finns.
  for (const k in byKey) {
    const own = facts.find(f => f.key === k)?.swedish_name
    byKey[k].names = [...(own ? [own] : []), ...byKey[k].names.filter(n => n !== own).sort((x, y) => x.length - y.length)]
  }
  const title = key => cap(byKey[key]?.names[0]) || byKey[key]?.latin || key
  const options = facts.map(f => ({
    key: f.key, kind: 'species', title: title(f.key), latin: f.species,
    words: [wordsOf(title(f.key)), wordsOf(f.species)],
  }))
  for (const v of varieties) {
    const latin = byKey[v.species_key]?.latin || v.species_key
    options.push({
      key: v.key, kind: 'variety', title: `${title(v.species_key)} ’${v.cultivar}’`, latin,
      words: [wordsOf(`${title(v.species_key)} ${v.cultivar}`), wordsOf(`${latin} ${v.cultivar}`)],
    })
  }
  return options.sort((a, b) => a.title.localeCompare(b.title, 'sv'))
}

// Gissar art eller sort från filnamnet: alla ord i namnet (svenskt eller latinskt)
// ska finnas i filnamnet. Flest träffade ord vinner, så en sort går före sin art.
function guessKey(fileName, options, queueKeys) {
  const inFile = new Set(wordsOf(fileName.replace(/\.[a-z0-9]+$/i, '')))
  let best = null
  for (const o of options) {
    for (const words of o.words) {
      if (!words.length || !words.every(w => inFile.has(w))) continue
      const score = words.length * 10 + (queueKeys.has(o.key) ? 1 : 0)
      if (!best || score > best.score) best = { key: o.key, score }
    }
  }
  return best?.key || ''
}

// Växtnamnet i ett filnamn: "luktart_growing 2.png" → "luktart".
const PHASE_WORDS = new Set(['seed', 'seedling', 'growing', 'mature', 'plansch', 'bild', 'v1', 'v2', 'v3'])
function plantNameFromFile(fileName) {
  if (/chatgpt|dall.?e|image|img_|screenshot|skärmavbild/i.test(fileName)) return ''
  return fileName.replace(/\.[a-z0-9]+$/i, '').split(/[^\p{L}\p{N}]+/u)
    .filter(w => w && !PHASE_WORDS.has(w.toLowerCase()) && !/^\d+$/.test(w)).join(' ')
}

function publicUrl(path) {
  return supabase.storage.from('seed-images').getPublicUrl(path).data.publicUrl
}

let rowId = 0

export default function SeedImages({ onBack }) {
  const [options, setOptions] = useState([])
  const [images, setImages] = useState([])
  const [queue, setQueue] = useState(null)
  const [rows, setRows] = useState([])        // { id, file, preview, key, status, message, result }
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [newPlant, setNewPlant] = useState('')
  const [newCultivar, setNewCultivar] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [redo, setRedo] = useState('')

  async function load() {
    const [facts, varieties, names, imgs] = await Promise.all([
      supabase.from('plant_facts').select('key, species, swedish_name'),
      supabase.from('plant_varieties').select('key, species_key, cultivar'),
      supabase.from('plant_names').select('name, key'),
      supabase.from('seed_images').select('key, small_path, updated_at').order('updated_at', { ascending: false }),
    ])
    const opts = buildOptions(facts.data || [], varieties.data || [], names.data || [])
    setOptions(opts)
    setImages(imgs.data || [])
    try { setQueue(await callAi('/api/seed-image', { action: 'queue' })) } catch { setQueue({ items: [], unlinked: 0, failed: true }) }
    return opts
  }
  useEffect(() => { load() }, [])

  const byKey = useMemo(() => new Map(options.map(o => [o.key, o])), [options])
  const hasImage = useMemo(() => new Set(images.map(i => i.key)), [images])
  const queueKeys = useMemo(() => new Set((queue?.items || []).map(i => i.key)), [queue])
  const titleOf = k => byKey.get(k)?.title || k

  function addFiles(list) {
    const files = [...list].filter(f => EXT[f.type])
    if (files.length < list.length) setError('Bara PNG, JPEG och WebP går att ladda upp. Andra filer hoppades över.')
    else setError('')
    setRows(r => [...r, ...files.map(file => ({
      id: ++rowId, file, preview: URL.createObjectURL(file),
      key: guessKey(file.name, options, queueKeys), status: 'ready', message: '', result: null,
    }))])
  }

  function updateRow(id, patch) {
    setRows(r => r.map(row => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id) {
    setRows(r => {
      const row = r.find(x => x.id === id)
      if (row) URL.revokeObjectURL(row.preview)
      return r.filter(x => x.id !== id)
    })
  }

  async function uploadOne(row) {
    updateRow(row.id, { status: 'working', message: 'Laddar upp …' })
    try {
      const target = await callAi('/api/seed-image', { action: 'upload-url', key: row.key, ext: EXT[row.file.type] })
      const { error: upErr } = await supabase.storage.from('seed-image-originals').uploadToSignedUrl(target.path, target.token, row.file, { contentType: row.file.type })
      if (upErr) throw upErr
      updateRow(row.id, { message: 'Beskär och gör om …' })
      const result = await callAi('/api/seed-image', { action: 'publish', key: row.key, originalPath: target.path })
      updateRow(row.id, { status: 'done', message: result.trimmed ? 'Klar' : 'Klar, men kanten kunde inte beskäras automatiskt', result })
    } catch (err) {
      updateRow(row.id, { status: 'failed', message: err?.message || 'Det gick inte att ladda upp.' })
    }
  }

  const pending = rows.filter(r => r.status === 'ready' || r.status === 'failed')
  const missingKey = pending.some(r => !r.key)
  const chosenKeys = pending.map(r => r.key).filter(Boolean)
  const duplicateKey = new Set(chosenKeys).size < chosenKeys.length
  const unguessed = pending.filter(r => !r.key && plantNameFromFile(r.file.name))

  async function uploadAll() {
    setError(''); setBusy('Laddar upp …')
    // En i taget: snällt mot serverfunktionen och lätt att följa.
    for (const row of pending) await uploadOne(row)
    setBusy('')
    await load()
  }

  // Slår upp arten från filnamnet för bilder utan val, en i taget (samma uppslag
  // som när ett frö kopplas: sparat svar först, annars ett AI-anrop som delas).
  async function lookupFromNames() {
    setError('')
    const found = {}
    for (const row of unguessed) {
      const name = plantNameFromFile(row.file.name)
      setBusy(`Slår upp ${name} …`)
      updateRow(row.id, { message: `Slår upp ${name} …` })
      try {
        const res = await callAi('/api/link-variety', { name, species: '', cultivar: '' })
        if (res.facts?.key) found[row.id] = res.facts.key
        updateRow(row.id, { message: res.facts?.key ? '' : `Hittade ingen växt som heter ${name}.` })
      } catch (err) {
        updateRow(row.id, { message: err?.message || `Kunde inte slå upp ${name}.` })
      }
    }
    await load()
    setRows(r => r.map(row => (found[row.id] ? { ...row, key: found[row.id] } : row)))
    setBusy('')
  }

  // Gör om alla bilder från de sparade originalen, t.ex. efter ändrad beskärning.
  async function reprocessAll() {
    setError('')
    let failed = 0
    for (const [i, img] of images.entries()) {
      setRedo(`Gör om ${i + 1} av ${images.length} …`)
      try { await callAi('/api/seed-image', { action: 'reprocess', key: img.key }) } catch { failed++ }
    }
    setRedo(failed ? `Klart, men ${failed} gick inte att göra om.` : 'Klart.')
    await load()
  }

  function clearDone() {
    rows.filter(r => r.status === 'done').forEach(r => URL.revokeObjectURL(r.preview))
    setRows(r => r.filter(x => x.status !== 'done'))
  }

  // Arten eller sorten finns inte i den delade datan än: slå upp och lägg till
  // (samma som när ett frö kopplas, högst ett AI-anrop om arten är ny).
  async function addPlant() {
    if (!newPlant.trim()) return
    setError(''); setBusy('Slår upp växten …')
    try {
      const res = await callAi('/api/link-variety', { name: newPlant.trim(), species: '', cultivar: newCultivar.trim() })
      const newKey = res.variety?.key || res.facts?.key
      if (!newKey) throw new Error('Växten kunde inte sparas. Försök igen.')
      const opts = await load()
      // Gissa om filer som saknar val; annars får de den nya sorten.
      setRows(r => r.map(row => (row.key ? row : { ...row, key: guessKey(row.file.name, opts, new Set()) || newKey })))
      setAdding(false); setNewPlant(''); setNewCultivar('')
    } catch (err) {
      setError(err?.message || 'Det gick inte att slå upp växten.')
    }
    setBusy('')
  }

  const queueItems = queue?.items || []
  const shownQueue = showAll ? queueItems : queueItems.slice(0, QUEUE_SHOWN)

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', padding: '24px 16px calc(100px + env(safe-area-inset-bottom))', display: 'grid', gap: '16px' }}>
      <div>
        <Button variant="link" onClick={onBack}>← Profil</Button>
        <h1 className="t-display-m" style={{ margin: '8px 0 4px' }}>Fröbilder</h1>
        <p className="t-small" style={{ color: 'var(--text-muted)', margin: 0 }}>
          En plansch per sort, eller per art som reserv. Bilderna beskärs, centreras och sparas i två storlekar. Uppladdning räknas som godkännande.
        </p>
      </div>

      {/* Kön */}
      <div className="card" style={{ display: 'grid', gap: '10px' }}>
        <SectionLabel style={{ margin: 0 }}>Saknar bild{queue && !queue.failed ? ` (${queueItems.length})` : ''}</SectionLabel>
        {!queue && <p className="t-small" style={{ color: 'var(--text-muted)', margin: 0 }}>Räknar …</p>}
        {queue?.failed && <p className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>Kön gick inte att hämta just nu.</p>}
        {queue && !queue.failed && !queueItems.length && <p className="t-small" style={{ color: 'var(--text-muted)', margin: 0 }}>Alla sorter och arter som odlas har en bild.</p>}
        {shownQueue.length > 0 && (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
            {shownQueue.map(item => (
              <li key={item.key} style={{ display: 'grid', gap: '2px' }}>
                <span className="t-body">{titleOf(item.key)}</span>
                <span className="t-caption" style={{ color: 'var(--text-muted)' }}>
                  <span className="t-latin">{byKey.get(item.key)?.latin}</span>
                  {' · '}{item.users === 1 ? '1 odlare' : `${item.users} odlare`}
                  {item.seeds > item.users ? `, ${item.seeds} påsar` : ''}
                  {item.reserve ? ' · visar artens bild tills vidare' : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
        {queueItems.length > QUEUE_SHOWN && (
          <Button variant="link" onClick={() => setShowAll(v => !v)} style={{ justifySelf: 'start' }}>
            {showAll ? 'Visa färre' : `Visa alla ${queueItems.length}`}
          </Button>
        )}
        {queue?.unlinked > 0 && (
          <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0 }}>
            {queue.unlinked === 1 ? '1 frö' : `${queue.unlinked} fröer`} går inte att koppla till en art än och räknas inte.
          </p>
        )}
      </div>

      {/* Uppladdning */}
      <div className="card" style={{ display: 'grid', gap: '14px' }}>
        <SectionLabel style={{ margin: 0 }}>Ladda upp</SectionLabel>
        <div className="field">
          <label className="field-label" htmlFor="image-files">Välj en eller flera bilder</label>
          <input id="image-files" className="field-input" type="file" multiple accept="image/png,image/jpeg,image/webp"
            onChange={e => { addFiles(e.target.files || []); e.target.value = '' }} />
          <p className="field-hint">Döp gärna filerna efter sorten, t.ex. potatis-cheri.png, så väljs den automatiskt.</p>
        </div>

        {rows.map(row => (
          <div key={row.id} className="card card--muted card--compact" style={{ display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr)', gap: '12px', alignItems: 'start' }}>
            <img src={row.result?.small || row.preview} alt="" style={{ width: '64px', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
            <div style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
              <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0, overflowWrap: 'anywhere' }}>{row.file.name}</p>
              {row.status === 'done' ? (
                <p className="t-body" style={{ margin: 0 }}>{titleOf(row.key)}</p>
              ) : (
                <select className="field-input" aria-label={`Art eller sort för ${row.file.name}`} value={row.key}
                  disabled={row.status === 'working'} onChange={e => updateRow(row.id, { key: e.target.value, status: 'ready', message: '' })}>
                  <option value="">Välj art eller sort …</option>
                  {queueItems.length > 0 && (
                    <optgroup label="Saknar bild">
                      {queueItems.map(i => <option key={'q' + i.key} value={i.key}>{titleOf(i.key)}</option>)}
                    </optgroup>
                  )}
                  <optgroup label="Alla arter och sorter">
                    {options.map(o => <option key={o.key} value={o.key}>{o.title}{o.kind === 'species' ? ' (art)' : ''}{hasImage.has(o.key) ? ' · har bild' : ''}</option>)}
                  </optgroup>
                </select>
              )}
              {row.key && row.status !== 'done' && byKey.get(row.key) && (
                <p className="t-caption t-latin" style={{ color: 'var(--text-muted)', margin: 0 }}>{byKey.get(row.key).latin}</p>
              )}
              {row.key && row.status !== 'done' && hasImage.has(row.key) && (
                <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0 }}>Har redan en bild, den nya ersätter den.</p>
              )}
              {row.message && (
                <p role={row.status === 'failed' ? 'alert' : 'status'} className="t-caption"
                  style={{ margin: 0, color: row.status === 'failed' ? 'var(--danger-text)' : 'var(--text-muted)' }}>{row.message}</p>
              )}
              {row.status !== 'working' && row.status !== 'done' && (
                <Button variant="ghost" onClick={() => removeRow(row.id)} style={{ justifySelf: 'start' }}>Ta bort från listan</Button>
              )}
            </div>
          </div>
        ))}

        {pending.length > 0 && (
          <>
            {unguessed.length > 0 && (
              <div className="card card--soft card--compact" style={{ display: 'grid', gap: '8px' }}>
                <p className="t-small" style={{ margin: 0 }}>
                  {unguessed.length === 1 ? '1 bild' : `${unguessed.length} bilder`} har en växt som inte finns i Groh! än. Appen kan slå upp dem från filnamnen.
                </p>
                <Button onClick={lookupFromNames} disabled={Boolean(busy)} style={{ justifySelf: 'start' }}>{busy || 'Slå upp från filnamnen'}</Button>
                <AiNote>Nya arter slås upp med AI en gång och sparas för alla. Kolla att rätt art blev vald innan du laddar upp.</AiNote>
              </div>
            )}
            {missingKey && !unguessed.length && <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0 }}>Välj art eller sort för alla bilder.</p>}
            {duplicateKey && <p className="t-caption" style={{ color: 'var(--danger-text)', margin: 0 }}>Två bilder har samma sort. Välj om eller ta bort den ena.</p>}
            <Button variant="primary" full onClick={uploadAll} disabled={missingKey || duplicateKey || Boolean(busy)}>
              {busy || (pending.length === 1 ? 'Ladda upp och godkänn' : `Ladda upp och godkänn ${pending.length} bilder`)}
            </Button>
          </>
        )}
        {rows.some(r => r.status === 'done') && !busy && (
          <>
            <AiNote>Bilderna är gjorda med AI (ChatGPT, i Haeckels manér) och märks så i appen.</AiNote>
            <Button variant="ghost" onClick={clearDone} style={{ justifySelf: 'start' }}>Rensa klara</Button>
          </>
        )}
        {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}

        {!adding ? (
          <Button variant="link" onClick={() => setAdding(true)} style={{ justifySelf: 'start' }}>Finns inte sorten i listan? Lägg till</Button>
        ) : (
          <div className="card card--muted card--compact" style={{ display: 'grid', gap: '10px' }}>
            <div className="field">
              <label className="field-label" htmlFor="new-plant">Växt (svenskt eller latinskt namn)</label>
              <input id="new-plant" className="field-input" value={newPlant} onChange={e => setNewPlant(e.target.value)} placeholder="t.ex. potatis" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="new-cultivar">Sort (valfritt)</label>
              <input id="new-cultivar" className="field-input" value={newCultivar} onChange={e => setNewCultivar(e.target.value)} placeholder="t.ex. Cheri" />
              <p className="field-hint">Arten slås upp med AI om ingen har den sparad. Utan sort gäller bilden hela arten.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={addPlant} disabled={!newPlant.trim() || Boolean(busy)}>{busy || 'Slå upp och lägg till'}</Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>Avbryt</Button>
            </div>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <SectionLabel style={{ margin: 0 }}>Har bild ({images.length})</SectionLabel>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button onClick={reprocessAll} disabled={Boolean(redo && redo.endsWith('…')) || Boolean(busy)}>Gör om alla från originalen</Button>
            {redo && <span role="status" className="t-caption" style={{ color: 'var(--text-muted)' }}>{redo}</span>}
          </div>
          <div className="packet-photos" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {images.map(img => (
              <figure key={img.key} style={{ margin: 0, display: 'grid', gap: '4px' }}>
                <img src={publicUrl(img.small_path)} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                <figcaption className="t-caption" style={{ color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{titleOf(img.key)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
