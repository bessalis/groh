// Sammanlagd status för flera AI-texter: granskat bara om allt som visas är granskat.
export function combinedStatus(statuses) {
  const list = statuses.filter(Boolean)
  return list.length && list.every(s => s === 'reviewed') ? 'reviewed' : 'ai_draft'
}
