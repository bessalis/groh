import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { callAi } from '../lib/api'
import { readZone, saveZone, ROMAN } from '../lib/zone'
import ZonePicker from '../components/ZonePicker'
import { SectionLabel, AiNote } from '../components/ui'
import { combinedStatus } from '../lib/aiStatus'


const MONTHS_SV = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']

// Årstidernas färger ligger i tokens.css under [data-season].

function getSeason(month) {
  if (month === 11 || month <= 1) return 'winter'
  if (month <= 4) return 'spring'
  if (month <= 7) return 'summer'
  return 'autumn'
}

function SeasonalPattern({ month, accent }) {
  const season = getSeason(month)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.04, pointerEvents: 'none' }}>
      {season === 'spring' && (
        <svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
          <g stroke={accent} fill="none" strokeWidth="0.5">
            <path d="M100,700 Q100,650 120,620 Q140,590 160,580" opacity="0.5" />
            <path d="M250,720 Q250,670 230,640 Q210,610 190,600" opacity="0.5" />
            <path d="M300,500 Q320,480 340,480 Q340,500 320,510 Q300,520 290,510" opacity="0.4" />
            <circle cx="150" cy="300" r="8" opacity="0.3" />
            <ellipse cx="150" cy="295" rx="4" ry="8" opacity="0.4" />
            <path d="M80,400 L80,350 M80,375 L70,365 M80,375 L90,365" opacity="0.5" />
            <path d="M320,450 L320,400 M320,425 L310,415 M320,425 L330,415" opacity="0.5" />
          </g>
        </svg>
      )}
      {season === 'summer' && (
        <svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
          <g stroke={accent} fill="none" strokeWidth="0.5">
            <path d="M50,200 Q70,180 90,200 Q110,220 130,200 Q150,180 170,200" opacity="0.5" />
            <circle cx="200" cy="300" r="30" opacity="0.3" />
            {[0,60,120,180,240,300].map((a, i) => {
              const r = (a * Math.PI) / 180
              return <line key={i} x1={200 + Math.cos(r)*15} y1={300 + Math.sin(r)*15} x2={200 + Math.cos(r)*30} y2={300 + Math.sin(r)*30} opacity="0.4" />
            })}
            <path d="M350,400 Q340,420 350,440 Q360,460 350,480 Q340,500 350,520" opacity="0.5" />
            <circle cx="100" cy="600" r="20" opacity="0.3" />
            <circle cx="100" cy="600" r="15" opacity="0.3" />
          </g>
        </svg>
      )}
      {season === 'autumn' && (
        <svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
          <g stroke={accent} fill="none" strokeWidth="0.5">
            <ellipse cx="120" cy="250" rx="20" ry="30" transform="rotate(25 120 250)" opacity="0.4" />
            <line x1="120" y1="220" x2="120" y2="280" transform="rotate(25 120 250)" opacity="0.4" />
            <ellipse cx="280" cy="350" rx="18" ry="28" transform="rotate(-15 280 350)" opacity="0.4" />
            <path d="M200,500 Q180,520 180,540 M200,500 Q220,520 220,540" opacity="0.5" />
            <circle cx="100" cy="600" r="25" opacity="0.3" />
            <circle cx="100" cy="600" r="15" opacity="0.3" />
          </g>
        </svg>
      )}
      {season === 'winter' && (
        <svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
          <g stroke={accent} fill="none" strokeWidth="0.5">
            <path d="M50,100 Q75,150 50,200 Q25,250 50,300" opacity="0.6" />
            <path d="M350,150 Q325,200 350,250 Q375,300 350,350" opacity="0.5" />
            <circle cx="200" cy="400" r="40" opacity="0.3" />
            <circle cx="200" cy="400" r="25" opacity="0.3" />
            <ellipse cx="100" cy="600" rx="15" ry="25" opacity="0.4" />
            <ellipse cx="300" cy="650" rx="12" ry="20" opacity="0.4" />
          </g>
        </svg>
      )}
    </div>
  )
}

function Skeleton({ h = 14, w = '100%' }) {
  return <div style={{ height: h, width: w, borderRadius: 6, background: 'var(--border-color)', opacity: 0.6, animation: 'pulse 1.4s ease-in-out infinite' }} />
}

