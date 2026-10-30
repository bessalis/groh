// Delade byggstenar. Stilarna ligger i styles/components.css.
// Kort är bara klasser: className="card", "card card--soft" osv.

const cx = (...parts) => parts.filter(Boolean).join(' ')

/**
 * Knapp.
 * variant: primary | secondary | ghost | danger | danger-ghost | link | feature | on-image
 * full: fyller hela bredden. large: lite högre och större text (huvudknappen på en sida).
 */
export function Button({ variant = 'secondary', full, large, className, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cx('btn', `btn--${variant}`, full && 'btn--full', large && 'btn--large', className)}
      {...props}
    />
  )
}

/**
 * Sektionsrubrik ("Tillväxtfas", "Att göra nu"). Skriv texten med vanlig
 * versal/gemen, versalerna kommer från CSS så att skärmläsare läser ord, inte bokstäver.
 * as: vilken rubriknivå (h2 som standard, h3 inuti ett kort som redan har en h2).
 */
export function SectionLabel({ as = 'h2', className, ...props }) {
  const Tag = as
  return <Tag className={cx('t-label', 'section-label', className)} {...props} />
}

const AI_TEXT = {
  ai_draft: 'Skrivet av AI och ännu inte granskat.',
  reviewed: 'Skrivet av AI och granskat.',
}

/**
 * AI-märkning, samma överallt. status: 'ai_draft' (standard) eller 'reviewed'.
 * children ersätter standardtexten när sammanhanget behöver mer förklaring.
 * box: visas i en mjuk salviaruta i stället för som en rad.
 */
export function AiNote({ status = 'ai_draft', box, className, style, children }) {
  const note = (
    <p className={cx('ai-note', 't-caption', !box && className)} style={box ? undefined : style}>
      <span className="ai-chip" aria-hidden="true">AI</span>
      <span>{children ?? AI_TEXT[status] ?? AI_TEXT.ai_draft}</span>
    </p>
  )
  if (!box) return note
  return <div className={cx('card', 'card--soft', 'card--compact', className)} style={style}>{note}</div>
}
