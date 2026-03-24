import { useState } from 'react'
import illustration from '../assets/luktart_growing.png'

const todos = [
  { action: 'Vattna', plant: 'Lejonap Bronze', when: 'Sa snart som mojligt' },
  { action: 'Toppa', plant: 'Luktart', when: 'Sa snart som mojligt' },
  { action: 'Planera', plant: 'Sadd av blarisp', when: '3 days ago' },
]

export default function Home() {
  const [dark, setDark] = useState(true)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'God morgon' : hour < 18 ? 'God eftermiddag' : 'God kvall'
  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const border = dark ? '#2A2E24' : '#E8E4DA'

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '80px' }}>
      <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
        <button onClick={() => setDark(!dark)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: dark ? '#2A2E24' : '#E8E4DA', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
          {dark ? '☀' : '☽'}
        </button>
      </div>
      <div style={{ textAlign: 'center', paddingTop: '48px', paddingBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: muted, margin: '0 0 4px' }}>{greeting}</p>
        <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', fontWeight: 400, margin: '0 0 6px', color: text }}>Din tradgard</h1>
        <p style={{ fontSize: '14px', color: muted, margin: 0 }}>3 plantor vaxter fint</p>
      </div>
      <div style={{ margin: '0 16px', borderRadius: '16px', overflow: 'hidden' }}>
        <img src={illustration} alt="Garden" style={{ width: '100%', display: 'block', borderRadius: '16px 16px 0 0' }} />
        <div style={{ background: '#4E6E44', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '0 0 12px 12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>+</div>
          <div>
            <p style={{ margin: 0, fontWeight: 500, color: '#F2F0E8', fontSize: '15px' }}>Lagg till planta</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(242,240,232,0.7)' }}>Lagg till ett fro, planta eller trad</p>
          </div>
        </div>
      </div>
      <div style={{ padding: '24px 16px 0' }}>
        <h2 style={{ fontSize: '18px', fontFamily: 'Georgia, serif', fontWeight: 400, marginBottom: '12px', color: text }}>Att gora</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {todos.map((todo, i) => (
            <div key={i} style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7A9E6E', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: muted }}>{todo.action} <strong style={{ color: text }}>{todo.plant}</strong></p>
                <p style={{ margin: 0, fontSize: '12px', color: muted }}>{todo.when}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
