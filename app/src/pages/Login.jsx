import { useState } from 'react'
import plantImg from '../assets/brysselkal_seedling.png'
import { supabase } from '../lib/supabase'

export default function Login({ dark, onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const border = dark ? '#2A2E24' : '#E8E4DA'
  const inputStyle = { width: '100%', background: cardBg, border: '0.5px solid ' + border, borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: text, fontFamily: 'Arial, sans-serif', outline: 'none', boxSizing: 'border-box' }

  async function handleSubmit() {
    if (!email || !password) { setError('Fyll i e-post och losenord'); return }
    setLoading(true); setError(''); setSuccess('')
    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError('Fel e-post eller losenord'); setLoading(false); return }
      onLogin && onLogin()
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError('Kunde inte skapa konto'); setLoading(false); return }
      setSuccess('Kolla din e-post for att bekrafta!')
    }
    setLoading(false)
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ width: '220px', height: '220px', margin: '0 auto 24px', overflow: 'hidden' }}>
        <img src={plantImg} alt='Groh' style={{ width: '100%', objectFit: 'contain', filter: dark ? 'none' : 'brightness(0.9)' }} />
      </div>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '42px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: text, margin: '0 0 8px' }}>Groh!</h1>
        <p style={{ fontSize: '14px', color: muted, margin: 0 }}>Din digitala tradgard</p>
      </div>
      <div style={{ width: '100%', background: cardBg, border: '0.5px solid ' + border, borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', marginBottom: '24px', background: bg, borderRadius: '10px', padding: '4px' }}>
          <div onClick={() => { setMode('login'); setError('') }} style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '8px', background: mode === 'login' ? cardBg : 'transparent', cursor: 'pointer', fontSize: '13px', color: text }}>Logga in</div>
          <div onClick={() => { setMode('signup'); setError('') }} style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '8px', background: mode === 'signup' ? cardBg : 'transparent', cursor: 'pointer', fontSize: '13px', color: text }}>Skapa konto</div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: muted, margin: '0 0 5px' }}>E-post</p>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="din@epost.se" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: muted, margin: '0 0 5px' }}>Losenord</p>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="min 6 tecken" style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        {error && <p style={{ fontSize: '13px', color: '#E28080', textAlign: 'center', margin: '0 0 12px' }}>{error}</p>}
        {success && <p style={{ fontSize: '13px', color: muted, textAlign: 'center', margin: '0 0 12px' }}>{success}</p>}
        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '13px', background: '#4E6E44', border: 'none', borderRadius: '10px', color: '#F2F0E8', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
          {loading ? '...' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
        </button>
      </div>
    </div>
  )
}
