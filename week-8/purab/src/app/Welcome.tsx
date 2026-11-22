// Sprint 6 (Purab): onboarding. Nigel (Nov 2): "the onboarding should route to the proper landing
// for the proper user type". Pick who you are joining as, confirm, and land on your own page:
//   resident -> map · business owner -> map as My business · parent / school / community group / library -> their workspace
//   City 311 staff, BIA coordinator, councillor -> the Requests work queue
// Sign-up and verification are simulated (illustrative demo accounts).
import { useEffect, useRef, useState } from 'react';
import { PERSONAS } from '../features/requests/personas';
import type { Persona } from '../features/requests/requests';
import { useT, type MsgKey } from './i18n';
import { Icon } from './Icon';
import './Welcome.css';

const LANDING_LABEL: Record<string, string> = {
  map: 'the shared map',
  requests: 'your work queue in Requests',
  community: 'your workspace in Community',
  review: 'the Review page (permits and reported content)',
};

const WHAT_YOU_DO: Record<string, string> = {
  resident: 'Report problems on your street, follow them to the end, and see what is happening nearby.',
  parent: "See your child's school notices, safe walking routes and roadwork alerts, and report problems.",
  business: 'Ask your BIA for help, post offers and updates, and follow your requests.',
  'community-organizer': 'Run events and volunteers for your group, and send requests to the City.',
  'school-staff': 'Post notices for parents, keep walking routes safe, and send requests to the City.',
  'library-staff': 'Share news from your branch and send requests to the City.',
  'city-lead': 'Receive residents’ requests, assign them to a team, and report back.',
  'city-crew': 'Work on the requests assigned to you and keep people updated.',
  'neighbr-staff': 'Approve event permits for public spaces, and decide on chats, listings and posts that people report.',
  'bia-lead': 'Answer your businesses’ requests, and send the BIA’s own requests to the City.',
  councillor: 'Get copies of requests in your ward and add comments.',
};

