// Fröbilder (bara admin). Välj art eller sort, ladda upp planschen från ChatGPT.
// Originalet går direkt till den privata bucketen via en engångslänk, sedan gör
// /api/seed-image om det till två WebP-storlekar. Uppladdning = godkännande.
// Kön över sorter som saknar bild kommer i nästa steg.

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { callAi } from '../lib/api'
import { Button, SectionLabel, AiNote } from '../components/ui'

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

function publicUrl(path) {
  return supabase.storage.from('seed-images').getPublicUrl(path).data.publicUrl
}

export default function SeedImages({ onBack }) {
  const [options, setOptions] = useState([])
  const [images, setImages] = useState([])
  const [key, setKey] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function load() {
    const [facts, varieties, imgs] = await Promise.all([
      supabase.from('plant_facts').select('key, swedish_name').order('key'),
      supabase.from('plant_varieties').select('key, swedish_name').order('key'),
      supabase.from('seed_images').select('key, small_path, updated_at').order('updated_at', { ascending: false }),
    ])
    setOptions([...(varieties.data || []), ...(facts.data || [])])
    setImages(imgs.data || [])
  }
  useEffect(() => { load() }, [])

  const hasImage = useMemo(() => new Set(images.map(i => i.key)), [images])
  const known = options.some(o => o.key === key.trim().toLowerCase())

  async function upload(e) {
    e.preventDefault()
    if (!file || !key.trim()) return
    setError(''); setResult(null)
    try {
      setBusy('Laddar upp originalet …')
      const target = await callAi('/api/seed-image', { action: 'upload-url', key: key.trim(), ext: EXT[file.type] })
      const { error: upErr } = await supabase.storage.from('seed-image-originals').uploadToSignedUrl(target.path, target.token, file, { contentType: file.type })
      if (upErr) throw upErr
      setBusy('Beskär och gör om bilden …')
      setResult(await callAi('/api/seed-image', { action: 'publish', key: key.trim(), originalPath: target.path }))
      setFile(null)
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
          <input id="image-key" className="field-input" list="image-keys" value={key} onChange={e => setKey(e.target.value)} placeholder="lathyrus odoratus|cupani" autoComplete="off" />
          <datalist id="image-keys">
            {options.map(o => <option key={o.key} value={o.key}>{o.swedish_name || ''}{hasImage.has(o.key) ? ' (har bild)' : ''}</option>)}
          </datalist>
          <p className="field-hint">
            {key && !known ? 'Hittar ingen art eller sort med den nyckeln.' : 'Sort: art|sort. Art: bara det latinska namnet.'}
            {known && hasImage.has(key.trim().toLowerCase()) ? ' Har redan en bild, den nya ersätter den.' : ''}
          </p>
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
            {result.key} · {Math.round(result.bytes.small / 1024)} kB och {Math.round(result.bytes.large / 1024)} kB
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
                <figcaption className="t-caption" style={{ color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{img.key}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
