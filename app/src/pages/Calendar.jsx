import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/Icon'

const PHASE_ICON = { seed: 'seed', seedling: 'seedling', growing: 'grown', mature: 'mature' }

const MONTHS_SV = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']

const SEASONAL_THEMES = {
  winter: {
    dark:  { bg: '#0F1110', cardBg: '#15181A', border: '#2A3438', accent: '#8BA0A8', secondary: '#5B6B73' },
    light: { bg: '#EEF1F2', cardBg: '#FFFFFF',  border: '#C8D4D8', accent: '#5B7E8A', secondary: '#7A9EAA' },
  },
  spring: {
    dark:  { bg: '#0F120E', cardBg: '#1A1C17', border: '#2F3B2A', accent: '#7A9E6E', secondary: '#9FB892' },
    light: { bg: '#F0F4EE', cardBg: '#FFFFFF',  border: '#C4D4BE', accent: '#4E7244', secondary: '#6A9860' },
  },
  summer: {
    dark:  { bg: '#12130F', cardBg: '#1C1D17', border: '#3A3D2A', accent: '#8BA856', secondary: '#A8B87A' },
    light: { bg: '#F2F3EC', cardBg: '#FFFFFF',  border: '#CCCEA8', accent: '#5E7030', secondary: '#7A9040' },
  },
  autumn: {
    dark:  { bg: '#12100E', cardBg: '#1C1A16', border: '#3A342A', accent: '#A8845B', secondary: '#B89A73' },
    light: { bg: '#F3F0EC', cardBg: '#FFFFFF',  border: '#D4C8B8', accent: '#7A5A30', secondary: '#9A7448' },
  },
}

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

