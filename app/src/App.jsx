import { useState } from 'react'
import Home from './pages/Home'
import SeedArchive from './pages/SeedArchive'
import Calendar from './pages/Calendar'
import './styles/tokens.css'

export default function App() {
  const [page, setPage] = useState('home')

  return (
    <div>
      {page === 'home' && <Home onNavigate={setPage} />}
      {page === 'seeds' && <SeedArchive />}
      {page === 'calendar' && <Calendar />}

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '390px', background: 'var(--paper)', borderTop: 'var(--border)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[['home','🏠','Hem'],['seeds','🌱','Mina frön'],['calendar','📅','Kalender'],['profile','👤','Profil']].map(([p, icon, label]) => (
          <div key={p} onClick={() => setPage(p)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: page === p ? 1 : 0.5 }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <span style={{ fontSize: '10px', color: 'var(--salvia-600)' }}>{label}</span>
          </div>
        ))}
      </nav>
    </div>
  )
}