export default function Calendar() {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [result, setResult] = useState({ key: null, data: null })
  const [slideDir, setSlideDir] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [user, setUser] = useState(null)
  const [savingZone, setSavingZone] = useState(false)
  const { zone, chosen: zoneChosen } = readZone(user)

  const season = getSeason(currentMonth)
  const bg = 'var(--bg)', cardBg = 'var(--surface)', border = 'var(--border-color)'
  const accent = 'var(--season-accent)', secondary = 'var(--season-secondary)'

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  async function chooseZone(z) {
    setSavingZone(true)
    try { setUser(await saveZone(z)) } catch { /* behåll antagen zon */ }
    setSavingZone(false)
  }

  // Säsongstext och allmänna tips för månaden. Sparas per zon och månad på
  // servern och delas mellan alla; den lokala kopian används bara om servern
  // inte svarar, t.ex. offline. Fröerna skickas inte med: de följs i Årets sådd.
  const contentKey = `${zone}-${currentYear}-${currentMonth}`
  useEffect(() => {
    let live = true
    const cacheKey = `groh_calendar_z${zone}_${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    callAi('/api/calendar-ai', { month: currentMonth, year: currentYear, seeds: [] })
      .then(data => {
        try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch { /* fullt eller blockerat */ }
        return data
      })
      .catch(() => {
        try { return JSON.parse(localStorage.getItem(cacheKey)) } catch { return null }
      })
      .then(data => { if (live) setResult({ key: contentKey, data }) })
    return () => { live = false }
  }, [contentKey])   // eslint-disable-line react-hooks/exhaustive-deps
  const loading = result.key !== contentKey
  const aiContent = loading ? null : result.data

  function navigate(delta) {
    setSlideDir(delta)
    setAnimKey(k => k + 1)
    if (delta === 1) {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
      else setCurrentMonth(m => m + 1)
    } else {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
      else setCurrentMonth(m => m - 1)
    }
  }

  return (
    <div data-season={season} style={{ background: bg, color: 'var(--text)', minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', position: 'relative', overflow: 'hidden', transition: 'background 0.5s' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:0.2} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideInLeft  { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      <SeasonalPattern month={currentMonth} accent={accent} />

      {/* Header – månadsnavigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px 20px 20px', position: 'relative', zIndex: 1 }}>
        <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 24, lineHeight: 1 }}>‹</button>
        <div style={{ flex: 1, overflow: 'hidden', textAlign: 'center' }}>
          <h1
            key={animKey}
            style={{
              fontSize: 'var(--display-xl)', fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'normal', letterSpacing: '0.01em',
              color: secondary, margin: 0, lineHeight: 1.1,
              animation: slideDir >= 0 ? 'slideInRight 0.35s ease forwards' : 'slideInLeft 0.35s ease forwards'
            }}
          >
            {MONTHS_SV[currentMonth]}
          </h1>
          <p style={{ fontSize: '12px', color: accent, margin: '4px 0 0' }}>{currentYear} · Zon {ROMAN[zone]}{zoneChosen ? '' : ' (antagen)'}</p>
        </div>
        <button onClick={() => navigate(1)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 24, lineHeight: 1 }}>›</button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 1 }}>

        {/* Zonval – visas tills användaren har valt sin zon */}
        {user && !zoneChosen && (
          <div className="card card--roomy">
            <ZonePicker zone={zone} chosen={false} onChange={chooseZone} saving={savingZone}
              colors={{ text: 'var(--text)', muted: accent, border, cardBg, activeBg: 'var(--accent-soft)' }} />
          </div>
        )}

        {/* Säsongen */}
        <div key={`season-${animKey}`} className="card card--roomy" style={{ animation: 'fadeUp 0.4s ease 0.05s both', transition: 'background 0.5s, border-color 0.5s' }}>
          <SectionLabel style={{ margin: '0 0 12px', color: accent }}>Säsongen</SectionLabel>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton w="95%" /><Skeleton w="80%" /><Skeleton w="88%" />
            </div>
          ) : aiContent?.seasonText ? (
            <p style={{ fontSize: 'var(--prose)', fontFamily: 'var(--font-heading)', fontVariationSettings: 'var(--fraunces-soft)', fontWeight: 400, color: 'var(--text)', margin: 0, lineHeight: 1.55 }}>
              {aiContent.seasonText}
            </p>
          ) : (
            <p style={{ fontSize: '14px', color: accent, fontStyle: 'italic', margin: 0 }}>Hämtar säsongstext...</p>
          )}
        </div>

        {/* Det här är [månad] */}
        <div key={`tips-${animKey}`} className="card card--roomy" style={{ animation: 'fadeUp 0.4s ease 0.25s both', transition: 'background 0.5s, border-color 0.5s' }}>
          <SectionLabel style={{ margin: '0 0 14px', color: accent }}>Det här är {MONTHS_SV[currentMonth].toLowerCase()}</SectionLabel>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton w="92%" /><Skeleton w="78%" />
            </div>
          ) : aiContent?.generalTips?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {aiContent.generalTips.map((tip, i) => (
                <p key={i} style={{ fontSize: '14px', color: 'var(--text)', margin: 0, lineHeight: 1.6 }}>{tip}</p>
              ))}
              <AiNote style={{ marginTop: '4px' }}>
                {combinedStatus([aiContent.seasonStatus]) === 'reviewed'
                  ? 'Texterna på den här sidan är skrivna av AI och granskade.'
                  : 'Texterna på den här sidan är skrivna av AI och ännu inte granskade.'}
              </AiNote>
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: accent, fontStyle: 'italic', margin: 0 }}>Hämtar inspirationstips...</p>
          )}
        </div>

      </div>
    </div>
  )
}
