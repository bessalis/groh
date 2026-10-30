import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui'

const images = import.meta.glob('../assets/*.png', { eager: true })

const IMG_MAP = {
  'Amaranthus': 'amarant',
  'Callistephus chinensis': 'aster',
  'Limonium sinuatum': 'luktart',
  'Brassica oleracea': 'brysselkal',
  'Celosia argentea': 'celosia',
  'Phlox drummondii': 'flox',
  'Briza maxima': 'jungfruhirs',
  'Lavandula angustifolia': 'lavendel',
  'Antirrhinum majus': 'lejongap',
  'Lathyrus odoratus': 'luktart',
  'Scabiosa atropurpurea': 'praktvadd',
  'Delphinium': 'riddarsporre',
  'Cosmos bipinnatus': 'rosenskara',
  'Cynara scolymus': 'kronartskocka',
  'Papaver orientale': 'vallmo',
}

function getPhase(sownDate) {
  if (!sownDate) return 'growing'
  const days = Math.floor((Date.now() - new Date(sownDate).getTime()) / 86400000)
  if (days <= 7) return 'seed'
  if (days <= 21) return 'seedling'
  if (days <= 60) return 'growing'
  return 'mature'
}

function SeedImage({ name, species, sownDate, currentPhase }) {
  const file = IMG_MAP[species] || 'fallback'
  const phase = currentPhase || getPhase(sownDate)
  const fallback = images['../assets/fallback_growing.png']?.default
  const src = images['../assets/' + file + '_' + phase + '.png']?.default || fallback
  return (
    <div style={{ width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'var(--surface-raised)' }}>
      <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={e => { if (e.target.src !== fallback) e.target.src = fallback }} />
    </div>
  )
}

