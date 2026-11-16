// Sprint 6 (Purab): onboarding. Nigel (Nov 2): "the onboarding should route to the proper landing
// for the proper user type". Pick who you are joining as, confirm, and land on your own page:
//   resident -> map · business owner -> map as My business · parent / school / community group / library -> their workspace
//   City 311 staff, BIA coordinator, councillor -> the Requests work queue
// Sign-up and verification are simulated (illustrative demo accounts).
import { useEffect, useRef, useState } from 'react';
import { GROUP_LABEL, PERSONAS } from '../features/requests/personas';
import type { Persona } from '../features/requests/requests';
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

export function Welcome({ current, onJoin }: { current: Persona; onJoin: (p: Persona) => void }) {
  const [choice, setChoice] = useState<Persona | null>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (choice) confirmRef.current?.focus();
  }, [choice]);

  const groups = (['people', 'organizations', 'staff'] as const).map((g) => ({ g, people: PERSONAS.filter((p) => p.group === g) }));

  return (
    <div className="wl-page">
      <div className="wl-inner">
        <p className="wl-eyebrow">Welcome to Neighbr · Olde Riverside</p>
        <h1 className="wl-title">Who are you joining as?</h1>
        <p className="wl-lead">
          Pick one. You'll land on the page made for you, and you can change it any time with <strong>Viewing as</strong>. Sign-up is
          simulated for the demo.
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
              <h2 id={`wl-${g}`}>{GROUP_LABEL[g]}</h2>
              <ul className="wl-cards">
                {people.map((p) => (
                  <li key={p.id}>
                    <button type="button" className={`wl-card${p.id === current.id ? ' is-current' : ''}`} onClick={() => setChoice(p)}>
                      <span className="wl-card-title">{p.title.split(',')[0]}</span>
                      <span className="wl-card-name">{p.label.replace(/\s*\(demo\)/, '')}</span>
                      <span className="wl-card-text">{WHAT_YOU_DO[p.id]}</span>
                      {p.id === current.id && <span className="wl-card-tag">Current</span>}
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