export default function Calendar({ dark }) {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [seeds, setSeeds] = useState([])
  const [seedsLoaded, setSeedsLoaded] = useState(false)
  const [aiContent, setAiContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedSeed, setSelectedSeed] = useState(null)
  const [slideDir, setSlideDir] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const chipsRef = useRef(null)

  const season = getSeason(currentMonth)
  const theme = SEASONAL_THEMES[season][dark ? 'dark' : 'light']
  const { bg, cardBg, border, accent, secondary } = theme

  useEffect(() => {
    console.log('[Calendar] Laddar frön från Supabase...')
    supabase.from('seeds')
      .select('id, name, species, sown_date, current_phase, frost_sensitive')
      .eq('is_archived', false)
      .then(({ data }) => {
        console.log('[Calendar] Frön laddade:', data?.length ?? 0, 'st')
        setSeeds(data || [])
        setSeedsLoaded(true)
      })
  }, [])

  useEffect(() => {
    console.log('[Calendar] AI-useEffect triggrad – seedsLoaded:', seedsLoaded, '| månad:', currentMonth, currentYear)
    if (!seedsLoaded) {
      console.log('[Calendar] Väntar på att frön ska laddas...')
      return
    }
    fetchAiContent()
  }, [currentMonth, currentYear, seedsLoaded])

  async function fetchAiContent() {
    const cacheKey = `groh_calendar_${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try { setAiContent(JSON.parse(cached)); return } catch {}
    }
    setLoading(true)
    console.log('[Calendar] Skickar fetch till /api/calendar-ai – månad:', currentMonth, currentYear, '| frön:', seeds.length)
    try {
      const res = await fetch('/api/calendar-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          year: currentYear,
          seeds: [...seeds]
            .sort((a, b) => (b.sown_date || '').localeCompare(a.sown_date || ''))
            .slice(0, 6)
            .map(s => ({
              name: s.name, species: s.species,
              sown_date: s.sown_date, current_phase: s.current_phase,
              frost_sensitive: s.frost_sensitive,
            }))
        })
      })
      const data = await res.json()
      const parsed = JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim())
      setAiContent(parsed)
      localStorage.setItem(cacheKey, JSON.stringify(parsed))
    } catch {
      setAiContent(null)
    }
    setLoading(false)
  }

  function navigate(delta) {
    setSlideDir(delta)
    setAnimKey(k => k + 1)
    setSelectedSeed(null)
    setAiContent(null)
    if (delta === 1) {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
      else setCurrentMonth(m => m + 1)
    } else {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
      else setCurrentMonth(m => m - 1)
    }
    if (chipsRef.current) chipsRef.current.scrollLeft = 0
  }

  const selectedTip = aiContent?.seedTips?.find(t => t.seedName === selectedSeed)?.tip

  function Skeleton({ h = 14, w = '100%' }) {
    return <div style={{ height: h, width: w, borderRadius: 6, background: border, opacity: 0.6, animation: 'pulse 1.4s ease-in-out infinite' }} />
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '100px', position: 'relative', overflow: 'hidden', transition: 'background 0.5s' }}>
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
              fontSize: '36px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400,
              color: secondary, margin: 0, lineHeight: 1.1,
              animation: slideDir >= 0 ? 'slideInRight 0.35s ease forwards' : 'slideInLeft 0.35s ease forwards'
            }}
          >
            {MONTHS_SV[currentMonth]}
          </h1>
          <p style={{ fontSize: '12px', color: accent, margin: '4px 0 0', opacity: 0.7 }}>{currentYear}</p>
        </div>
        <button onClick={() => navigate(1)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 24, lineHeight: 1 }}>›</button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 1 }}>

        {/* Säsongen */}
        <div key={`season-${animKey}`} style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '16px', padding: '20px', animation: 'fadeUp 0.4s ease 0.05s both', transition: 'background 0.5s, border-color 0.5s' }}>
          <p style={{ fontSize: '10px', color: accent, letterSpacing: '0.12em', margin: '0 0 12px', fontWeight: 500 }}>SÄSONGEN</p>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton w="95%" /><Skeleton w="80%" /><Skeleton w="88%" />
            </div>
          ) : aiContent?.seasonText ? (
            <p style={{ fontSize: '15px', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: dark ? '#D1D5DB' : '#2A2E24', margin: 0, lineHeight: 1.7 }}>
              {aiContent.seasonText}
            </p>
          ) : (
            <p style={{ fontSize: '14px', color: accent, fontStyle: 'italic', margin: 0, opacity: 0.6 }}>Hämtar säsongstext...</p>
          )}
        </div>

        {/* Dina frön just nu */}
        <div key={`seeds-${animKey}`} style={{ animation: 'fadeUp 0.4s ease 0.15s both' }}>
          <p style={{ fontSize: '10px', color: accent, letterSpacing: '0.12em', margin: '0 0 12px 2px', fontWeight: 500 }}>DINA FRÖN JUST NU</p>

          {seeds.length === 0 ? (
            <div style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '16px', padding: '18px 20px' }}>
              <p style={{ fontSize: '14px', color: accent, fontStyle: 'italic', margin: 0, opacity: 0.6 }}>Du har inga frön i arkivet ännu.</p>
            </div>
          ) : (
            <>
              {/* Horisontella frökorт ~100×100px */}
              <div ref={chipsRef} className="scrollbar-hide" style={{ display: 'flex', gap: '8px', overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px' }}>
                {seeds.map((seed, i) => {
                  const active = selectedSeed === seed.name
                  const icon = PHASE_ICON[seed.current_phase] || 'seed'
                  const tip = aiContent?.seedTips?.find(t => t.seedName === seed.name)?.tip || ''
                  return (
                    <button
                      key={seed.id}
                      onClick={() => setSelectedSeed(active ? null : seed.name)}
                      style={{
                        flexShrink: 0, width: '100px', height: '100px',
                        borderRadius: '14px', padding: '10px 10px 8px',
                        border: '0.5px solid ' + (active ? accent : border),
                        background: active ? (dark ? '#1E3020' : '#E8EDE4') : cardBg,
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', flexDirection: 'column', gap: '5px',
                        transition: 'background 0.2s, border-color 0.2s',
                        animation: `fadeUp 0.3s ease ${0.05 * i + 0.2}s both`,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? (dark ? '#2A4030' : '#D4E4CC') : (dark ? '#1E2A1A' : '#EDF2EA'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={icon} size={16} color="#7A9E6E" />
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: dark ? '#F2F0E8' : '#1E2018', margin: 0, lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                        {seed.name}
                      </p>
                      {tip && (
                        <p style={{ fontSize: '10px', color: accent, margin: 0, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', opacity: 0.85 }}>
                          {tip}
                        </p>
                      )}
                      {!tip && loading && (
                        <div style={{ height: 10, width: '80%', borderRadius: 4, background: border, opacity: 0.5, animation: 'pulse 1.4s ease-in-out infinite' }} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Valt frö – fullt tipskort */}
              {selectedSeed && selectedTip && (
                <div style={{ background: cardBg, border: '0.5px solid ' + accent + '4D', borderRadius: '14px', padding: '14px 16px', marginTop: '10px', animation: 'fadeUp 0.25s ease both' }}>
                  <p style={{ fontSize: '13px', color: dark ? '#D1D5DB' : '#2A2E24', margin: 0, lineHeight: 1.6 }}>{selectedTip}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Det här är [månad] */}
        <div key={`tips-${animKey}`} style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '16px', padding: '20px', animation: 'fadeUp 0.4s ease 0.25s both', transition: 'background 0.5s, border-color 0.5s' }}>
          <p style={{ fontSize: '10px', color: accent, letterSpacing: '0.12em', margin: '0 0 14px', fontWeight: 500 }}>
            {'DET HÄR ÄR ' + MONTHS_SV[currentMonth].toUpperCase()}
          </p>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton w="92%" /><Skeleton w="78%" />
            </div>
          ) : aiContent?.generalTips?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {aiContent.generalTips.map((tip, i) => (
                <p key={i} style={{ fontSize: '14px', color: dark ? '#D1D5DB' : '#2A2E24', margin: 0, lineHeight: 1.6 }}>{tip}</p>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: accent, fontStyle: 'italic', margin: 0, opacity: 0.6 }}>Hämtar inspirationstips...</p>
          )}
        </div>

      </div>
    </div>
  )
}
