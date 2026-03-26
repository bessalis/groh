import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import illustration from '../assets/luktart_growing.png'

const shortcuts = [
  { icon: '+', label: 'Lagg till', action: 'add' },
  { icon: '?', label: 'Planera', action: null },
  { icon: '...', label: 'Ovrigt', action: null },
]

export default function Home({ dark, onAdd }) {
  const [seedCount, setSeedCount] = useState(0)
  const [recentSeeds, setRecentSeeds] = useState([])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'God morgon' : hour < 18 ? 'God eftermiddag' : 'God kvall'
  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const borderColor = dark ? '#2A2E24' : '#E8E4DA'
  const gradientStop = dark ? '#12130F' : '#F2F0E8'

  useEffect(() => {
    supabase.from('seeds').select('id, name, sown_date', { count: 'exact' })
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data, count }) => {
        setSeedCount(count || 0)
        setRecentSeeds(data || [])
      })
  }, [])

  function plantText(count) {
    if (count === 0) return 'Inga fron annu - lagg till ditt forsta!'
    if (count === 1) return '1 fro i din samling'
    return count + ' fron vaxter fint'
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '80px', position: 'relative' }}>

      <div style={{ textAlign: 'center', padding: '48px 16px 16px' }}>
        <p style={{ fontSize: '13px', color: muted, margin: '0 0 4px' }}>{greeting}</p>
        <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', fontWeight: 400, margin: '0 0 6px', color: text }}>Din tradgard</h1>
        <p style={{ fontSize: '14px', color: muted, margin: 0 }}>{plantText(seedCount)}</p>
      </div>

      <div style={{ margin: '0 16px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
        <img src={illustration} alt="Garden" style={{ width: '100%', display: 'block' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to bottom, transparent 0%, ' + gradientStop + ' 100%)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 2 }}>
          {shortcuts.map((s, i) => (
            <div key={i} onClick={() => s.action === 'add' && onAdd && onAdd()} style={{ flex: 1, background: dark ? 'rgba(124, 144, 112, 0.92)' : 'rgba(90, 111, 86, 0.92)', borderRadius: '12px', padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#F2F0E8' }}>
                {s.icon}
              </div>
              <span style={{ fontSize: '12px', color: '#F2F0E8', fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {recentSeeds.length > 0 && (
        <div style={{ padding: '24px 16px 0' }}>
          <h2 style={{ fontSize: '18px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, marginBottom: '12px', color: text }}>Senast tillagda</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentSeeds.map((seed, i) => (
              <div key={i} style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: seed.sown_date ? '#7A9E6E' : borderColor, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: text, fontFamily: 'Georgia, serif' }}>{seed.name}</p>
                  {seed.sown_date && (
                    <p style={{ margin: 0, fontSize: '11px', color: muted }}>
                      Satt {new Date(seed.sown_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
