export default function SeedCard({ seed }) {
  return (
    <div style={{ background: 'var(--paper-dark)', border: 'var(--border)', borderRadius: 'var(--radius-md)', padding: '14px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '2px' }}>{seed.name}</h3>
          <p style={{ fontSize: '11px', color: 'var(--salvia-400)', letterSpacing: '0.06em' }}>{seed.species?.toUpperCase()}</p>
        </div>
        {seed.thumb === 'up' && <span style={{ color: 'var(--salvia-600)', fontSize: '16px' }}>↑</span>}
        {seed.thumb === 'down' && <span style={{ color: '#A03030', fontSize: '16px' }}>↓</span>}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
        {seed.frost_sensitive && <Badge text="Frostkänslig" bg="#F5ECD8" color="#7A4E1A" border="#E8C98A" />}
        {seed.requires_pretreatment && <Badge text="Förbehandling" bg="var(--salvia-50)" color="var(--salvia-800)" border="var(--salvia-200)" />}
        {seed.maintenance_level === 'high' && <Badge text="Hög skötsel" bg="#F5ECD8" color="#7A4E1A" border="#E8C98A" />}
        {seed.thumb_note && <Badge text={seed.thumb_note} bg="var(--paper)" color="var(--ink-soft)" border="var(--salvia-200)" />}
      </div>
    </div>
  )
}

function Badge({ text, bg, color, border }) {
  return (
    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: bg, color: color, border: '0.5px solid ' + border }}>
      {text}
    </span>
  )
}