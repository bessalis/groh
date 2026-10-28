import { supabase } from './supabase'

// Anropar en av appens AI-funktioner med den inloggade användarens token,
// så att funktionen kan kontrollera att anropet kommer från en Groh-användare.
export async function callAi(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Inte inloggad')

  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`AI-anropet misslyckades (${res.status})`)
  return res.json()
}
