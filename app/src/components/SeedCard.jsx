export default function SeedCard({ seed }) {
  return (
    <div style={{ background: 'var(--paper-dark)', border: 'var(--border)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
      <h3 style={{ fontSize: '16px' }}>{seed.name}</h3>
      <p style={{ fontSize: '11px', color: 'var(--salvia-400)' }}>{seed.species}</p>
    </div>
  )
}