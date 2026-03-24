import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MONTHS = [
  { id: 'januari', name: 'Januari', seeds: [{ name: 'Riddarsporre', type: 'indoor', pre: true }] },
  { id: 'februari', name: 'Februari', seeds: [{ name: 'Praktvadd', type: 'indoor' }, { name: 'Riddarsporre', type: 'indoor', pre: true }, { name: 'Luktart', type: 'indoor' }] },
  { id: 'mars', name: 'Mars', seeds: [{ name: 'Luktart', type: 'indoor', pre: true }, { name: 'Praktvadd', type: 'indoor' }, { name: 'Blarisp', type: 'indoor', pre: true }, { name: 'Sommarflox', type: 'indoor', pre: true }, { name: 'Lejonap', type: 'indoor' }, { name: 'Tagetes', type: 'indoor' }, { name: 'Aster', type: 'indoor' }, { name: 'Amarant', type: 'indoor' }] },
  { id: 'april', name: 'April', seeds: [{ name: 'Jungfruhirs', type: 'indoor' }, { name: 'Blarisp', type: 'indoor', pre: true }, { name: 'Luktart ute', type: 'outdoor' }, { name: 'Petunia', type: 'indoor' }] },
  { id: 'maj', name: 'Maj', seeds: [{ name: 'Plantering ut', type: 'plant' }, { name: 'Frost - vanta', type: 'frost' }, { name: 'Jungfruhirs ute', type: 'outdoor' }] },
  { id: 'juni', name: 'Juni', seeds: [{ name: 'Kansliga ut', type: 'plant' }, { name: 'Direktsadd', type: 'outdoor' }] },
  { id: 'juli', name: 'Juli', seeds: [{ name: 'Tvaaaringar', type: 'outdoor' }] },
  { id: 'augusti', name: 'Augusti', seeds: [{ name: 'Tvaaaringar', type: 'outdoor' }] },
  { id: 'september', name: 'September', seeds: [{ name: 'Hostdirekt', type: 'outdoor' }] },
  { id: 'oktober', name: 'Oktober', seeds: [] },
  { id: 'november', name: 'November', seeds: [] },
  { id: 'december', name: 'December', seeds: [{ name: 'Planera', type: 'pre' }] },
]

const CURRENT = 'mars'

const TYPE_COLOR = {
  indoor:  { bg: '#1E3020', color: '#7A9E6E', border: '#3B5E35' },
  outdoor: { bg: '#2E2010', color: '#BA9060', border: '#854F0B' },
  plant:   { bg: '#102030', color: '#6090BA', border: '#185FA5' },
  pre:     { bg: '#1E1A30', color: '#9F99CC', border: '#534AB7' },
  frost:   { bg: '#301010', color: '#E28080', border: '#A32D2D' },
}

