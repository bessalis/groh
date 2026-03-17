import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SeedCard from '../components/SeedCard'
import '../styles/tokens.css'

export default function SeedArchive() {
  const [seeds, setSeeds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSeeds() {
      const { data, error } = await supabase
        .from('seeds')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
      if (!error) setSeeds(data)
      setLoading(false)
    }
    fetchSeeds()
  }, [])

  return (
    <div style={{ padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Fröarkivet</h1>
      <p style={{ fontSize: '12px', color: 'var(--salvia-400)', letterSpacing: '0.07em' }}>
        {seeds.length} FRÖN · SÄSONG 2026
      </p>
      {loading && (
        <p style={{ color: 'var(--salvia-400)', fontStyle: 'italic', marginTop: '16px' }}>
          Hämtar frön...
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
        {seeds.map(seed => (
          <SeedCard key={seed.id} seed={seed} />
        ))}
      </div>
      {!loading && seeds.length === 0 && (
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          color: 'var(--salvia-400)',
          marginTop: '48px',
          textAlign: 'center',
          fontSize: '18px'
        }}>
          Inga frön ännu
        </p>
      )}
    </div>
  )
}