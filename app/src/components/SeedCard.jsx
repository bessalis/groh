export default function SeedCard({ seed }) {
  return (
    <div style={{ background: 'var(--surface)', border: 'var(--border)', borderRadius: 'var(--radius-md)', padding: '14px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '2px' }}>{seed.name}</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{seed.species?.toUpperCase()}</p>
        </div>
        {seed.thumb === 'up' && <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>↑</span>}
        {seed.thumb === 'down' && <span style={{ color: 'var(--danger-text)', fontSize: '16px' }}>↓</span>}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
        {seed.frost_sensitive && <Badge text="Frostkänslig" bg="var(--warn-bg)" color="var(--warn-text)" border="var(--warn-border)" />}
        {seed.requires_pretreatment && <Badge text="Förbehandling" bg="var(--info-bg)" color="var(--info-text)" border="var(--info-border)" />}
        {seed.maintenance_level === 'high' && <Badge text="Hög skötsel" bg="var(--warn-bg)" color="var(--warn-text)" border="var(--warn-border)" />}
        {seed.thumb_note && <Badge text={seed.thumb_note} bg="var(--surface-muted)" color="var(--text-muted)" border="var(--border-color)" />}
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