import FruitVeg from '../assets/icons/categories/fruit_veg.svg?react'
import Root from '../assets/icons/categories/root.svg?react'
import Onion from '../assets/icons/categories/onion.svg?react'
import Leafy from '../assets/icons/categories/leafy.svg?react'
import Legume from '../assets/icons/categories/legume.svg?react'
import Herb from '../assets/icons/categories/herb.svg?react'
import AnnualFlower from '../assets/icons/categories/annual_flower.svg?react'
import Perennial from '../assets/icons/categories/perennial.svg?react'
import Unknown from '../assets/icons/categories/unknown.svg?react'
import { CATEGORIES } from '../lib/categories'

// Kategoriikonerna ligger som SVG-filer i assets/icons/categories/.
// Idag tillfälliga från Phosphor (MIT); byt en fil mot en egen med samma namn
// och fill="currentColor", så tar den färg från omgivningen.
const ICONS = {
  fruit_veg: FruitVeg,
  root: Root,
  onion: Onion,
  leafy: Leafy,
  legume: Legume,
  herb: Herb,
  annual_flower: AnnualFlower,
  perennial: Perennial,
}

export default function CategoryIcon({ category, size = 18, color = 'currentColor', title }) {
  const Svg = ICONS[category] || Unknown
  const label = title ?? (CATEGORIES[category]?.label || 'Växt')
  return <Svg width={size} height={size} style={{ color, flexShrink: 0 }} role="img" aria-label={label} />
}
