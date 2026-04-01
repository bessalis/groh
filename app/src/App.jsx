import { Icon } from './components/Icon'
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
  { id: 'home',     label: 'Hem',     icon: 'home'      },
  { id: 'seeds',    label: 'Mina frön', icon: 'myplants' },
  { id: 'calendar', label: 'Kalender', icon: 'calendar'  },
  { id: 'profile',  label: 'Profil',   icon: 'myprofile' },
]

export default function App() {
  const [page, setPage] = useState('home')
  const [dark, setDark] = useState(true)
  const [selectedSeed, setSelectedSeed] = useState(null)
  const [addingSeed, setAddingSeed] = useState(false)
  const [editingSeed, setEditingSeed] = useState(null)
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
    setEditingSeed(null)
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
        <Icon name={dark ? 'sun' : 'moon'} size={18} color={dark ? '#F2F0E8' : '#1E2018'} />
      </button>

      {page === 'home' && <Home dark={dark} onAdd={() => { setPage('seeds'); setAddingSeed(true) }} />}
      {page === 'seeds' && !selectedSeed && !addingSeed && (
        <SeedArchive dark={dark} onSelect={setSelectedSeed} onAdd={() => setAddingSeed(true)} />
      )}
      {page === 'seeds' && addingSeed && (
        <AddSeed dark={dark} onBack={() => { setAddingSeed(false); setEditingSeed(null) }} onSaved={() => { setAddingSeed(false); setEditingSeed(null) }} editSeed={editingSeed} />
      )}
      {page === 'seeds' && selectedSeed && !addingSeed && (
        <SeedDetail seed={selectedSeed} dark={dark} onBack={() => setSelectedSeed(null)} onEdit={seed => { setEditingSeed(seed); setAddingSeed(true) }} />
      )}
      {page === 'calendar' && <Calendar dark={dark} />}
      {page === 'profile' && <Profile dark={dark} onLogout={() => supabase.auth.signOut()} />}

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '390px', background: navBg, borderTop: '0.5px solid ' + navBorder, display: 'flex', justifyContent: 'space-around', padding: '10px 0 24px', zIndex: 100 }}>
        {NAV_ITEMS.map(item => {
          const active = page === item.id && !selectedSeed && !addingSeed
          return (
            <div key={item.id} onClick={() => goTo(item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', minWidth: '60px' }}>
              <Icon name={item.icon} size={22} color={active ? activeColor : inactiveColor} />
              <span style={{ fontSize: '10px', color: active ? activeColor : inactiveColor, fontFamily: 'Arial, sans-serif' }}>{item.label}</span>
            </div>
          )
        })}
      </nav>
    </div>
  )
}
