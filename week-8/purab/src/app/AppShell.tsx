// The responsive shell (Purab): top bar with the main sections on desktop,
// bottom navigation on phones, and the signed-in demo user.
import type { ReactNode } from 'react';
import { ROUTES, hrefFor, type RouteId } from './routes';
import type { Profile } from '../data/api';
import { Icon, SECTION_ICON } from './Icon';
import { useT, type MsgKey } from './i18n';
import './AppShell.css';

// Pitch redesign: the sections use the shared icon set (src/app/Icon.tsx), on desktop too.
function SectionIcon({ id, size }: { id: RouteId; size: number }) {
  return <Icon name={SECTION_ICON[id]} size={size} />;
}

function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface Props {
  current: RouteId;
  user: Profile | null;
  /** Optional replacement for the user area, e.g. the Me / My business switch (Bhavana, task 9). */
  presence?: ReactNode;
  /** Sprint 5: the demo "Viewing as" strip under the top bar (simulated sign-in). */
  demoBar?: ReactNode;
  /** KAN-52: Neighbr staff also get the Review page in the top bar. */
  showStaffPages?: boolean;
  children: ReactNode;
}

export function AppShell({ current, user, presence, demoBar, showStaffPages = false, children }: Props) {
  const t = useT(); // Week 8: section names in English or French
  const links = (variant: 'top' | 'bottom') =>
    ROUTES.filter((r) => !r.staffOnly || showStaffPages || r.id === current).map((r) => (
      <a
        key={r.id}
        href={hrefFor(r.id)}
        className={`shell-link shell-link--${variant}${r.id === current ? ' is-active' : ''}`}
        aria-current={r.id === current ? 'page' : undefined}
      >
        <SectionIcon id={r.id} size={variant === 'bottom' ? 22 : 17} />
        <span>{t(`nav.${r.id}` as MsgKey)}</span>
      </a>
    ));

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="shell-top">
        <a className="shell-brand" href={hrefFor('map')}>
          <span className="shell-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
          </span>
          <span className="shell-name">Neighbr</span>
          {' '}
          <span className="shell-place">Olde Riverside</span>
          {/* a11y check: the link's name now includes its visible text (WCAG 2.5.3 Label in Name) */}
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>, go to the map</span>
        </a>
        <nav aria-label="Main" className="shell-nav-top">
          {links('top')}
        </nav>
        {presence ?? (user && (
          <div className="shell-user" aria-label={`Signed in as ${user.name}`}>
            <span className="shell-avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
            <span className="shell-user-text">
              <span className="shell-user-name">{user.name}</span>
              {user.badge && <span className="shell-badge">{user.badge}</span>}
            </span>
          </div>
        ))}
      </header>
      {demoBar}

      <main id="main" className="shell-main">
        {children}
      </main>

      <nav aria-label="Main" className="shell-nav-bottom">
        {links('bottom')}
      </nav>
    </div>
  );
}

/** Page for sections that arrive in later milestones. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <section className="coming-soon">
      <h1>{title}</h1>
      <p>This section arrives in a later milestone. For now, everything happens on the shared map.</p>
      <a href={hrefFor('map')} className="coming-soon-btn">
        Back to the map
      </a>
    </section>
  );
}
