// Fröbilder (bara admin). Välj art eller sort, ladda upp planschen från ChatGPT.
// Originalet går direkt till den privata bucketen via en engångslänk, sedan gör
// /api/seed-image om det till två WebP-storlekar. Uppladdning = godkännande.
// Kön över sorter som saknar bild kommer i nästa steg.

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { callAi } from '../lib/api'
import { Button, SectionLabel, AiNote } from '../components/ui'

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

const cap = v => (v ? v.charAt(0).toUpperCase() + v.slice(1) : v)
const fold = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Sökbara val: arter och sorter med svenska namn (det användare skrivit, plant_names),
// sortnamn och latinskt namn. Svenska namnet först, det latinska som stöd.
function buildOptions(facts, varieties, names) {
  const byKey = {}
  for (const f of facts) byKey[f.key] = { latin: f.species, names: f.swedish_name ? [f.swedish_name] : [] }
  for (const n of names) byKey[n.key]?.names.push(n.name)
  // Kortaste namnet först: "potatis" hellre än "potatis cheri" som någon skrivit med sorten i.
  for (const k in byKey) byKey[k].names.sort((x, y) => x.length - y.length)
  const title = key => cap(byKey[key]?.names[0]) || byKey[key]?.latin || key
  const options = facts.map(f => ({
    key: f.key, title: title(f.key), sub: `${f.species} · art`,
    search: fold([...byKey[f.key].names, f.species].join(' ')),
  }))
  for (const v of varieties) {
    options.push({
      key: v.key, title: `${title(v.species_key)} ’${v.cultivar}’`, sub: `${byKey[v.species_key]?.latin || v.species_key} · sort`,
      search: fold([...(byKey[v.species_key]?.names || []), v.cultivar, byKey[v.species_key]?.latin].join(' ')),
    })
  }
  return options.sort((a, b) => a.title.localeCompare(b.title, 'sv'))
}

function publicUrl(path) {
  return supabase.storage.from('seed-images').getPublicUrl(path).data.publicUrl
}

