import { useState } from 'react'
import plantImg from '../assets/brysselkal_seedling.png'
import grohLogo from '../assets/groh.svg'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const bg = 'var(--bg)'
  const cardBg = 'var(--surface)'
  const text = 'var(--text)'
  const muted = 'var(--text-muted)'
  const border = 'var(--border-color)'
  const inputStyle = { width: '100%', background: cardBg, border: '0.5px solid ' + border, borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: text, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }

  async function handleSubmit() {
    if (!email || !password) { setError('Fyll i e-post och lösenord'); return }
    setLoading(true); setError(''); setSuccess('')
    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError('Fel e-post eller lösenord'); setLoading(false); return }
      onLogin && onLogin()
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError('Kunde inte skapa konto'); setLoading(false); return }
      setSuccess('Kolla din e-post för att bekräfta!')
    }
    setLoading(false)
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ width: '220px', height: '220px', margin: '0 auto 24px', overflow: 'hidden' }}>
        <img src={plantImg} alt="" style={{ width: '100%', objectFit: 'contain' }} className="img-adapt" />
      </div>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ margin: '0 0 8px', lineHeight: 0 }}>
          <img src={grohLogo} alt="Groh!" style={{ width: '170px', display: 'inline-block' }} className="logo-adapt" />
        </h1>
        <p className="t-body" style={{ color: muted, margin: 0 }}>Din digitala trädgård</p>
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
          <p style={{ fontSize: '12px', color: muted, margin: '0 0 5px' }}>Lösenord</p>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="min 6 tecken" style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        {error && <p style={{ fontSize: '13px', color: 'var(--danger-text)', textAlign: 'center', margin: '0 0 12px' }}>{error}</p>}
        {success && <p style={{ fontSize: '13px', color: muted, textAlign: 'center', margin: '0 0 12px' }}>{success}</p>}
        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '13px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: 'var(--on-accent)', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
          {loading ? '...' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
        </button>
      </div>
    </div>
  )
}
