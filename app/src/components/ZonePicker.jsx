import { ZONES, ROMAN, ZONE_EXAMPLES, ZONE_MAP_URL } from '../lib/zone'

// "Jag odlar i zon" – åtta knappar, I–VIII. Används i profilen och i kalendern
// tills användaren har valt.
export default function ZonePicker({ zone, chosen, onChange, saving, colors }) {
  const { text, muted, border, cardBg, activeBg } = colors
  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: '15px', color: text, fontFamily: 'Georgia, serif' }}>Jag odlar i zon</p>
      <div role="radiogroup" aria-label="Odlingszon" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {ZONES.map(z => {
          const active = chosen && z === zone
          return (
            <button
              key={z}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Zon ${ROMAN[z]} (${z})`}
              disabled={saving}
              onClick={() => onChange(z)}
              style={{
                padding: '10px 0 8px', borderRadius: '10px', cursor: saving ? 'default' : 'pointer',
                border: '0.5px solid ' + (active ? 'var(--salvia-600)' : border),
                background: active ? activeBg : cardBg, color: text,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                fontFamily: 'var(--font-serif)',
              }}
            >
              <span style={{ fontSize: '17px' }}>{ROMAN[z]}</span>
              <span style={{ fontSize: '10px', color: muted, fontFamily: 'var(--font-sans)' }}>{z}</span>
            </button>
          )
        })}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: '12px', color: muted, lineHeight: 1.5 }}>
        {chosen
          ? `Zon ${ROMAN[zone]}, ${ZONE_EXAMPLES[zone]}.`
          : `Vi utgår från zon ${ROMAN[zone]} tills du väljer.`}
        {' '}
        <a href={ZONE_MAP_URL} target="_blank" rel="noreferrer" style={{ color: muted }}>Hitta din zon på Svensk Trädgårds zonkarta</a>
      </p>
    </div>
  )
}
