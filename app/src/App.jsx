import AddSeed from './pages/AddSeed'
import SeedDetail from './pages/SeedDetail'
import Profile from './pages/Profile'
import Login from './pages/Login'
import { useState, useEffect } from 'react'
import Home from './pages/Home'
import SeedArchive from './pages/SeedArchive'
import Calendar from './pages/Calendar'
import { supabase } from './lib/supabase'
import './styles/tokens.css'

const NAV_ITEMS = [
  { id: 'home', label: 'Hem', icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  { id: 'seeds', label: 'Mina fron', icon: 'M17 8C8 10 5.9 16.17 3.82 19.54c-.06.09.15.1.22.02C6.27 17.26 9 13 17 8z' },
  { id: 'calendar', label: 'Kalender', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z' },
  { id: 'profile', label: 'Profil', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
]

export default function App() {
  const [page, setPage] = useState('home')
  const [dark, setDark] = useState(true)
  const [selectedSeed, setSelectedSeed] = useState(null)
  const [addingSeed, setAddingSeed] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const navBg = dark ? '#12130F' : '#F2F0E8'
  const navBorder = dark ? '#2A2E24' : '#E0DDD4'
  const activeColor = '#7A9E6E'
  const inactiveColor = dark ? '#4A5244' : '#A0A89A'

  function goTo(target) {
    setPage(target)
    setSelectedSeed(null)
    setAddingSeed(false)
  }

  if (authLoading) {
    return (
      <div style={{ background: dark ? '#12130F' : '#F2F0E8', minHeight: '100vh', maxWidth: '390px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '24px', color: '#7A9E6E' }}>Groh!</p>
      </div>
    )
  }

  if (!user) {
    return <Login dark={dark} onLogin={() => setUser(true)} />
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setDark(!dark)} style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 200, width: '36px', height: '36px', borderRadius: '50%', background: dark ? '#2A2E24' : '#E8E4DA', border: 'none', cursor: 'pointer', fontSize: '15px' }}>
        {dark ? '☀' : '☽'}
      </button>

      {page === 'home' && <Home dark={dark} onAdd={() => { setPage('seeds'); setAddingSeed(true) }} />}
      {page === 'seeds' && !selectedSeed && !addingSeed && (
        <SeedArchive dark={dark} onSelect={setSelectedSeed} onAdd={() => setAddingSeed(true)} />
      )}
      {page === 'seeds' && addingSeed && (
        <AddSeed dark={dark} onBack={() => setAddingSeed(false)} onSaved={() => setAddingSeed(false)} />
      )}
      {page === 'seeds' && selectedSeed && !addingSeed && (
        <SeedDetail seed={selectedSeed} dark={dark} onBack={() => setSelectedSeed(null)} />
      )}
      {page === 'calendar' && <Calendar dark={dark} />}
      {page === 'profile' && <Profile dark={dark} onLogout={() => supabase.auth.signOut()} />}

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '390px', background: navBg, borderTop: '0.5px solid ' + navBorder, display: 'flex', justifyContent: 'space-around', padding: '10px 0 24px', zIndex: 100 }}>
        {NAV_ITEMS.map(item => {
          const active = page === item.id && !selectedSeed && !addingSeed
          return (
            <div key={item.id} onClick={() => goTo(item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', minWidth: '60px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? activeColor : inactiveColor}>
                <path d={item.icon} />
              </svg>
              <span style={{ fontSize: '10px', color: active ? activeColor : inactiveColor, fontFamily: 'Arial, sans-serif' }}>{item.label}</span>
            </div>
          )
        })}
      </nav>
    </div>
  )
}