const MONTH_ILLUSTRATIONS = {
  januari: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#1A1C17"/>
      <path d="M22 36 Q20 28 19 22 Q18 16 22 12" stroke="#2A3828" strokeWidth="1.5" fill="none"/>
      <circle cx="22" cy="10" r="3" fill="#2A3828"/>
      <circle cx="18" cy="20" r="2" fill="#2A3828"/>
      <circle cx="26" cy="16" r="2" fill="#2A3828"/>
    </svg>
  ),
  februari: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#1A1C17"/>
      <path d="M22 36 Q20 26 19 20 Q18 14 22 10" stroke="#3B5E35" strokeWidth="1.5" fill="none"/>
      <path d="M22 10 Q24 6 27 5 Q28 8 24 10 Q23 10 22 10" fill="#3B5E35"/>
      <path d="M22 22 Q16 18 15 13 Q18 11 21 17 Q21.5 19 22 22" fill="#2A4020"/>
    </svg>
  ),
  mars: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#1A2518"/>
      <path d="M22 36 Q20 26 19 18 Q18 12 22 8" stroke="#4E6E44" strokeWidth="1.5" fill="none"/>
      <path d="M22 8 Q24 3 27 2 Q29 6 24 9 Q23 9 22 8" fill="#639922"/>
      <path d="M22 20 Q15 16 14 10 Q17 8 21 14 Q21.5 17 22 20" fill="#4E6E44"/>
      <path d="M22 24 Q29 20 30 14 Q27 12 23 18 Q22.5 21 22 24" fill="#3B5E35"/>
      <circle cx="16" cy="12" r="2" fill="#97C459" opacity="0.6"/>
    </svg>
  ),
  april: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#201A10"/>
      <path d="M22 36 Q20 26 19 18" stroke="#4E6E44" strokeWidth="1.5" fill="none"/>
      <circle cx="16" cy="20" r="5" fill="#D85A30" opacity="0.8"/>
      <circle cx="28" cy="16" r="4" fill="#E8A090" opacity="0.7"/>
      <circle cx="20" cy="12" r="3" fill="#D85A30" opacity="0.6"/>
    </svg>
  ),
  maj: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#1E2810"/>
      <path d="M22 36 Q20 24 19 16" stroke="#4E6E44" strokeWidth="1.5" fill="none"/>
      <circle cx="16" cy="20" r="6" fill="#D4537E" opacity="0.85"/>
      <circle cx="27" cy="15" r="5" fill="#E8A0B8" opacity="0.7"/>
      <circle cx="20" cy="11" r="4" fill="#D4537E" opacity="0.9"/>
      <circle cx="28" cy="23" r="4" fill="#993556" opacity="0.6"/>
    </svg>
  ),
  juni: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#1E2810"/>
      <path d="M22 36 Q20 26 19 18" stroke="#4E6E44" strokeWidth="1.5" fill="none"/>
      <circle cx="15" cy="18" r="7" fill="#D4537E" opacity="0.9"/>
      <circle cx="27" cy="14" r="6" fill="#E8A0B8" opacity="0.8"/>
      <circle cx="22" cy="10" r="5" fill="#D4537E"/>
      <circle cx="29" cy="22" r="5" fill="#993556" opacity="0.7"/>
      <circle cx="14" cy="26" r="4" fill="#E8A0B8" opacity="0.6"/>
    </svg>
  ),
  juli: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#201808"/>
      <path d="M22 36 Q20 28 19 20" stroke="#4E6E44" strokeWidth="1.5" fill="none"/>
      <circle cx="16" cy="18" r="6" fill="#D85A30" opacity="0.8"/>
      <circle cx="26" cy="14" r="5" fill="#EF9F27" opacity="0.8"/>
      <circle cx="20" cy="10" r="4" fill="#D85A30" opacity="0.9"/>
    </svg>
  ),
  augusti: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#201808"/>
      <path d="M22 36 Q20 28 19 20" stroke="#4E6E44" strokeWidth="1.5" fill="none"/>
      <circle cx="16" cy="20" r="5" fill="#D85A30" opacity="0.6"/>
      <circle cx="26" cy="16" r="4" fill="#EF9F27" opacity="0.6"/>
      <path d="M18 28 Q16 22 17 18" stroke="#3B5E35" strokeWidth="1" fill="none"/>
    </svg>
  ),
  september: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#1A1C17"/>
      <path d="M22 36 Q20 28 20 22" stroke="#3B5E35" strokeWidth="1.5" fill="none"/>
      <path d="M20 22 Q14 18 12 12 Q16 10 20 18 Q20 20 20 22" fill="#3B5E35" opacity="0.7"/>
      <path d="M20 22 Q26 18 28 12 Q24 10 20 18" fill="#2A3828" opacity="0.7"/>
    </svg>
  ),
  oktober: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#1A1C17"/>
      <path d="M14 16 Q18 22 22 28 Q26 22 30 16" stroke="#4A3010" strokeWidth="1.5" fill="none"/>
      <path d="M14 16 Q12 10 16 8 Q20 10 18 16 Q16 20 14 16" fill="#8B4010" opacity="0.7"/>
      <path d="M30 16 Q32 10 28 8 Q24 10 26 16 Q28 20 30 16" fill="#BA7517" opacity="0.7"/>
    </svg>
  ),
  november: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#141414"/>
      <path d="M22 34 Q22 26 22 18" stroke="#2A2A2A" strokeWidth="1" fill="none"/>
      <path d="M14 14 L22 18 L30 14" stroke="#2A2A2A" strokeWidth="0.5" fill="none"/>
    </svg>
  ),
  december: () => (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#141820"/>
      <circle cx="22" cy="15" r="4" fill="#1A2840" stroke="#3B5E80" strokeWidth="0.5"/>
      <circle cx="16" cy="24" r="3" fill="#1A2840" stroke="#3B5E80" strokeWidth="0.5"/>
      <circle cx="28" cy="24" r="3" fill="#1A2840" stroke="#3B5E80" strokeWidth="0.5"/>
      <circle cx="22" cy="30" r="2" fill="#3B5E80" opacity="0.5"/>
    </svg>
  ),
}

