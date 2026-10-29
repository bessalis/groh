import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { callAi } from '../lib/api'
import { fetchCategories, plantKey } from '../lib/categories'
import CategoryIcon from '../components/CategoryIcon'
import { isReviewTime, loadPending, SEASON } from '../lib/review'
import illustration from '../assets/luktart_growing.png'
import grohLogo from '../assets/groh.svg'

const shortcuts = [
  { icon: '+', label: 'Lägg till', action: 'add' },
  { icon: '?', label: 'Planera', action: null },
  { icon: '...', label: 'Övrigt', action: null },
]

const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']

// Vilka fröer är mest aktuella just nu? Plantor som växer först, sedan nysådda,
// sedan resten (fröpåsar som väntar).
const PRIORITY = { seedling: 0, growing: 1, seed: 2, mature: 3 }
const byUrgency = (a, b) => (PRIORITY[a.current_phase] ?? 4) - (PRIORITY[b.current_phase] ?? 4)

export default function Home({ dark, onAdd, onOpenCalendar, onOpenReview }) {
  const [seedCount, setSeedCount] = useState(0)
  const [todo, setTodo] = useState(null)        // [{ seed, tip }] eller null medan det laddar
  const [season, setSeason] = useState(null)    // { month, text, tip }
  const [categories, setCategories] = useState({})
  const [toReview, setToReview] = useState(0)
  const bg = dark ? '#12130F' : '#F2F0E8'
  const cardBg = dark ? '#1A1C17' : '#FFFFFF'
  const text = dark ? '#F2F0E8' : '#1E2018'
  const muted = dark ? '#7A9E6E' : '#7A9E6E'
  const borderColor = dark ? '#2A2E24' : '#E8E4DA'
  const gradientStop = dark ? '#12130F' : '#F2F0E8'

  useEffect(() => {
    if (isReviewTime()) loadPending().then(list => setToReview(list.length)).catch(() => { /* kortet visas inte */ })
  }, [])

  useEffect(() => {
    const now = new Date()
    const month = now.getMonth()
    // Sent i månaden handlar "viktigt" om nästa månad.
    const ahead = now.getDate() >= 20 ? (month + 1) % 12 : month

    supabase.from('seeds')
      .select('id, name, species, current_phase, frost_sensitive, sown_date', { count: 'exact' })
      .eq('is_archived', false)
      .then(async ({ data, count }) => {
        const seeds = data || []
        setSeedCount(count || 0)
        if (seeds.length) fetchCategories(seeds, setCategories).catch(() => { /* ikonerna kan vänta */ })

        // Att göra nu: månadens sparade tips för dina fröer (samma som i kalendern)
        try {
          const cal = await callAi('/api/calendar-ai', {
            month, year: now.getFullYear(),
            seeds: seeds.map(s => ({ name: s.name, species: s.species, current_phase: s.current_phase, frost_sensitive: s.frost_sensitive })),
          })
          const tipFor = Object.fromEntries((cal.seedTips || []).map(t => [t.seedName, t.tip]))
          setTodo([...seeds].sort(byUrgency).filter(s => tipFor[s.name]).slice(0, 3).map(seed => ({ seed, tip: tipFor[seed.name] })))
          if (ahead === month) setSeason({ month: ahead, text: cal.seasonText, tip: cal.generalTips?.[0] })
        } catch {
          setTodo([])
        }

        // Viktigt inför nästa månad: bara säsongstexten, delad per zon
        if (ahead !== month) {
          try {
            const next = await callAi('/api/calendar-ai', { month: ahead, year: ahead === 0 ? now.getFullYear() + 1 : now.getFullYear(), seeds: [] })
            setSeason({ month: ahead, text: next.seasonText, tip: next.generalTips?.[0] })
          } catch { /* kortet visas inte */ }
        }
      })
  }, [])

  function plantText(count) {
    if (count === 0) return 'Inga frön ännu – lägg till ditt första!'
    if (count === 1) return '1 frö i din samling'
    return count + ' frön växer fint'
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', maxWidth: '390px', margin: '0 auto', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', position: 'relative' }}>

      <div style={{ position: 'relative' }}>
        <img src={illustration} alt="Garden" style={{ width: '100%', display: 'block', height: '540px', objectFit: 'cover' }} />

        {/* topp-gradient för läsbarhet */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '220px', background: 'linear-gradient(to bottom, ' + gradientStop + ' 0%, transparent 100%)', pointerEvents: 'none' }} />

        {/* logga + undertext */}
        <div style={{ position: 'absolute', top: '12px', left: 0, right: 0, textAlign: 'center', zIndex: 1 }}>
          <img src={grohLogo} alt="Groh" style={{ width: '180px', display: 'inline-block', filter: dark ? 'none' : 'invert(1) opacity(0.55)' }} />
          <p style={{ fontSize: '13px', color: muted, margin: '-20px 0 0' }}>{plantText(seedCount)}</p>
        </div>

        {/* botten-gradient + snabbkort */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to bottom, transparent 0%, ' + gradientStop + ' 100%)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 2 }}>
          {shortcuts.map((s, i) => (
            <button key={i} type="button" onClick={() => s.action === 'add' && onAdd && onAdd()} style={{ flex: 1, background: '#808F73', border: 'none', borderRadius: '14px', padding: '14px 8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#11171F' }}>
              <span aria-hidden="true" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#75836B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#11171F' }}>{s.icon}</span>
              <span className="t-body" style={{ fontSize: '18px', fontWeight: 500, color: '#11171F' }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 className="t-heading-l" style={{ color: text, margin: '0 0 2px' }}>Just nu</h2>

        {/* Höstbokslut */}
        {toReview > 0 && onOpenReview && (
          <section style={{ background: '#808F73', borderRadius: '16px', padding: '18px', color: '#11171F' }}>
            <p className="t-label" style={{ margin: '0 0 8px', color: '#11171F' }}>Höstbokslut {SEASON}</p>
            <p className="t-heading" style={{ margin: '0 0 6px', color: '#11171F' }}>Dags att stänga säsongen</p>
            <p className="t-small" style={{ margin: '0 0 14px', color: '#11171F' }}>
              Gå igenom {toReview === 1 ? 'årets sådd' : `årets ${toReview} sådder`}: vad blev bra, och vad blev inget? Det du lär dig följer med till nästa år.
            </p>
            <button type="button" onClick={onOpenReview} className="t-body" style={{ background: '#11171F', color: '#F2F0E8', border: 'none', borderRadius: '10px', padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
              Börja bokslutet
            </button>
          </section>
        )}

        {/* Att göra nu */}
        <section style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '16px', padding: '16px' }}>
          <p className="t-label" style={{ color: muted, margin: '0 0 10px' }}>Att göra nu</p>
          {todo === null && <p className="t-small" style={{ color: muted, margin: 0 }}>Kollar dina fröer…</p>}
          {todo?.length === 0 && (
            <p className="t-prose" style={{ color: text, margin: 0 }}>Inget brådskande den här veckan. Njut av vilan.</p>
          )}
          {todo?.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {todo.map(({ seed, tip }) => (
                <li key={seed.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: dark ? '#1E2A1A' : '#EDF2EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#7A9E6E' }}>
                    <CategoryIcon category={categories[plantKey(seed)]} size={18} />
                  </div>
                  <div>
                    <p className="t-heading-s" style={{ color: text, margin: 0 }}>{seed.name}</p>
                    <p className="t-small" style={{ color: text, opacity: 0.85, margin: '2px 0 0' }}>{tip}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Viktigt inför månaden */}
        {season?.text && (
          <section style={{ background: cardBg, border: '0.5px solid ' + borderColor, borderRadius: '16px', padding: '16px' }}>
            <p className="t-label" style={{ color: muted, margin: '0 0 10px' }}>
              {season.month === new Date().getMonth() ? 'Just nu i ' : 'Viktigt inför '}{MONTHS[season.month]}
            </p>
            <p className="t-prose" style={{ color: text, margin: 0 }}>{season.text}</p>
            {season.tip && <p className="t-small" style={{ color: text, opacity: 0.85, margin: '10px 0 0' }}>{season.tip}</p>}
            {onOpenCalendar && (
              <button type="button" onClick={onOpenCalendar} className="t-small" style={{ background: 'none', border: 'none', padding: 0, marginTop: '12px', color: muted, cursor: 'pointer', fontWeight: 700 }}>
                Till kalendern →
              </button>
            )}
          </section>
        )}

        {(todo?.length > 0 || season?.text) && (
          <p className="t-caption" style={{ color: muted, margin: '0 4px' }}>Tipsen är skrivna av AI och ännu inte granskade.</p>
        )}
      </div>
    </div>
  )
}
