import { Icon } from '../components/Icon'
import IconSettings from '../assets/settings.svg?react'
import IconAlerts from '../assets/alerts.svg?react'
import IconHelp from '../assets/help.svg?react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { readZone, saveZone, ROMAN } from '../lib/zone'
import ZonePicker from '../components/ZonePicker'

export default function Profile({ onLogout }) {
  const [user, setUser] = useState(null)
  const [seedCount, setSeedCount] = useState(0)
  const [savingZone, setSavingZone] = useState(false)
  const [zoneError, setZoneError] = useState('')
  const { zone, chosen } = readZone(user)

  const bg = 'var(--bg)'
  const cardBg = 'var(--surface)'
  const text = 'var(--text)'
  const muted = 'var(--text-muted)'
  const border = 'var(--border-color)'
  const iconBg = 'var(--accent-icon-bg)'

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    supabase.from('seeds').select('id', { count: 'exact' }).eq('is_archived', false)
      .then(({ count }) => setSeedCount(count || 0))
  }, [])

  async function changeZone(z) {
    setSavingZone(true); setZoneError('')
    try { setUser(await saveZone(z)) } catch { setZoneError('Kunde inte spara zonen. Försök igen.') }
    setSavingZone(false)
  }

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
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '24px 16px 20px' }}>
        <h1 style={{ fontSize: 'var(--display-m)', fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'normal', letterSpacing: '0.01em', color: text, margin: '0 0 4px' }}>Profil</h1>
        <p style={{ fontSize: '13px', color: muted, margin: 0 }}>Hantera ditt konto</p>
      </div>
      <div className="card card--roomy" style={{ margin: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--on-accent)">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 'var(--heading-s)', color: text, fontFamily: 'var(--font-heading)', fontVariationSettings: 'var(--fraunces-soft)', fontWeight: 500, fontStyle: 'normal' }}>{user?.email?.split('@')[0] || 'Trädgårdsälskare'}</p>
            <p style={{ margin: 0, fontSize: '13px', color: muted }}>{user?.email || ''}</p>
          </div>
        </div>
        <div style={{ borderTop: '0.5px solid ' + border, paddingTop: '16px', display: 'flex', justifyContent: 'space-around' }}>
          {[[seedCount, 'Frön'], ['2026', 'Säsong'], ['Zon ' + ROMAN[zone], chosen ? 'Odlingszon' : 'Antagen zon']].map(([val, lbl]) => (
            <div key={lbl} style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', fontSize: 'var(--display-s)', color: muted, fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'normal', letterSpacing: '0.01em' }}>{val}</p>
              <p style={{ margin: 0, fontSize: '11px', color: muted }}>{lbl}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="card card--roomy" style={{ margin: '0 16px 12px' }}>
        <ZonePicker zone={zone} chosen={chosen} onChange={changeZone} saving={savingZone}
          colors={{ text, muted, border, cardBg, activeBg: iconBg }} />
        {zoneError && <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--danger-text)' }}>{zoneError}</p>}
      </div>
      <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {menuItems.map((item, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={item.icon} size={18} color={muted} />
            </div>
            <span style={{ flex: 1, fontSize: '15px', color: text }}>{item.label}</span>
            <span style={{ color: muted, fontSize: '18px' }}>›</span>
          </div>
        ))}
        <button type="button" onClick={handleLogout} className="card t-body" style={{ textAlign: 'center', marginTop: '4px', color: 'var(--danger-text)' }}>
          Logga ut
        </button>
        <p className="t-caption" style={{ textAlign: 'center', color: 'var(--text-subtle)', marginTop: '8px' }}>Groh! · Version 1.0.0</p>
      </div>
    </div>
  )
}
