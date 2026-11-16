// Task 9: the signed-in demo user in the header, the Me / My business switch,
// and the optional "Show me on the map" toggle. Purab's top bar can drop this in as is.
import { ROLE_LABEL, initials, type Mode, type Profile } from './cardData';

interface Props {
  user: Profile; // the demo resident (profile-resident)
  business?: Profile; // the business they can act for (Rosa's Bakery, demo)
  /** KAN-37: the business owner's own profile, so My business reads "Rosa's Bakery, run by Rosa Alvarez". */
  owner?: Profile;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  showMe: boolean;
  onShowMeChange: (show: boolean) => void;
  /** Open the profile card of whoever the person is acting as (task: connect profile cards). */
  onOpenProfile?: (profileId: string) => void;
}

export function UserPresence({ user, business, owner, mode, onModeChange, showMe, onShowMeChange, onOpenProfile }: Props) {
  const acting = mode === 'business' && business ? business : user;
  const badge = acting.badge ?? ROLE_LABEL[acting.role];
  const actingFor = (owner ?? user).name.replace(/\s*\(demo\)/, '');
  return (
    <div className="up" aria-label="Signed in">
      <label className="up-showme" title="Show me on the map">
        <input type="checkbox" checked={showMe} onChange={(e) => onShowMeChange(e.target.checked)} />
        <svg className="up-showme-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        <span className="up-showme-text">Show me on the map</span>
      </label>

      {business && (
        <div role="group" aria-label="Use Neighbr as" className="up-switch">
          <button type="button" aria-pressed={mode === 'me'} onClick={() => onModeChange('me')}>
            Me
          </button>
          <button type="button" aria-label="My business" aria-pressed={mode === 'business'} onClick={() => onModeChange('business')}>
            <span className="up-long" aria-hidden="true">My business</span>
            <span className="up-short" aria-hidden="true">Business</span>
          </button>
        </div>
      )}

      {onOpenProfile ? (
        <button type="button" className="up-who up-who--button" title="Open your profile" onClick={() => onOpenProfile(acting.id)}>
        <span className={`up-avatar${mode === 'business' ? ' up-avatar--biz' : ''}`} aria-hidden="true">
          {initials(acting.name)}
        </span>
        <span className="up-name">
          {acting.name}
          {mode === 'business' && <span className="up-sub"> run by {actingFor}</span>}
        </span>
        {' '}
        <span className={`up-badge up-badge--${acting.role}`}>{badge}</span>
          <span className="up-sr">, open profile</span>
        </button>
      ) : (
        <span className="up-who">
        <span className={`up-avatar${mode === 'business' ? ' up-avatar--biz' : ''}`} aria-hidden="true">
          {initials(acting.name)}
        </span>
        <span className="up-name">
          {acting.name}
          {mode === 'business' && <span className="up-sub"> run by {actingFor}</span>}
        </span>
        {' '}
        <span className={`up-badge up-badge--${acting.role}`}>{badge}</span>
        </span>
      )}
    </div>
  );
}
