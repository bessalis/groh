import homeUrl from '../assets/home.svg'
import plantsUrl from '../assets/myplants.svg'
import calendarUrl from '../assets/calendar.svg'
import profileUrl from '../assets/myprofile.svg'
import sunUrl from '../assets/sun.svg'
import moonUrl from '../assets/moon.svg'
import seedUrl from '../assets/seed.svg'
import seedlingUrl from '../assets/seedling.svg'
import grownUrl from '../assets/grown.svg'
import matureUrl from '../assets/mature.svg'
import waterUrl from '../assets/water.svg'
import temperatureUrl from '../assets/temperature.svg'
import settingsUrl from '../assets/settings.svg'
import alertsUrl from '../assets/alerts.svg'
import helpUrl from '../assets/help.svg'

const URLS = {
  home: homeUrl, myplants: plantsUrl, calendar: calendarUrl,
  myprofile: profileUrl, sun: sunUrl, moon: moonUrl,
  seed: seedUrl, seedling: seedlingUrl, grown: grownUrl,
  mature: matureUrl, water: waterUrl, temperature: temperatureUrl,
  settings: settingsUrl, alerts: alertsUrl, help: helpUrl,
}

function colorToFilter(color) {
  if (color === "#7A9E6E" || color === "#7a9e6e") return "invert(62%) sepia(20%) saturate(500%) hue-rotate(80deg) brightness(90%)"
  if (color === "#F2F0E8" || color === "#f2f0e8") return "invert(97%) sepia(5%) saturate(200%) hue-rotate(10deg)"
  if (color === "#1E2018" || color === "#1e2018") return "invert(8%) sepia(10%) saturate(500%) hue-rotate(60deg)"
  if (color === "#4A5244" || color === "#4a5244") return "invert(30%) sepia(10%) saturate(400%) hue-rotate(80deg)"
  return "none"
}

export function Icon({ name, size = 24, color = "#7A9E6E" }) {
  const url = URLS[name]
  return (
    <img
      src={url}
      width={size}
      height={size}
      style={{ filter: colorToFilter(color), flexShrink: 0 }}
    />
  )
}
