import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SeedArchive({ dark, onSelect, onAdd }) {
  const [seeds, setSeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const borderColor = dark ? '#2A2E24' : '#E8E4DA'
  const inputBg = dark ? '#1A1C17' : '#FFFFFF'
  const btnBg = dark ? '#4E6E44' : '#3B5E35'

  useEffect(() => {
    supabase.from('seeds').select('*').eq('is_archived', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSeeds(data); setLoading(false) })
  }, [])

  const filtered = seeds.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  function statusLabel(seed) {
    if (seed.thumb === 'down') return { label: 'Tank efter', color: '#E24B4A' }
    if (seed.frost_sensitive) return { label: 'Frostkanslig', color: '#EF9F27' }
    if (seed.requires_pretreatment) return { label: 'Forbehandling', color: '#7F77DD' }
    return { label: 'Klar att sa', color: '#7A9E6E' }
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '80px' }}>
      <div style={{ padding: '24px 16px 16px' }}>
        <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', fontWeight: 400, color: text, margin: '0 0 4px' }}>Froarkivet</h1>
        <p style={{ fontSize: '13px', color: muted, margin: '0 0 20px' }}>{seeds.length} fron i din samling</p>

        <div style={{ position: 'relative', marginBottom: '12px' }}>
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

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading && <p style={{ color: muted, fontStyle: 'italic', textAlign: 'center' }}>Hamtar fron...</p>}
        {filtered.map(seed => {
          const status = statusLabel(seed)
          return (
            <div key={seed.id} onClick={() => onSelect && onSelect(seed)} style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '14px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '10px', background: dark ? '#2A2E24' : '#E8E4DA', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill={muted}>
                  <path d="M17 8C8 10 5.9 16.17 3.82 19.54c-.06.09.15.1.22.02C6.27 17.26 9 13 17 8z"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 500, color: text, fontFamily: 'Georgia, serif' }}>{seed.name}</p>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: muted, fontStyle: 'italic' }}>{seed.species}</p>
                <span style={{ fontSize: '11px', color: status.color }}>{status.label}</span>
              </div>
              <span style={{ color: muted, fontSize: '18px' }}>›</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
