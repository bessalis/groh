import { Icon } from '../components/Icon'
import IconSettings from '../assets/settings.svg?react'
import IconAlerts from '../assets/alerts.svg?react'
import IconHelp from '../assets/help.svg?react'
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
    { icon: 'settings', label: 'Inställningar' },
    { icon: 'alerts', label: 'Notiser' },
    { icon: 'help', label: 'Hjälp' },
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
            <p style={{ margin: '0 0 2px', fontSize: '17px', fontWeight: 500, color: text, fontFamily: 'Georgia, serif' }}>{user?.email?.split('@')[0] || 'Trädgårdsälskare'}</p>
            <p style={{ margin: 0, fontSize: '13px', color: muted }}>{user?.email || ''}</p>
          </div>
        </div>
        <div style={{ borderTop: '0.5px solid ' + border, paddingTop: '16px', display: 'flex', justifyContent: 'space-around' }}>
          {[[seedCount, 'Frön'], ['2026', 'Säsong'], ['Zon 4', 'Uppsala']].map(([val, lbl]) => (
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
              <Icon name={item.icon} size={18} color={muted} />
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
