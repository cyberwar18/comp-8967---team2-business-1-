// Sprint 5 (Purab): "Viewing as", the simulated sign-in for the demo.
// Pick who you are (resident, business owner, City 311 staff, BIA coordinator, councillor) and
// every screen acts for that person, so one request can be followed by everyone who touches it.
import { useId } from 'react';
import { GROUP_LABEL, PERSONAS } from '../features/requests/personas';
import type { Persona } from '../features/requests/requests';

interface Props {
  persona: Persona;
  onChange: (p: Persona) => void;
  /** Sprint 6: forget everything done in this browser and start again. */
  onReset?: () => void;
}

export function ViewAs({ persona, onChange, onReset }: Props) {
  const id = useId();
  return (
    <div className="viewas" role="region" aria-label="Demo sign-in">
      <span className="viewas-tag">Demo</span>
      <label htmlFor={id}>Viewing as</label>
      <select
        id={id}
        value={persona.id}
        onChange={(e) => onChange(PERSONAS.find((p) => p.id === e.target.value) ?? PERSONAS[0])}
      >
        {(['people', 'organizations', 'staff'] as const).map((g) => (
          <optgroup key={g} label={GROUP_LABEL[g]}>
            {PERSONAS.filter((p) => p.group === g).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label.replace(/\s*\(demo\)/, '')}, {p.title.split(',')[0]}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="viewas-note">Sign-in is simulated so one request can be followed by everyone involved.</span>
      <span className="viewas-actions">
        <a href="#/welcome">Sign up as someone else</a>
        {onReset && (
          <button type="button" onClick={onReset}>
            Reset demo
          </button>
        )}
      </span>
    </div>
  );
}

/** A plain name badge for staff and organizations, shown in the top bar instead of the Me / My business switch. */
export function StaffBadge({ persona }: { persona: Persona }) {
  const initials = persona.label
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="up" role="group" aria-label={`Signed in as ${persona.label}, ${persona.title}`}>
      <span className="up-who">
        <span className="up-avatar up-avatar--staff" aria-hidden="true">
          {initials}
        </span>
        <span className="up-name">{persona.label.replace(/\s*\(demo\)/, '')}</span>{' '}
        <span className="up-badge up-badge--city">{persona.title.split(',')[0]}</span>
      </span>
    </div>
  );
}
