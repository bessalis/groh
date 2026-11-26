// Fröets illustration (sortens eller artens plansch) eller en platshållare.
// size: 'small' (listor) eller 'large' (fröets sida).

import CategoryIcon from './CategoryIcon'

export default function SeedImage({ image, name, size = 'small', className, style }) {
  if (!image) {
    return (
      <div className={`seed-image seed-image--empty ${className || ''}`} style={style} role="img" aria-label={`${name}, ingen bild än`}>
        <CategoryIcon category={null} size={size === 'large' ? 48 : 24} color="var(--text-subtle)" title="" />
      </div>
    )
  }
  return (
    <div className={`seed-image ${className || ''}`} style={style}>
      <img src={size === 'large' ? image.large : image.small} alt={name} loading={size === 'large' ? 'eager' : 'lazy'} decoding="async" />
    </div>
  )
}
