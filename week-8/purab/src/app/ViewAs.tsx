// Sprint 5 (Purab): "Viewing as", the simulated sign-in for the demo.
// Pick who you are (resident, business owner, City 311 staff, BIA coordinator, councillor) and
// every screen acts for that person, so one request can be followed by everyone who touches it.
import { useId } from 'react';
import { PERSONAS } from '../features/requests/personas';
import { useLang, useT, type MsgKey } from './i18n';
import type { Persona } from '../features/requests/requests';

interface Props {
  persona: Persona;
  onChange: (p: Persona) => void;
  /** Sprint 6: forget everything done in this browser and start again. */
  onReset?: () => void;
  /** Week 8: start the guided tour. */
  onTour?: () => void;
}

export function ViewAs({ persona, onChange, onReset, onTour }: Props) {
  const id = useId();
  const t = useT();
  const { lang, setLang } = useLang();
  return (
    <div className="viewas" role="region" aria-label={t('strip.region')}>
      <span className="viewas-tag">{t('strip.demo')}</span>
      <label htmlFor={id}>{t('strip.viewingAs')}</label>
      <select
        id={id}
        value={persona.id}
        onChange={(e) => onChange(PERSONAS.find((p) => p.id === e.target.value) ?? PERSONAS[0])}
      >
        {(['people', 'organizations', 'staff'] as const).map((g) => (
          <optgroup key={g} label={t(`group.${g}` as MsgKey)}>
            {PERSONAS.filter((p) => p.group === g).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label.replace(/\s*\(demo\)/, '')}, {p.title.split(',')[0]}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="viewas-note">{t('strip.note')}</span>
      <span className="viewas-actions">
        {/* Week 8: English or French (Canada's official languages) */}
        <span className="viewas-lang" role="group" aria-label={t('strip.language')}>
          <button type="button" aria-pressed={lang === 'en'} title="English" lang="en" onClick={() => setLang('en')}>
            EN
          </button>
          <button type="button" aria-pressed={lang === 'fr'} title="Français" lang="fr" onClick={() => setLang('fr')}>
            FR
          </button>
        </span>
        {onTour && (
          <button type="button" className="viewas-tour" onClick={onTour}>
            {t('strip.tour')}
          </button>
        )}
        {/* KAN-50 (Purab): profile and settings for whoever is chosen */}
        <a href="#/profile">{t('strip.profile')}</a>
        <a href="#/welcome">{t('strip.signup')}</a>
        {onReset && (
          <button type="button" onClick={onReset}>
            {t('strip.reset')}
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