export default function SeedArchive({ onSelect, onAdd }) {
  const [seeds, setSeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [swipedId, setSwipedId] = useState(null)

  const bg = 'var(--bg)'
  const text = 'var(--text)'
  const muted = 'var(--text-muted)'
  const borderColor = 'var(--border-color)'
  const inputBg = 'var(--surface)'

  const [compost, setCompost] = useState(false)

  async function fetchSeeds(showCompost = compost) {
    setLoading(true)
    const { data } = await supabase
      .from('seeds').select('*').eq('is_archived', showCompost)
      .order('created_at', { ascending: false })
    if (data) setSeeds(data)
    setLoading(false)
  }

  // Hämtas en gång vid start; fliken byter lista via switchTab
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSeeds(false) }, [])

  function switchTab(showCompost) {
    setCompost(showCompost)
    setSwipedId(null)
    fetchSeeds(showCompost)
  }

  async function restoreSeed(id) {
    await supabase.from('seeds').update({ is_archived: false }).eq('id', id)
    setSeeds(prev => prev.filter(s => s.id !== id))
  }

  async function archiveSeed(id) {
    await supabase.from('seeds').update({ is_archived: true }).eq('id', id)
    setSeeds(prev => prev.filter(s => s.id !== id))
    setSwipedId(null)
  }

  const filtered = seeds.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  function phaseLabel(sownDate) {
    if (!sownDate) return null
    const days = Math.floor((Date.now() - new Date(sownDate).getTime()) / 86400000)
    if (days <= 7) return 'Precis sått 🌱'
    if (days <= 21) return 'Groddar nu 🌿'
    if (days <= 60) return 'Växer fint 🌸'
    return 'Mogen 🌺'
  }

  function statusLabel(seed) {
    if (seed.thumb === 'down') return { label: 'Tänk efter', color: 'var(--danger-text)' }
    if (seed.sown_date) {
      const phase = phaseLabel(seed.sown_date)
      const date = new Date(seed.sown_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
      return { label: phase + ' · Sått ' + date, color: muted }
    }
    if (seed.frost_sensitive) return { label: 'Frostkänslig', color: 'var(--warn-text)' }
    if (seed.requires_pretreatment) return { label: 'Förbehandling', color: 'var(--info-text)' }
    return { label: 'Klar att så', color: muted }
  }

  function SwipeCard({ seed }) {
    const startX = useRef(null)
    const [offset, setOffset] = useState(0)
    const THRESHOLD = 80

    function onTouchStart(e) {
      startX.current = e.touches[0].clientX
      if (swipedId && swipedId !== seed.id) setSwipedId(null)
    }
    function onTouchMove(e) {
      if (startX.current === null) return
      const diff = startX.current - e.touches[0].clientX
      if (diff > 0) setOffset(Math.min(diff, 120))
      else setOffset(0)
    }
    function onTouchEnd() {
      if (offset >= THRESHOLD) { setSwipedId(seed.id); setOffset(90) }
      else { setOffset(0); if (swipedId === seed.id) setSwipedId(null) }
      startX.current = null
    }

    const isOpen = swipedId === seed.id
    const cardOffset = isOpen ? 90 : offset

    return (
      <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '90px', background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '0 var(--radius-lg) var(--radius-lg) 0' }}
          onClick={() => archiveSeed(seed.id)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px' }}>📦</div>
            <div style={{ fontSize: '10px', color: 'var(--on-danger)', marginTop: '2px' }}>Arkivera</div>
          </div>
        </div>
        <div
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          onClick={() => { if (cardOffset < 10) onSelect && onSelect(seed) }}
          className="card" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transform: 'translateX(-' + cardOffset + 'px)', transition: offset === 0 && !isOpen ? 'transform 0.3s ease' : 'none', position: 'relative', zIndex: 1 }}>
        <SeedImage name={seed.name} species={seed.species} sownDate={seed.sown_date} currentPhase={seed.current_phase} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontSize: 'var(--display-s)', color: text, lineHeight: 1.1, fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'normal', letterSpacing: '0.01em' }}>{seed.name}</p>
            <p style={{ margin: '0 0 4px', fontSize: '14px', color: muted, fontFamily: 'var(--font-latin)', fontVariationSettings: 'var(--fraunces-soft)', fontStyle: 'italic' }}>{seed.species}</p>
            <span style={{ fontSize: '11px', color: statusLabel(seed).color }}>{statusLabel(seed).label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {seed.is_favorite && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill={muted} stroke={muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            )}
            <span style={{ color: muted, fontSize: '18px' }}>›</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '24px 16px 16px' }}>
        <h1 style={{ fontSize: 'var(--display-l)', fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'normal', letterSpacing: '0.01em', color: text, margin: '0 0 4px' }}>Fröarkivet</h1>
        <p style={{ fontSize: '13px', color: muted, margin: '0 0 16px' }}>{compost ? `${seeds.length} i komposten` : `${seeds.length} frön i din samling`}</p>
        <div role="tablist" aria-label="Visa" style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {[[false, 'Fröer'], [true, 'Komposten']].map(([value, label]) => (
            <button key={label} type="button" role="tab" aria-selected={compost === value} onClick={() => switchTab(value)} className="t-small"
              style={{ padding: '8px 14px', borderRadius: '999px', cursor: 'pointer', border: '0.5px solid ' + (compost === value ? muted : borderColor), background: compost === value ? 'var(--accent-selected)' : 'transparent', color: text, fontWeight: compost === value ? 700 : 400 }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: '12px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök frön..."
            style={{ width: '100%', padding: '12px 16px', background: inputBg, border: '0.5px solid ' + borderColor, borderRadius: '12px', fontSize: '14px', color: text, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <Button variant="primary" large full onClick={() => onAdd && onAdd()} style={{ marginBottom: '20px' }}>
          + Lägg till frö
        </Button>
      </div>
      <div style={{ padding: '0 16px' }}>
        {loading && <p style={{ color: muted, fontStyle: 'italic', textAlign: 'center' }}>Hämtar frön...</p>}
        {!loading && filtered.length === 0 && <p style={{ color: muted, textAlign: 'center' }}>{compost ? 'Komposten är tom.' : 'Inga frön hittades'}</p>}
        {compost && !loading && filtered.length > 0 && (
          <p className="t-small" style={{ color: muted, margin: '0 0 12px' }}>Här hamnar det som inte blev något, och det du arkiverat. Inget försvinner: det blir näring till nästa år.</p>
        )}
        {!compost && filtered.map(seed => <SwipeCard key={seed.id} seed={seed} />)}
        {compost && filtered.map(seed => (
          <div key={seed.id} className="card" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-heading-s" style={{ color: text, margin: 0 }}>{seed.name}</p>
              {seed.thumb_note && <p className="t-caption" style={{ color: muted, margin: '2px 0 0' }}>{seed.thumb_note}</p>}
            </div>
            <Button onClick={() => restoreSeed(seed.id)} style={{ whiteSpace: 'nowrap' }}>Plocka tillbaka</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
