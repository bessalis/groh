// Färgdutten på ett odlingskärl. Färgen kommer från tokens (--mark-*).
export default function MarkDot({ color, large }) {
  return <span className={`mark-dot${large ? ' mark-dot--lg' : ''}`} data-color={color} aria-hidden="true" />
}
