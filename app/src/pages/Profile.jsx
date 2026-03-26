import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Profile({ dark, onLogout }) {
  const [user, setUser] = useState(null)
  const [seedCount, setSeedCount] = useState(0)

  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const border = dark ? '#2A2E24' : '#E8E4DA'
  const iconBg = dark ? '#2A3828' : '#E8EDE6'

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    supabase.from('seeds').select('id', { count: 'exact' }).eq('is_archived', false)
      .then(({ count }) => setSeedCount(count || 0))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    onLogout && onLogout()
  }

  const menuItems = [
    { icon: 'M12 15.5A3.5 3.5 0 018.5 12 3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.92c.04-.34.07-.69.07-1.08 0-.39-.03-.74-.07-1.08l2.32-1.82c.21-.16.27-.45.13-.69l-2.2-3.82c-.14-.24-.43-.31-.67-.24l-2.73 1.1c-.57-.44-1.18-.8-1.86-1.08L15.93 3H8.07L7.69 5.35c-.68.28-1.29.64-1.86 1.08L3.1 5.33c-.24-.07-.53 0-.67.24L.23 9.39c-.14.24-.08.53.13.69l2.32 1.82c-.04.34-.07.69-.07 1.08 0 .39.03.74.07 1.08L.36 15.88c-.21.16-.27.45-.13.69l2.2 3.82c.14.24.43.31.67.24l2.73-1.1c.57.44 1.18.8 1.86 1.08L7.93 23h7.86l.38-2.35c.68-.28 1.29-.64 1.86-1.08l2.73 1.1c.24.07.53 0 .67-.24l2.2-3.82c.14-.24.08-.53-.13-.69l-2.27-1.84z', label: 'Installningar' },
    { icon: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z', label: 'Notiser' },
    { icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z', label: 'Hjalp' },
  ]

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '80px' }}>
      <div style={{ padding: '24px 16px 20px' }}>
        <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', fontWeight: 400, color: text, margin: '0 0 4px' }}>Profil</h1>
        <p style={{ fontSize: '13px', color: muted, margin: 0 }}>Hantera ditt konto</p>
      </div>

      <div style={{ margin: '0 16px 12px', background: cardBg, border: '0.5px solid ' + border, borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#4E6E44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#F2F0E8">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '17px', fontWeight: 500, color: text, fontFamily: 'Georgia, serif' }}>
              {user?.email?.split('@')[0] || 'Tradgardsalskare'}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: muted }}>{user?.email || ''}</p>
          </div>
        </div>
        <div style={{ borderTop: '0.5px solid ' + border, paddingTop: '16px', display: 'flex', justifyContent: 'space-around' }}>
          {[
            [seedCount, 'Fron'],
            ['2026', 'Sasong'],
            ['Zon 4', 'Uppsala'],
          ].map(([val, lbl]) => (
            <div key={lbl} style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: 500, color: muted, fontFamily: 'Georgia, serif' }}>{val}</p>
              <p style={{ margin: 0, fontSize: '11px', color: muted }}>{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {menuItems.map((item, i) => (
          <div key={i} style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={muted}><path d={item.icon}/></svg>
            </div>
            <span style={{ flex: 1, fontSize: '15px', color: text }}>{item.label}</span>
            <span style={{ color: muted, fontSize: '18px' }}>›</span>
          </div>
        ))}

        <div onClick={handleLogout} style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: '4px' }}>
          <span style={{ fontSize: '15px', color: '#E24B4A' }}>Logga ut</span>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: border, marginTop: '8px' }}>Groh! · Version 1.0.0</p>
      </div>
    </div>
  )
}
