// The responsive shell (Purab): top bar with the main sections on desktop,
// bottom navigation on phones, and the signed-in demo user.
import type { ReactNode } from 'react';
import { ROUTES, hrefFor, type RouteId } from './routes';
import type { Profile } from '../data/api';
import './AppShell.css';

const ICONS: Record<RouteId, ReactNode> = {
  map: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />,
  requests: <path d="M4 13h4l2 3h4l2-3h4M4 13l2.5-8h11L20 13v6H4v-6Z" />,
  community: <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m18 0v-1a4 4 0 0 0-3-3.9M14 4.1a4 4 0 0 1 0 7.8M13.5 7.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
  updates: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8m4 12a2 2 0 0 0 4 0" />,
  chats: <path d="M4 5h16v11H9l-5 4V5Z" />,
  marketplace: <path d="M4 9h16l-1.5-5h-13L4 9Zm0 0v11h16V9M9 20v-6h6v6" />,
};

function Icon({ id }: { id: RouteId }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[id]}
    </svg>
  );
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
  children: ReactNode;
}

export function AppShell({ current, user, presence, demoBar, children }: Props) {
  const links = (variant: 'top' | 'bottom') =>
    ROUTES.map((r) => (
      <a
        key={r.id}
        href={hrefFor(r.id)}
        className={`shell-link shell-link--${variant}${r.id === current ? ' is-active' : ''}`}
        aria-current={r.id === current ? 'page' : undefined}
      >
        {variant === 'bottom' && <Icon id={r.id} />}
        <span>{r.label}</span>
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
