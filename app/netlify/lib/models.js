// AI-modeller som Groh använder. Minsta modell som räcker för uppgiften.
// Byt här om en modell tas ur bruk; Anthropic svarar då "not_found_error".
export const LOOKUP_MODEL = 'claude-haiku-5-5'
export const CALENDAR_MODEL = 'claude-haiku-5-5'

// Plockar ut JSON-svaret ur ett meddelande från Anthropic. Svaret kan innehålla
// flera block (t.ex. ett tankeblock först), så vi letar upp textblocken och
// tolkar JSON-objektet i dem. Returnerar null om inget giltigt JSON hittas.
export function extractJson(message) {
  const text = (message?.content || [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}
