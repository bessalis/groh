import Home from '../assets/home.svg?react'
import MyPlants from '../assets/myplants.svg?react'
import Calendar from '../assets/calendar.svg?react'
import MyProfile from '../assets/myprofile.svg?react'
import Sun from '../assets/sun.svg?react'
import Moon from '../assets/moon.svg?react'
import Seed from '../assets/seed.svg?react'
import Seedling from '../assets/seedling.svg?react'
import Grown from '../assets/grown.svg?react'
import Mature from '../assets/mature.svg?react'
import Water from '../assets/water.svg?react'
import Temperature from '../assets/temperature.svg?react'
import Settings from '../assets/settings.svg?react'
import Alerts from '../assets/alerts.svg?react'
import Help from '../assets/help.svg?react'
import Camera from '../assets/camera.svg?react'   // Phosphor (MIT), tillfällig till ikonrevisionen

// Gränssnittsikonerna ligger som SVG-filer i assets/ med fill="currentColor",
// samma mönster som CategoryIcon. Färgen tas från color (gärna en token,
// t.ex. 'var(--text-muted)') eller från omgivande text.
const ICONS = {
  home: Home, myplants: MyPlants, calendar: Calendar,
  myprofile: MyProfile, sun: Sun, moon: Moon,
  seed: Seed, seedling: Seedling, grown: Grown,
  mature: Mature, water: Water, temperature: Temperature,
  settings: Settings, alerts: Alerts, help: Help,
  camera: Camera,
}

// Ikonerna står nästan alltid bredvid en text eller i en knapp med aria-label,
// så de döljs för skärmläsare om inte title anges.
export function Icon({ name, size = 24, color = 'var(--text-muted)', title }) {
  const Svg = ICONS[name]
  if (!Svg) return null
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true }
  return <Svg width={size} height={size} style={{ color, flexShrink: 0 }} {...a11y} />
}
