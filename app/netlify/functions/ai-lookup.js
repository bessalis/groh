export default async (req) => {
  const { name } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: 'Du är en trädgårdsexpert. Svara BARA med JSON. För växten "' + name + '": { "species": "latinskt namn", "frost_sensitive": true/false, "requires_pretreatment": true/false, "pretreatment_note": "beskriv förbehandlingen kort eller null", "maintenance_level": "low/medium/high", "companion_planting": "bra grannar eller null", "sowing_note": "kort såningstips för zon 4 Sverige" }'
      }]
    })
  })

  const data = await response.json()
  return Response.json(data)
}

export const config = { path: '/api/ai-lookup' }
