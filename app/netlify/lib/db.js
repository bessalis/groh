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

const FACT_COLUMNS = 'key,species,swedish_name,frost_sensitive,requires_pretreatment,pretreatment_note,maintenance_level,companion_planting,sowing_note,status'

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

// Tak för AI-anrop per användare och dag. Standard 100, kan ändras med
// miljövariabeln AI_DAILY_LIMIT i Netlify. Om databasen inte svarar släpps
// anropet igenom hellre än att appen slutar fungera.
export async function useAiQuota(userId) {
  if (!userId || !dbAvailable()) return true
  const limit = Number(process.env.AI_DAILY_LIMIT) || 100
  try {
    return (await rest('rpc/use_ai_quota', { method: 'POST', body: { p_user_id: userId, p_limit: limit } })) !== false
  } catch (e) {
    console.error('Kunde inte kontrollera AI-taket', e)
    return true
  }
}

// ── Sorter (plant_varieties) ──────────────────────────────────────────────
// Nyckeln är '<artnyckel>|<sortnamn normaliserat>' och är också bildnyckel.
export const VARIETY_COLUMNS = 'key,species_key,cultivar,swedish_name,sow_indoor_months,sow_outdoor_months,days_to_germination_min,days_to_germination_max,sowing_depth_cm,light_germination,status'

export function varietyKey(speciesKey, cultivar) {
  const sort = normalizeName(String(cultivar || '').replace(/["'”“‘’]/g, ''))
  return speciesKey && sort ? `${speciesKey}|${sort}` : null
}

export async function findVariety(key) {
  const rows = await rest(`plant_varieties?key=eq.${encodeURIComponent(key)}&select=${VARIETY_COLUMNS}`)
  return rows?.[0] || null
}

// Skapar sorten om den inte finns. En befintlig (kanske granskad) sort lämnas orörd.
export async function saveVariety(row) {
  await rest('plant_varieties?on_conflict=key', {
    method: 'POST', body: row, prefer: 'resolution=ignore-duplicates,return=minimal',
  })
}

// ── Lagring (Supabase Storage) med service role ──────────────────────────
function storageUrl(path) {
  const c = config()
  if (!c) throw new Error('SUPABASE_SERVICE_ROLE_KEY saknas i Netlify')
  return { url: `${c.url}/storage/v1/${path}`, key: c.key, base: c.url }
}

const encodePath = path => path.split('/').map(encodeURIComponent).join('/')

/** Engångslänk så att appen kan ladda upp en fil direkt till en privat bucket. */
export async function signedUploadUrl(bucket, path) {
  const { url, key, base } = storageUrl(`object/upload/sign/${bucket}/${encodePath(path)}`)
  const res = await fetch(url, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!res.ok) throw new Error(`Storage sign ${res.status} ${await res.text()}`)
  const { url: signed } = await res.json()
  const token = new URL(signed, base).searchParams.get('token')
  return { path, token }
}

export async function downloadObject(bucket, path) {
  const { url, key } = storageUrl(`object/${bucket}/${encodePath(path)}`)
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!res.ok) throw new Error(`Storage download ${res.status} ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

export async function uploadObject(bucket, path, body, contentType) {
  const { url, key } = storageUrl(`object/${bucket}/${encodePath(path)}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': contentType, 'Cache-Control': 'max-age=31536000' },
    body,
  })
  if (!res.ok) throw new Error(`Storage upload ${res.status} ${await res.text()}`)
}

export function publicUrl(bucket, path) {
  return storageUrl(`object/public/${bucket}/${encodePath(path)}`).url
}

// ── Fröbilder (seed_images) ───────────────────────────────────────────────
export async function saveSeedImage(row) {
  await rest('seed_images?on_conflict=key', {
    method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal',
  })
}

// ── Radera konto ──────────────────────────────────────────────────────────
/** Alla filer under en mapp i en bucket, även i undermappar. */
export async function listObjects(bucket, prefix) {
  const { url, key } = storageUrl(`object/list/${bucket}`)
  const files = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset }),
    })
    if (!res.ok) throw new Error(`Storage list ${res.status} ${await res.text()}`)
    const items = await res.json()
    for (const item of items) {
      const path = `${prefix}${item.name}`
      if (item.id) files.push(path)                       // en fil
      else files.push(...await listObjects(bucket, `${path}/`))   // en mapp
    }
    if (items.length < 1000) return files
  }
}

export async function removeObjects(bucket, paths) {
  for (let i = 0; i < paths.length; i += 500) {
    const { url, key } = storageUrl(`object/${bucket}`)
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: paths.slice(i, i + 500) }),
    })
    if (!res.ok) throw new Error(`Storage delete ${res.status} ${await res.text()}`)
  }
}

export async function deleteAuthUser(id) {
  const c = config()
  if (!c) throw new Error('SUPABASE_SERVICE_ROLE_KEY saknas i Netlify')
  const res = await fetch(`${c.url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { apikey: c.key, Authorization: `Bearer ${c.key}` },
  })
  if (!res.ok) throw new Error(`Auth delete ${res.status} ${await res.text()}`)
}