const HERO_DESC = {
  januari: 'Planera og bestil fro',
  februari: 'Start tidlig inomhus',
  mars: 'Dags att sa! Groningsdags',
  april: 'Fler fron inomhus',
  maj: 'Haerdning och plantering ut',
  juni: 'Kansliga plantor ut!',
  juli: 'Skoerd och direktsadd',
  augusti: 'Skoerd och tvaaaringar',
  september: 'Hostdirekt och insamling',
  oktober: 'Avslutning av sasongen',
  november: 'Vila och reflektion',
  december: 'Planera nasta ar',
}

export default function Calendar({ dark }) {
  const [mySeeds, setMySeeds] = useState([])
  const [expanded, setExpanded] = useState(null)

  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const border = dark ? '#2A2E24' : '#E8E4DA'
  const heroBg = dark ? '#1A2518' : '#E8EDE4'

  useEffect(() => {
    supabase.from('seeds').select('name').then(({ data }) => {
      if (data) setMySeeds(data.map(s => s.name.toLowerCase()))
    })
  }, [])

  function isMine(name) {
    return mySeeds.some(s => name.toLowerCase().includes(s) || s.includes(name.toLowerCase()))
  }

  const currentMonth = MONTHS.find(m => m.id === CURRENT)
  const otherMonths = MONTHS.filter(m => m.id !== CURRENT)
  const Illus = MONTH_ILLUSTRATIONS

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: '80px' }}>
      <div style={{ padding: '24px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: '11px', color: muted, margin: '0 0 2px', letterSpacing: '0.08em' }}>SAKALENDER 2026</p>
          <h1 style={{ fontSize: '24px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: text, margin: 0 }}>Zon 4 · Uppsala</h1>
        </div>
        <p style={{ fontSize: '12px', color: muted, margin: 0 }}>{mySeeds.length} fron</p>
      </div>

      <div style={{ margin: '0 16px 20px', borderRadius: '16px', overflow: 'hidden', background: heroBg, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 0', gap: '16px' }}>
          <div style={{ flexShrink: 0 }}>
            {Illus.mars()}
          </div>
          <div>
            <p style={{ fontSize: '11px', color: muted, margin: '0 0 3px', letterSpacing: '0.08em' }}>MARS · NU</p>
            <h2 style={{ fontSize: '20px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: text, margin: '0 0 4px' }}>Groningsdags!</h2>
            <p style={{ fontSize: '13px', color: muted, margin: 0 }}>{currentMonth.seeds.length} aktiviteter denna manad</p>
          </div>
        </div>
        <div style={{ padding: '14px 20px 18px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {currentMonth.seeds.map((s, i) => {
            const mine = isMine(s.name)
            const c = (dark ? TYPE_COLOR[s.type] : { bg: '#E8F0E4', color: '#2E4228', border: '#A0C090' }) || TYPE_COLOR.indoor
            return (
              <span key={i} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: c.bg, color: c.color, border: mine ? '2px solid ' + c.border : '0.5px solid ' + c.border, fontWeight: mine ? 600 : 400 }}>
                {s.name}{s.pre ? '*' : ''}
              </span>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <p style={{ fontSize: '11px', color: muted, letterSpacing: '0.08em', margin: '0 0 10px' }}>KOMMANDE MANADER</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {otherMonths.map(month => {
            const IllusComp = Illus[month.id]
            const isExp = expanded === month.id
            const mineCount = month.seeds.filter(s => isMine(s.name)).length
            return (
              <div key={month.id} onClick={() => setExpanded(isExp ? null : month.id)} style={{ background: cardBg, border: '0.5px solid ' + border, borderRadius: '12px', padding: '10px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {IllusComp && <IllusComp />}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: text, margin: '0 0 2px', fontWeight: 400 }}>{month.name}</p>
                    <p style={{ fontSize: '11px', color: muted, margin: 0 }}>
                      {month.seeds.length === 0 ? 'Vila' : HERO_DESC[month.id]}
                      {mineCount > 0 ? ' · ' + mineCount + ' av dina fron' : ''}
                    </p>
                  </div>
                  <span style={{ color: muted, fontSize: '16px', transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                </div>
                {isExp && month.seeds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px', paddingTop: '10px', borderTop: '0.5px solid ' + border }}>
                    {month.seeds.map((s, i) => {
                      const mine = isMine(s.name)
                      const c = (dark ? TYPE_COLOR[s.type] : { bg: '#E8F0E4', color: '#2E4228', border: '#A0C090' }) || TYPE_COLOR.indoor
                      return (
                        <span key={i} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: c.bg, color: c.color, border: mine ? '2px solid ' + c.border : '0.5px solid ' + c.border, fontWeight: mine ? 600 : 400 }}>
                          {s.name}{s.pre ? '*' : ''}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
