import { describePatch } from '../lib/duplicates'

// Visas när en skannad påse verkar vara samma växt som ett frö användaren redan har.
// choice: 'merge' (komplettera det befintliga) eller 'new' (spara som en ny påse).
export default function DuplicateChoice({ existing, choice, onChoose, patch, alreadyBy = null, name = 'dup' }) {
  const title = [existing.name, existing.cultivar && `'${existing.cultivar}'`].filter(Boolean).join(' ')
  const fills = describePatch(patch)
  return (
    <div className="card card--soft card--compact" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p className="t-small" style={{ margin: 0 }}><strong>Du har redan {title}</strong> i Fröarkivet.</p>
      <div className="chips" role="radiogroup" aria-label={`Vad ska hända med påsen? ${title}`}>
        <button type="button" role="radio" className="chip" aria-checked={choice === 'merge'} onClick={() => onChoose('merge')} name={name}>Komplettera det du har</button>
        <button type="button" role="radio" className="chip" aria-checked={choice === 'new'} onClick={() => onChoose('new')} name={name}>Spara som ny påse</button>
      </div>
      <p className="field-hint">
        {choice === 'merge'
          ? (alreadyBy ? `Påse ${alreadyBy} kompletterar redan samma frö. Den här fyller bara i det som då fortfarande saknas.`
            : fills ? `Fyller i ${fills}. Det du själv har skrivit ändras inte.` : 'Påsen har inget nytt att fylla i, men räknas som granskad.')
          : 'Blir ett eget frö i arkivet, till exempel en ny årgång eller en annan fröfirma.'}
      </p>
    </div>
  )
}