export function Welcome({ current, onJoin, onTour }: { current: Persona; onJoin: (p: Persona) => void; onTour?: () => void }) {
  const t = useT();
  const [choice, setChoice] = useState<Persona | null>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (choice) confirmRef.current?.focus();
  }, [choice]);

  const groups = (['people', 'organizations', 'staff'] as const).map((g) => ({ g, people: PERSONAS.filter((p) => p.group === g) }));

  return (
    <div className="wl-page">
      {/* Pitch redesign (Week 8): the first thing a new neighbour sees */}
      <section className="wl-hero" aria-labelledby="wl-hero-title">
        <div className="wl-hero-inner">
          <div className="wl-hero-copy">
            <p className="wl-kicker">{t('wl.kicker')}</p>
            <h1 id="wl-hero-title" className="wl-hero-title">
              {t('wl.title1')}
              <br />
              {t('wl.title2')}
            </h1>
            <p className="wl-hero-lead">{t('wl.lead')}</p>
            <ul className="wl-points">
              <li>{t('wl.p1')}</li>
              <li>{t('wl.p2')}</li>
              <li>{t('wl.p3')}</li>
            </ul>
            {/* Week 8: the guided tour and the public report card */}
            <div className="wl-cta">
              {onTour && (
                <button type="button" className="wl-cta-btn wl-cta-btn--lamp" onClick={onTour}>
                  <Icon name="sparkle" size={18} />
                  {t('wl.tour')}
                </button>
              )}
              <a className="wl-cta-btn" href="#/report-card">
                <Icon name="poll" size={18} />
                {t('wl.reportCard')}
              </a>
            </div>
          </div>
          <CorridorArt />
        </div>
      </section>

      <div className="wl-inner">
        <h2 className="wl-title">{t('wl.chooseTitle')}</h2>
        <p className="wl-lead">
          {t('wl.chooseLead')} <strong>{t('strip.viewingAs')}</strong>. {t('wl.chooseLead2')}
        </p>

        {choice ? (
          <section className="wl-confirm" aria-labelledby="wl-confirm-title">
            <h2 id="wl-confirm-title" ref={confirmRef} tabIndex={-1}>
              Join as {choice.label.replace(/\s*\(demo\)/, '')}
            </h2>
            <p className="wl-role">{choice.title}</p>
            <p>{WHAT_YOU_DO[choice.id]}</p>
            <ul className="wl-steps">
              <li>
                <strong>Account</strong> <span>Demo account, ready</span>
              </li>
              <li>
                <strong>Verification</strong>{' '}
                <span>{choice.group === 'people' ? 'Home area verified (simulated)' : 'Authority to act for the organization verified (simulated)'}</span>
              </li>
              <li>
                <strong>You'll land on</strong> <span>{LANDING_LABEL[choice.landing ?? 'map']}</span>
              </li>
            </ul>
            <div className="wl-actions">
              <button type="button" className="wl-btn wl-btn--primary" onClick={() => onJoin(choice)}>
                Continue
              </button>
              <button type="button" className="wl-btn" onClick={() => setChoice(null)}>
                Back
              </button>
            </div>
          </section>
        ) : (
          groups.map(({ g, people }) => (
            <section key={g} className="wl-group" aria-labelledby={`wl-${g}`}>
              <h2 id={`wl-${g}`}>{t(`group.${g}` as MsgKey)}</h2>
              <ul className="wl-cards">
                {people.map((p) => (
                  <li key={p.id}>
                    <button type="button" className={`wl-card wl-card--${g}${p.id === current.id ? ' is-current' : ''}`} onClick={() => setChoice(p)}>
                      <span className="wl-card-title">{p.title.split(',')[0]}</span>
                      <span className="wl-card-name">{p.label.replace(/\s*\(demo\)/, '')}</span>
                      <span className="wl-card-text">{WHAT_YOU_DO[p.id]}</span>
                      {p.id === current.id && <span className="wl-card-tag">{t('wl.current')}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * The Wyandotte St E corridor at dusk, drawn for the Welcome page: storefronts, street lamps and
 * the river, with three live pins (a fixed streetlight, an event and a shop that is open during
 * roadwork). Decorative only: everything it shows is also said in words on the page.
 */
function CorridorArt() {
  const shops = [
    { x: 18, w: 70, h: 128, c: '#a8452d' },
    { x: 92, w: 56, h: 168, c: '#8b3a26' },
    { x: 152, w: 78, h: 118, c: '#2f5d6e' },
    { x: 234, w: 60, h: 150, c: '#b45a35' },
    { x: 298, w: 84, h: 136, c: '#24485a' },
    { x: 386, w: 58, h: 176, c: '#97412b' },
    { x: 448, w: 74, h: 126, c: '#3a6b5c' },
  ];
  const ground = 250;
  const t = useT();
  return (
    <svg className="wl-art" viewBox="0 0 540 360" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="wl-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2c14e" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f2c14e" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* storefronts */}
      {shops.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={ground - b.h} width={b.w} height={b.h} rx="3" fill={b.c} />
          <rect x={b.x - 3} y={ground - b.h - 6} width={b.w + 6} height="7" rx="2" fill="#0a1a28" opacity="0.55" />
          {/* lit windows */}
          {Array.from({ length: Math.floor((b.h - 46) / 26) }).map((_, r) =>
            Array.from({ length: Math.max(2, Math.floor(b.w / 24)) }).map((__, c) => (
              <rect
                key={`${r}-${c}`}
                x={b.x + 9 + c * ((b.w - 18) / Math.max(2, Math.floor(b.w / 24)))}
                y={ground - b.h + 12 + r * 26}
                width="11"
                height="14"
                rx="1.5"
                fill={(i + r + c) % 3 === 0 ? '#f2c14e' : '#f6e2a8'}
                opacity={(i + r + c) % 3 === 0 ? 0.95 : 0.35}
              />
            )),
          )}
          {/* shop window and awning at street level */}
          <rect x={b.x + 7} y={ground - 34} width={b.w - 14} height="26" rx="2" fill="#fdf3d6" opacity="0.9" />
          <path d={`M${b.x + 4} ${ground - 40} h${b.w - 8} l-5 8 h${-(b.w - 18)} z`} fill="#0e2233" opacity="0.35" />
        </g>
      ))}
      {/* sidewalk, street and the river */}
      <rect x="0" y={ground} width="540" height="12" fill="#c9d3d9" />
      <rect x="0" y={ground + 12} width="540" height="40" fill="#1b3a52" />
      <path d={`M0 ${ground + 32} H540`} stroke="#f2c14e" strokeWidth="2.5" strokeDasharray="16 14" opacity="0.8" />
      <rect x="0" y={ground + 52} width="540" height="58" fill="#0b2a3f" />
      <path d={`M20 ${ground + 70} q30 -6 60 0 t60 0 M190 ${ground + 84} q30 -6 60 0 t60 0 M360 ${ground + 72} q30 -6 60 0 t60 0`} stroke="#4f86a6" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round" />
      {/* street lamps */}
      {[86, 232, 384].map((x) => (
        <g key={x}>
          <circle cx={x} cy={ground - 70} r="34" fill="url(#wl-glow)" />
          <rect x={x - 1.5} y={ground - 70} width="3" height="70" fill="#0a1a28" />
          <rect x={x - 7} y={ground - 76} width="14" height="7" rx="3" fill="#f2c14e" />
        </g>
      ))}
      {/* live pins */}
      <Pin x={120} y={ground - 182} fill="#23704a" label={t('wl.pinFixed')} />
      <Pin x={264} y={ground - 164} fill="#0d5f73" label={t('wl.pinMarket')} />
      <Pin x={414} y={ground - 190} fill="#9c4f05" label={t('wl.pinOpen')} />
    </svg>
  );
}

function Pin({ x, y, fill, label }: { x: number; y: number; fill: string; label: string }) {
  const w = label.length * 6.6 + 22;
  return (
    <g>
      <rect x={x - w / 2} y={y - 44} width={w} height="24" rx="12" fill="#ffffff" />
      <text x={x} y={y - 28} textAnchor="middle" fontSize="12" fontWeight="700" fill="#102233" fontFamily="inherit">
        {label}
      </text>
      <path d={`M${x} ${y + 22} c-12 -14 -16 -20 -16 -28 a16 16 0 0 1 32 0 c0 8 -4 14 -16 28z`} fill={fill} stroke="#ffffff" strokeWidth="2.5" />
      <circle cx={x} cy={y - 6} r="5.5" fill="#ffffff" />
    </g>
  );
}
