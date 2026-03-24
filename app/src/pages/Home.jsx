import { useState } from 'react'
import illustration from '../assets/luktart_growing.png'
```

Sedan när vi bygger bildbiblioteket på allvar följer vi samma mönster för alla arter:
```
blasrisp_growing.png
sommarflox_mature.png
lejonap_seedling.png
zinnia_growing.png

const todos = [
  { action: 'Vattna', plant: 'Lejonap Bronze', when: 'Så snart som möjligt' },
  { action: 'Toppa', plant: 'Luktärt', when: 'Så snart som möjligt' },
  { action: 'Planera', plant: 'Sådd av blårisp', when: '3 days ago' },
]

export default function Home() {
  const [dark, setDark] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1E2018' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const textMuted = dark ? '#7A9E6E' : '#7A9E6E'
  const actionBg = dark ? '#3B5E35' : '#4E6E44'
  const todoBg = dark ? '#1A1C17' : '#FFFFFF'
  const todoBorder = dark ? '#2A2E24' : '#E8E4DA'

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', fontFamily: 'var(--font-sans)', color: text, paddingBottom: '80px' }}>

      <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
        <button onClick={() => setDark(!dark)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: dark ? '#2A2E24' : '#E8E4DA', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
          {dark ? '☀️' : '🌙'}
        </button>
      </div>

      <div style={{ textAlign: 'center', paddingTop: '48px', paddingBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: textMuted, margin: '0 0 4px' }}>{greeting}</p>
        <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-serif)', fontWeight: 400, margin: '0 0 6px', color: text }}>Your Garden</h1>
        <p style={{ fontSize: '14px', color: textMuted, margin: 0 }}>3 plants growing beautifully</p>
      </div>

      <div style={{ margin: '0 16px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
        <img src={illustration} alt="Garden" style={{ width: '100%', display: 'block', borderRadius: '16px' }} />
        <div style={{ background: actionBg, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '12px', margin: '8px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🌱</div>
          <div>
            <p style={{ margin: 0, fontWeight: 500, color: '#F2F0E8', fontSize: '15px' }}>Lägg till planta</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(242,240,232,0.7)' }}>Lägg till ett frö, planta eller träd</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: '12px', color: text }}>Att göra</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {todos.map((todo, i) => (
            <div key={i} style={{ background: todoBg, border: `0.5px solid ${todoBorder}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7A9E6E', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: textMuted }}>{todo.action} <strong style={{ color: text }}>{todo.plant}</strong></p>
                <p style={{ margin: 0, fontSize: '12px', color: textMuted }}>{todo.when}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '390px', background: dark ? '#12130F' : '#F2F0E8', borderTop: `0.5px solid ${todoBorder}`, display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px' }}>
        {[['🏠', 'Home'], ['🌿', 'My Plants'], ['📖', 'Tips'], ['👤', 'Profile']].map(([icon, label]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <span style={{ fontSize: '10px', color: textMuted }}>{label}</span>
          </div>
        ))}
      </nav>

    </div>
  )
}