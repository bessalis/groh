import { supabase } from './supabase'

// Svensk Trädgårds odlingszoner, I (mildast) till VIII (kärvast).
export const ZONES = [1, 2, 3, 4, 5, 6, 7, 8]
export const ROMAN = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' }
export const DEFAULT_ZONE = 2
export const ZONE_MAP_URL = 'https://svensktradgard.se/tradgardsrad/zonkartan/digitala-zonkartan/'

// Ungefärliga exempel, för att hjälpa den som inte vet sin zon.
export const ZONE_EXAMPLES = {
  1: 't.ex. Malmö, Skånes kust',
  2: 't.ex. Göteborg, södra kustlandet',
  3: 't.ex. Stockholm, Mälardalen',
  4: 't.ex. Uppsala, Götalands inland',
  5: 't.ex. Gävle, södra Norrlands kust',
  6: 't.ex. Umeå, södra Norrlands inland',
  7: 't.ex. Luleå, norra Norrland',
  8: 'fjällnära och fjäll',
}

// Zonen sparas på användarkontot (user_metadata), så att serverfunktionerna
// kan läsa den säkert från inloggningen.
export function readZone(user) {
  const zone = Number(user?.user_metadata?.zone)
  return ZONES.includes(zone) ? { zone, chosen: true } : { zone: DEFAULT_ZONE, chosen: false }
}

export async function saveZone(zone) {
  const { data, error } = await supabase.auth.updateUser({ data: { zone } })
  if (error) throw error
  return data.user
}