export default function SeedImages({ onBack }) {
  const [options, setOptions] = useState([])
  const [images, setImages] = useState([])
  const [key, setKey] = useState('')
  const [query, setQuery] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newPlant, setNewPlant] = useState('')
  const [newCultivar, setNewCultivar] = useState('')

  async function load() {
    const [facts, varieties, names, imgs] = await Promise.all([
      supabase.from('plant_facts').select('key, species, swedish_name'),
      supabase.from('plant_varieties').select('key, species_key, cultivar'),
      supabase.from('plant_names').select('name, key'),
      supabase.from('seed_images').select('key, small_path, updated_at').order('updated_at', { ascending: false }),
    ])
    setOptions(buildOptions(facts.data || [], varieties.data || [], names.data || []))
    setImages(imgs.data || [])
  }
  useEffect(() => { load() }, [])

  const hasImage = useMemo(() => new Set(images.map(i => i.key)), [images])
  const chosen = options.find(o => o.key === key)
  const known = Boolean(chosen)
  const words = fold(query).split(/\s+/).filter(Boolean)
  const matches = !words.length || chosen ? [] : options.filter(o => words.every(w => o.search.includes(w))).slice(0, 8)
  const titleOf = k => options.find(o => o.key === k)?.title || k

  // Arten eller sorten finns inte i den delade datan än: slå upp och lägg till
  // (samma som när ett frö kopplas, högst ett AI-anrop om arten är ny).
  async function addPlant() {
    if (!newPlant.trim()) return
    setError(''); setBusy('Slår upp växten …')
    try {
      const res = await callAi('/api/link-variety', { name: newPlant.trim(), species: '', cultivar: newCultivar.trim() })
      const newKey = res.variety?.key || res.facts?.key
      if (!newKey) throw new Error('Växten kunde inte sparas. Försök igen.')
      await load()
      setKey(newKey)
      setQuery(res.variety ? `${newPlant.trim()} ’${newCultivar.trim()}’` : newPlant.trim())
      setAdding(false); setNewPlant(''); setNewCultivar('')
    } catch (err) {
      setError(err?.message || 'Det gick inte att slå upp växten.')
    }
    setBusy('')
  }

  async function upload(e) {
    e.preventDefault()
    if (!file || !key) return
    setError(''); setResult(null)
    try {
      setBusy('Laddar upp originalet …')
      const target = await callAi('/api/seed-image', { action: 'upload-url', key, ext: EXT[file.type] })
      const { error: upErr } = await supabase.storage.from('seed-image-originals').uploadToSignedUrl(target.path, target.token, file, { contentType: file.type })
      if (upErr) throw upErr
      setBusy('Beskär och gör om bilden …')
      setResult(await callAi('/api/seed-image', { action: 'publish', key, originalPath: target.path }))
      setFile(null); setKey(''); setQuery('')
      await load()
    } catch (err) {
      setError(err?.message || 'Det gick inte att ladda upp bilden.')
    }
    setBusy('')
  }

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', padding: '24px 16px calc(100px + env(safe-area-inset-bottom))', display: 'grid', gap: '16px' }}>
      <div>
        <Button variant="link" onClick={onBack}>← Profil</Button>
        <h1 className="t-display-m" style={{ margin: '8px 0 4px' }}>Fröbilder</h1>
        <p className="t-small" style={{ color: 'var(--text-muted)', margin: 0 }}>
          Ladda upp en plansch per sort, eller per art som reserv. Bilden beskärs, centreras och sparas i två storlekar. Uppladdning räknas som godkännande.
        </p>
      </div>

      <form className="card" onSubmit={upload} style={{ display: 'grid', gap: '14px' }}>
        <div className="field">
          <label className="field-label" htmlFor="image-key">Art eller sort</label>
          <input id="image-key" className="field-input" value={query} autoComplete="off" placeholder="Sök på svenskt namn eller sort, t.ex. luktärt"
            onChange={e => { setQuery(e.target.value); setKey('') }} aria-describedby="image-key-hint" />
          {matches.length > 0 && (
            <div role="listbox" aria-label="Förslag" style={{ display: 'grid', gap: '4px' }}>
              {matches.map(o => (
                <button key={o.key} type="button" role="option" aria-selected="false" className="card card--compact"
                  onClick={() => { setKey(o.key); setQuery(o.title) }} style={{ textAlign: 'left', display: 'grid', gap: '2px' }}>
                  <span className="t-body">{o.title}{hasImage.has(o.key) ? ' · har bild' : ''}</span>
                  <span className="t-caption t-latin" style={{ color: 'var(--text-muted)' }}>{o.sub}</span>
                </button>
              ))}
            </div>
          )}
          <p id="image-key-hint" className="field-hint">
            {chosen ? <>Vald: {chosen.title} <span className="t-latin">({chosen.sub})</span>.{hasImage.has(chosen.key) ? ' Har redan en bild, den nya ersätter den.' : ''}</>
              : query && !matches.length ? 'Hittar ingen art eller sort med det namnet.' : 'Välj en sort, eller arten om bilden ska gälla alla sorter.'}
          </p>
          {!chosen && !adding && (
            <Button variant="link" onClick={() => { setAdding(true); setNewPlant(query) }} style={{ justifySelf: 'start' }}>Finns inte? Lägg till art eller sort</Button>
          )}
          {!chosen && adding && (
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
        <div className="field">
          <label className="field-label" htmlFor="image-file">Bild (PNG, JPEG eller WebP)</label>
          <input id="image-file" className="field-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>
        <Button variant="primary" type="submit" full disabled={!file || !known || Boolean(busy)}>
          {busy || 'Ladda upp och godkänn'}
        </Button>
        {error && <p role="alert" className="t-small" style={{ color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
      </form>

      {result && (
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <SectionLabel style={{ margin: 0 }}>Uppladdad</SectionLabel>
          <img src={result.large} alt={`Plansch för ${result.key}`} style={{ width: '100%', borderRadius: 'var(--radius-sm)' }} />
          <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0 }}>
            {titleOf(result.key)} · {Math.round(result.bytes.small / 1024)} kB och {Math.round(result.bytes.large / 1024)} kB
            {result.trimmed ? '' : ' · Kanten kunde inte beskäras automatiskt'}
          </p>
          <AiNote>Bilden är gjord med AI (ChatGPT, i Haeckels manér).</AiNote>
        </div>
      )}

      {images.length > 0 && (
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <SectionLabel style={{ margin: 0 }}>Har bild ({images.length})</SectionLabel>
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
