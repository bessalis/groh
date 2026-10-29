// Små hjälpfunktioner för att läsa och skriva delade tabeller i Supabase från
// serverfunktionerna. Använder service role-nyckeln, som bara finns i Netlify
// och aldrig skickas till appen.

function config() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return { url, key }
}

export function dbAvailable() {
  return config() !== null
}

export async function rest(path, { method = 'GET', body, prefer } = {}) {
  const c = config()
  if (!c) throw new Error('SUPABASE_SERVICE_ROLE_KEY saknas i Netlify')
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Supabase ${method} ${path.split('?')[0]}: ${res.status} ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// "  Luktärt  " och "luktärt" ska räknas som samma namn.
export function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

const FACT_COLUMNS = 'key,species,frost_sensitive,requires_pretreatment,pretreatment_note,maintenance_level,companion_planting,sowing_note,status'

export async function findFactsByName(name) {
  const rows = await rest(`plant_names?name=eq.${encodeURIComponent(name)}&select=plant_facts(${FACT_COLUMNS})`)
  return rows?.[0]?.plant_facts || null
}

export async function findFactsByKey(key) {
  const rows = await rest(`plant_facts?key=eq.${encodeURIComponent(key)}&select=${FACT_COLUMNS}`)
  return rows?.[0] || null
}

// Sparar ett nytt AI-utkast. Finns arten redan (kanske granskad) lämnas den orörd.
export async function saveDraft(facts) {
  await rest('plant_facts?on_conflict=key', {
    method: 'POST',
    body: facts,
    prefer: 'resolution=ignore-duplicates,return=minimal',
  })
}

export async function saveName(name, key) {
  await rest('plant_names?on_conflict=name', {
    method: 'POST',
    body: { name, key },
    prefer: 'resolution=ignore-duplicates,return=minimal',
  })
}

// PostgREST-filter "in" med värden som kan innehålla mellanslag och kommatecken.
function inList(values) {
  return 'in.(' + values.map(v => '"' + String(v).replace(/"/g, '\\"') + '"').join(',') + ')'
}

export async function getSeasonTips(zone, month) {
  const rows = await rest(`season_tips?zone=eq.${zone}&month=eq.${month}&select=season_text,general_tips,status`)
  return rows?.[0] || null
}

export async function getSpeciesTips(keys, zone, month) {
  if (!keys.length) return []
  return await rest(`species_tips?zone=eq.${zone}&month=eq.${month}&key=${encodeURIComponent(inList(keys))}&select=key,phase,tip,status`) || []
}

export async function saveSeasonTips(row) {
  await rest('season_tips?on_conflict=zone,month', {
    method: 'POST', body: row, prefer: 'resolution=ignore-duplicates,return=minimal',
  })
}

export async function saveSpeciesTips(rows) {
  if (!rows.length) return
  await rest('species_tips?on_conflict=key,zone,month,phase', {
    method: 'POST', body: rows, prefer: 'resolution=ignore-duplicates,return=minimal',
  })
}

export async function getCategories(keys) {
  if (!keys.length) return []
  return await rest(`species_categories?key=${encodeURIComponent(inList(keys))}&select=key,category,status`) || []
}

export async function saveCategories(rows) {
  if (!rows.length) return
  await rest('species_categories?on_conflict=key', {
    method: 'POST', body: rows, prefer: 'resolution=ignore-duplicates,return=minimal',
  })
}
