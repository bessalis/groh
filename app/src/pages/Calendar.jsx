import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MONTHS_SV = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']

export default function Calendar({ dark }) {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [seeds, setSeeds] = useState([])
  const [seedsLoaded, setSeedsLoaded] = useState(false)
  const [aiContent, setAiContent] = useState(null)
  const [loading, setLoading] = useState(false)

  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const border = dark ? '#2A2E24' : '#E8E4DA'

  useEffect(() => {
    console.log('[Calendar] Laddar frön från Supabase...')
    supabase.from('seeds')
      .select('id, name, species, sown_date, current_phase, frost_sensitive')
      .eq('is_archived', false)
      .then(({ data }) => {
        console.log('[Calendar] Frön laddade:', data?.length ?? 0, 'st', data)
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
          seeds: seeds.map(s => ({
            name: s.name,
            species: s.species,
            sown_date: s.sown_date,
            current_phase: s.current_phase,
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

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const monthName = MONTHS_SV[currentMonth]

  function Skeleton({ height = 16, width = '100%', style = {} }) {
    return (
      <div style={{
        height, width, borderRadius: 6,
        background: dark ? '#2A2E24' : '#E0DDD4',
        animation: 'pulse 1.4s ease-in-out infinite',
        ...style
      }} />
    )
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '100px' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Månadsnavigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 20px 20px' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: muted, fontSize: '22px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: text, margin: 0, lineHeight: 1.1 }}>{monthName}</h1>
          <p style={{ fontSize: '12px', color: muted, margin: '3px 0 0' }}>{currentYear}</p>
        </div>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: muted, fontSize: '22px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>›</button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Säsongstext */}
        <div style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '14px', padding: '18px 20px' }}>
          <p style={{ fontSize: '10px', color: muted, letterSpacing: '0.1em', margin: '0 0 12px' }}>SÄSONGEN</p>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Skeleton height={14} width="95%" />
              <Skeleton height={14} width="80%" />
              <Skeleton height={14} width="88%" />
            </div>
          ) : aiContent?.seasonText ? (
            <p style={{ fontSize: '15px', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: text, margin: 0, lineHeight: 1.65 }}>
              {aiContent.seasonText}
            </p>
          ) : (
            <p style={{ fontSize: '14px', color: muted, fontStyle: 'italic', margin: 0 }}>Inget säsongsinnehåll ännu.</p>
          )}
        </div>

        {/* Dina frön just nu */}
        <div>
          <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '4px 0 10px 2px' }}>DINA FRÖN JUST NU</p>
          {seeds.length === 0 ? (
            <div style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '14px', padding: '16px 20px' }}>
              <p style={{ fontSize: '14px', color: muted, fontStyle: 'italic', margin: 0 }}>Du har inga frön i arkivet ännu.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {seeds.map(seed => {
                const tip = aiContent?.seedTips?.find(t => t.seedName === seed.name)?.tip
                return (
                  <div key={seed.id} style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '14px', padding: '14px 16px' }}>
                    <p style={{ fontSize: '14px', fontFamily: 'Georgia, serif', color: text, margin: '0 0 5px', fontWeight: 400 }}>{seed.name}</p>
                    {loading ? (
                      <Skeleton height={12} width="85%" />
                    ) : tip ? (
                      <p style={{ fontSize: '13px', color: muted, margin: 0, lineHeight: 1.5 }}>{tip}</p>
                    ) : (
                      <p style={{ fontSize: '13px', color: border, margin: 0, fontStyle: 'italic' }}>Inget tips för denna månad.</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Inspirationstips */}
        <div style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '14px', padding: '18px 20px', marginTop: '4px' }}>
          <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0 0 12px' }}>{'DET HÄR ÄR ' + monthName.toUpperCase()}</p>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Skeleton height={13} width="92%" />
              <Skeleton height={13} width="78%" />
              <Skeleton height={13} width="85%" />
            </div>
          ) : aiContent?.generalTips?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {aiContent.generalTips.map((tip, i) => (
                <p key={i} style={{ fontSize: '14px', color: text, margin: 0, lineHeight: 1.55 }}>{tip}</p>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: muted, fontStyle: 'italic', margin: 0 }}>Inga inspirationstips ännu.</p>
          )}
        </div>

      </div>
    </div>
  )
}
