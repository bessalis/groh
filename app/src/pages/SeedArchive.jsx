import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function SeedArchive({ dark, onSelect, onAdd }) {
  const [seeds, setSeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [swipedId, setSwipedId] = useState(null)

  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const borderColor = dark ? '#2A2E24' : '#E8E4DA'
  const inputBg = dark ? '#1A1C17' : '#FFFFFF'
  const btnBg = dark ? '#4E6E44' : '#3B5E35'

  async function fetchSeeds() {
    const { data } = await supabase
      .from('seeds')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    if (data) setSeeds(data)
    setLoading(false)
  }

  useEffect(() => { fetchSeeds() }, [])

  async function archiveSeed(id) {
    await supabase.from('seeds').update({ is_archived: true }).eq('id', id)
    setSeeds(prev => prev.filter(s => s.id !== id))
    setSwipedId(null)
  }

  const filtered = seeds.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  function statusLabel(seed) {
    if (seed.thumb === 'down') return { label: 'Tank efter', color: '#E24B4A' }
    if (seed.sown_date) return { label: 'Satt ' + new Date(seed.sown_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }), color: '#7A9E6E' }
    if (seed.frost_sensitive) return { label: 'Frostkanslig', color: '#EF9F27' }
    if (seed.requires_pretreatment) return { label: 'Forbehandling', color: '#7F77DD' }
    return { label: 'Klar att sa', color: muted }
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
      if (offset >= THRESHOLD) {
        setSwipedId(seed.id)
        setOffset(90)
      } else {
        setOffset(0)
        if (swipedId === seed.id) setSwipedId(null)
      }
      startX.current = null
    }

    const isOpen = swipedId === seed.id
    const cardOffset = isOpen ? 90 : offset

    return (
      <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '90px', background: '#C0392B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '0 14px 14px 0' }}
          onClick={() => archiveSeed(seed.id)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px' }}>📦</div>
            <div style={{ fontSize: '10px', color: '#fff', marginTop: '2px' }}>Arkivera</div>
          </div>
        </div>

        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => { if (cardOffset < 10) onSelect && onSelect(seed) }}
          style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transform: 'translateX(-' + cardOffset + 'px)', transition: offset === 0 && !isOpen ? 'transform 0.3s ease' : 'none', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '10px', background: dark ? '#2A2E24' : '#E8E4DA', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={muted}>
              <path d="M17 8C8 10 5.9 16.17 3.82 19.54c-.06.09.15.1.22.02C6.27 17.26 9 13 17 8z"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 500, color: text, fontFamily: 'Georgia, serif' }}>{seed.name}</p>
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: muted, fontStyle: 'italic' }}>{seed.species}</p>
            <span style={{ fontSize: '11px', color: statusLabel(seed).color }}>{statusLabel(seed).label}</span>
          </div>
          <span style={{ color: muted, fontSize: '18px' }}>›</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '80px' }}>
      <div style={{ padding: '24px 16px 16px' }}>
        <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', fontWeight: 400, color: text, margin: '0 0 4px' }}>Froarkivet</h1>
        <p style={{ fontSize: '13px', color: muted, margin: '0 0 20px' }}>{seeds.length} fron i din samling</p>

        <div style={{ marginBottom: '12px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sok fron..."
            style={{ width: '100%', padding: '12px 16px', background: inputBg, border: '0.5px solid ' + borderColor, borderRadius: '12px', fontSize: '14px', color: text, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={() => onAdd && onAdd()}
          style={{ width: '100%', padding: '14px', background: btnBg, border: 'none', borderRadius: '12px', color: '#F2F0E8', fontSize: '15px', fontWeight: 500, cursor: 'pointer', marginBottom: '20px' }}>
          + Lagg till fro
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading && <p style={{ color: muted, fontStyle: 'italic', textAlign: 'center' }}>Hamtar fron...</p>}
        {!loading && filtered.length === 0 && <p style={{ color: muted, textAlign: 'center' }}>Inga fron hittades</p>}
        {filtered.map(seed => <SwipeCard key={seed.id} seed={seed} />)}
      </div>
    </div>
  )
}
