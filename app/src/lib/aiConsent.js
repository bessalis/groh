// Samtycke till att foton skickas till AI (Apples riktlinje 5.1.2(i) och vanlig
// hygien). Gäller fotoskanningen: fröpåsarnas foton skickas till Anthropic för
// att läsas av. Sparas i användarens user_metadata.ai_photo_consent (datum), så
// det krävs ingen ny tabell. Textuppslag (växtnamn) är inga personuppgifter och
// beskrivs på AI-sidan i stället.
//
// ensurePhotoConsent() visar frågan (AiConsentDialog i App) om svaret saknas och
// löser ut med true/false när användaren valt.

import { supabase } from './supabase'

const EVENT = 'groh:ask-photo-consent'

let known = null   // svaret i minnet, så att varje påse inte frågar servern

/** Datum (ISO) då användaren sa ja, eller null. */
export async function photoConsentDate() {
  if (known !== null) return known || null
  const { data } = await supabase.auth.getUser()
  known = data?.user?.user_metadata?.ai_photo_consent || ''
  return known || null
}

export async function hasPhotoConsent() {
  return Boolean(await photoConsentDate())
}

export async function setPhotoConsent(value) {
  const date = value ? new Date().toISOString() : null
  const { error } = await supabase.auth.updateUser({ data: { ai_photo_consent: date } })
  if (error) throw error
  known = date || ''
}

export async function ensurePhotoConsent() {
  if (await hasPhotoConsent()) return true
  return new Promise(resolve => window.dispatchEvent(new CustomEvent(EVENT, { detail: { resolve } })))
}

export function onPhotoConsentRequest(handler) {
  const listener = e => handler(e.detail.resolve)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
