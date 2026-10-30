import { Icon } from './components/Icon'
import AddSeed from './pages/AddSeed'
import SeedDetail from './pages/SeedDetail'
import Profile from './pages/Profile'
import Login from './pages/Login'
import { useState, useEffect } from 'react'
import Home from './pages/Home'
import SeedArchive from './pages/SeedArchive'
import Calendar from './pages/Calendar'
import Review from './pages/Review'
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

  // Läget styr färgtokens via data-theme på <html>. Statusfältets färg
  // (theme-color) måste vara en riktig färg, så den läses ut från --bg.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    root.style.colorScheme = dark ? 'dark' : 'light'
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
  }, [dark])

  function goTo(target) {
    setPage(target)
    setSelectedSeed(null)
    setAddingSeed(false)
    setEditingSeed(null)
  }

  if (authLoading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', maxWidth: '390px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'normal', letterSpacing: '0.01em', fontSize: 'var(--display-m)', color: 'var(--text-muted)' }}>Groh!</p>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={() => setUser(true)} />
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setDark(!dark)} aria-label={dark ? 'Byt till ljust läge' : 'Byt till mörkt läge'} style={{ position: 'fixed', top: 'calc(16px + env(safe-area-inset-top))', right: 'max(16px, calc((100vw - 390px) / 2 + 16px))', zIndex: 200, width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-raised)', border: 'none', cursor: 'pointer', fontSize: '15px' }}>
        <Icon name={dark ? 'sun' : 'moon'} size={18} color="var(--text)" />
      </button>

      {page === 'home' && <Home onAdd={() => { setPage('seeds'); setAddingSeed(true) }} onOpenCalendar={() => goTo('calendar')} onOpenReview={() => goTo('review')} />}
      {page === 'review' && <Review onDone={() => goTo('home')} />}
      {page === 'seeds' && !selectedSeed && !addingSeed && (
        <SeedArchive onSelect={setSelectedSeed} onAdd={() => setAddingSeed(true)} />
      )}
      {page === 'seeds' && addingSeed && (
        <AddSeed onBack={() => { setAddingSeed(false); setEditingSeed(null) }} onSaved={() => { setAddingSeed(false); setEditingSeed(null) }} editSeed={editingSeed} />
      )}
      {page === 'seeds' && selectedSeed && !addingSeed && (
        <SeedDetail seed={selectedSeed} onBack={() => setSelectedSeed(null)} onEdit={seed => { setEditingSeed(seed); setAddingSeed(true) }} />
      )}
      {page === 'calendar' && <Calendar />}
      {page === 'profile' && <Profile onLogout={() => supabase.auth.signOut()} />}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderTop: 'var(--border)', display: 'flex', justifyContent: 'space-around', padding: '10px max(0px, calc((100% - 390px) / 2)) calc(14px + env(safe-area-inset-bottom))', zIndex: 100 }}>
        {NAV_ITEMS.map(item => {
          const active = page === item.id && !selectedSeed && !addingSeed
          return (
            <div key={item.id} onClick={() => goTo(item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', minWidth: '60px' }}>
              <Icon name={item.icon} size={22} color={active ? 'var(--text-accent)' : 'var(--text-subtle)'} />
              <span style={{ fontSize: '10px', color: active ? 'var(--text-accent)' : 'var(--text-subtle)', fontFamily: 'var(--font-body)' }}>{item.label}</span>
            </div>
          )
        })}
      </nav>
    </div>
  )
}
