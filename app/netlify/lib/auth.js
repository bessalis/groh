// Delad kontroll för AI-funktionerna: bara inloggade Groh-användare får anropa dem.
// Appen skickar användarens Supabase-token i Authorization-headern, och vi frågar
// Supabase om tokenen är giltig innan något anrop till Anthropic görs.

const json = (body, status) => Response.json(body, { status })

export async function requireUser(req) {
  if (req.method !== 'POST') {
    return { error: json({ error: 'Endast POST' }, 405) }
  }

  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return { error: json({ error: 'Inte inloggad' }, 401) }
  }

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Supabase-variablerna saknas i Netlify')
    return { error: json({ error: 'Serverfel' }, 500) }
  }

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    return { error: json({ error: 'Inte inloggad' }, 401) }
  }

  const user = await res.json()
  return { user }
}

export async function readJson(req) {
  try {
    return await req.json()
  } catch {
    return null
  }
}

// Kortar och rensar fri text innan den skickas till AI:n.
export function cleanText(value, maxLength) {
  if (typeof value !== 'string') return ''
  const withoutControlChars = Array.from(value, ch => (ch.charCodeAt(0) < 32 ? ' ' : ch)).join('')
  return withoutControlChars.trim().slice(0, maxLength)
}

export { json }
