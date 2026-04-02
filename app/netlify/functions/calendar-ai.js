export default async (req) => {
  const { month, year, seeds } = await req.json()

  const MONTHS_SV = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
  const monthName = MONTHS_SV[month]

  const sorted = [...seeds]
    .sort((a, b) => (b.sown_date || '').localeCompare(a.sown_date || ''))
    .slice(0, 6)

  const seedList = sorted.length > 0
    ? sorted.map(s => `- ${s.name} (${s.species || 'okänd art'}, fas: ${s.current_phase || 'okänd'}${s.frost_sensitive ? ', frostkänslig' : ''}${s.sown_date ? ', sått: ' + s.sown_date : ''})`).join('\n')
    : '(inga frön tillagda)'

  const prompt = `Det är ${monthName} ${year}. Trädgårdszon 4, Sverige (ungefär Uppsala-klimat).

Användarens frön just nu:
${seedList}

Svara BARA med giltig JSON, inga kommentarer utanför JSON-blocket:
{
  "seasonText": "Max 2 meningar som stämningssätter månaden – poetiskt, varmt, lite självironiskt. Inte en lista.",
  "seedTips": [
    { "seedName": "exakt samma namn som i listan ovan", "tip": "max en mening – konkret men kärleksfullt råd för just det fröet den här månaden" }
  ],
  "generalTips": [
    "tip 1 – en hel mening",
    "tip 2 – en hel mening"
  ]
}

seedTips ska innehålla ett objekt per frö i listan. Om listan är tom, returnera seedTips som [].`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: 'Du är en trädgårdsrådgivare med varm, poetisk och lite självironisk ton – tänk Elin Unnes / the secret gardener-bloggen. Du är botaniskt korrekt och anpassar råd till zon 4, Sverige. Du svarar ALLTID bara med ren JSON, inget annat.',
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await response.json()
  return Response.json(data)
}

export const config = { path: '/api/calendar-ai' }
