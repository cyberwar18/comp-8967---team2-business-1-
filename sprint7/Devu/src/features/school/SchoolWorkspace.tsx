// School workspace (KAN-43, Devu). Shown inside the Community section when the school is chosen.
//   - a roadwork alert when roadwork is near the school or one of its safe walking routes
//   - safe walking routes with their crosswalks, and a link that shows them on the map
//   - notices and events with an audience (public / all parents / one grade); only staff can post
//   - what's public and what's private: no student information is ever shown
// Sprint 6: the view follows "Viewing as" in the top bar (Public, Parent or School staff), the same switch
// the whole app uses. School staff can also send a request to the City (for example, a faded crosswalk).
// Everything is illustrative. New notices live in this page's memory until a refresh.
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { getMapData, getProfiles, getRequests, getSchoolNotices, getSchools, onDataChange, postSchoolNotice, submitReport } from '../../data/api';
import type { MapItem } from '../search/filters';
import type { Persona, ServiceRequest } from '../requests/requests';
import { phaseOf } from '../map/requestStatus';
import { formatWhen } from '../cards/cardData';
import {
  BODY_MAX,
  EMPTY_NOTICE,
  GRADES,
  EMPTY_SCHOOL_REQUEST,
  REQUEST_NOTE_MAX,
  ROLE_HELP,
  SCHOOL_REQUEST_TYPES,
  TITLE_MAX,
  audienceLabel,
  buildNotice,
  buildSchoolRequest,
  canPost,
  canSendRequest,
  noticesFor,
  publicRoadwork,
  requestPlaces,
  schoolAlert,
  schoolRoleFor,
  validateNotice,
  validateSchoolRequest,
  type Audience,
  type Notice,
  type NoticeDraft,
  type NoticeErrors,
  type School,
  type SchoolRequestDraft,
  type SchoolRequestErrors,
  type SchoolRole,
  type Viewer,
} from './schoolData';
import './School.css';

export function SchoolWorkspace({ today, persona }: { today?: Date; persona?: Persona }) {
  const [school, setSchool] = useState<School | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [updates, setUpdates] = useState<Parameters<typeof publicRoadwork>[0]>([]);
  const [failed, setFailed] = useState(false);
  const role = schoolRoleFor(persona); // follows "Viewing as"

  useEffect(() => {
    Promise.all([getSchools(), getSchoolNotices(), getMapData()])
      .then(([schools, ns, map]) => {
        setSchool(schools[0] ?? null);
        setNotices(ns);
        setUpdates(map.updates as unknown as Parameters<typeof publicRoadwork>[0]);
      })
      .catch(() => setFailed(true));
    // notices are kept by the adapter, so they survive a change of "Viewing as"
    return onDataChange(() => {
      getSchoolNotices().then(setNotices).catch(() => setFailed(true));
    });
  }, []);

  if (failed) return <p className="sw-status" role="alert">The school section could not load. Please refresh the page.</p>;
  if (!school) return <p className="sw-status">Loading the school section…</p>;

  return <Section school={school} notices={notices} setNotices={setNotices} updates={updates} role={role} persona={persona} today={today} />;
}

interface SectionProps {
  school: School;
  notices: Notice[];
  setNotices: (fn: (n: Notice[]) => Notice[]) => void;
  updates: Parameters<typeof publicRoadwork>[0];
  role: SchoolRole;
  persona?: Persona;
  today?: Date;
}

function Section({ school, notices, setNotices, updates, role, persona, today }: SectionProps) {
  const viewer: Viewer = { role, grades: role === 'parent' ? school.demo.parentGrades : [] };
  const roadworks = useMemo(() => publicRoadwork(updates), [updates]);
  const alert = useMemo(() => schoolAlert(school, roadworks), [school, roadworks]);
  const mapHref = `?c=${school.lng},${school.lat}&z=17&l=school,roadwork&pin=${school.id}#/map`;

  return (
    <section className="sw" aria-labelledby="sw-title">
      <div className="sw-head">
        <div>
          <h3 id="sw-title" className="sw-title">
            Getting to school safely, and school news
          </h3>
          <p className="sw-help">{ROLE_HELP[role]}</p>
        </div>
      </div>

      <p className="sw-viewas" role="status">
        <strong>Viewing as {persona ? persona.label.replace(/\s*\(demo\)/, '') : 'a visitor'}</strong>
        {persona ? `, ${persona.title}` : ''}. To see the school as a parent or as staff, change <strong>Viewing as</strong> in the top bar.
      </p>

      <section className={`sw-alert${alert.active ? ' is-on' : ''}`} aria-label="Roadwork alert">
        <p className="sw-alert-title">
          <span className="sw-alert-tag">{alert.active ? 'Roadwork alert' : 'All clear'}</span> {alert.headline}
        </p>
        {alert.lines.map((l) => (
          <p key={l} className="sw-alert-line">
            {l}
          </p>
        ))}
        {alert.advice && <p className="sw-alert-advice">{alert.advice}</p>}
      </section>

      <div className="sw-grid">
        <RoutesCard school={school} alert={alert} mapHref={mapHref} />
        <NoticesCard school={school} notices={notices} setNotices={setNotices} viewer={viewer} persona={persona} today={today} />
      </div>

      {canSendRequest(role) && persona && <RequestsCard school={school} persona={persona} role={role} />}

      <div className="sw-privacy">
        <h4>What's public and what's private</h4>
        <p>
          <strong>Anyone can see:</strong> the school's name, public notices and events, the safe walking routes and the roadwork alert.
        </p>
        <p>
          <strong>Parents also see:</strong> notices for all parents and for their own child's grade, nothing meant for other grades.
        </p>
        <p>
          <strong>Never shown:</strong> student names, student photos, parent contact details. <strong>Only staff can post.</strong>
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- routes

function RoutesCard({ school, alert, mapHref }: { school: School; alert: ReturnType<typeof schoolAlert>; mapHref: string }) {
  return (
    <section className="cw-card" aria-labelledby="sw-routes">
      <div className="cw-card-head">
        <h3 id="sw-routes">Safe walking routes</h3>
      </div>
      <p className="cw-muted">Illustrative routes to {school.name}. Cross only at the crosswalks.</p>
      <ul className="cw-list">
        {alert.statuses.map(({ route, affected, nearest }) => (
          <li key={route.id} className="sw-route">
            <div className="sw-route-body">
              <p className="cw-event-name">
                {route.name}: {route.from} to school
              </p>
              <p className="cw-event-meta">
                About {route.minutes} minutes · crosswalks: {route.crossings.map((c) => c.name).join(', ')}
              </p>
              {affected && nearest && <p className="sw-route-warn">Roadwork near this route: {nearest.roadwork.name}</p>}
            </div>
            <span className={`cw-pill ${affected ? 'cw-pill--pending' : 'cw-pill--upcoming'}`}>{affected ? 'Roadwork near' : 'Clear'}</span>
          </li>
        ))}
      </ul>
      <a className="cw-btn cw-btn--primary sw-maplink" href={mapHref}>
        Show the routes on the map
      </a>
    </section>
  );
}

// ---------------------------------------------------------------- notices

interface NoticesProps {
  school: School;
  notices: Notice[];
  setNotices: SectionProps['setNotices'];
  viewer: Viewer;
  persona?: Persona;
  today?: Date;
}

function NoticesCard({ school, notices, setNotices, viewer, persona, today }: NoticesProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [posted, setPosted] = useState<Notice | null>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const list = noticesFor(notices, school.id, viewer);

  useEffect(() => {
    if (posted) noteRef.current?.focus();
  }, [posted]);
  // Switching to a role that can't post closes the form and clears the message.
  useEffect(() => {
    if (!canPost(viewer.role)) {
      setFormOpen(false);
      setPosted(null);
    }
  }, [viewer.role]);

  return (
    <section className="cw-card" aria-labelledby="sw-notices">
      <div className="cw-card-head">
        <h3 id="sw-notices">Notices and events</h3>
        {canPost(viewer.role) && !formOpen && (
          <button type="button" className="cw-btn cw-btn--primary" onClick={() => { setFormOpen(true); setPosted(null); }}>
            Post a notice
          </button>
        )}
      </div>

      {viewer.role === 'public' && <p className="cw-muted">Some notices are only for parents. Choose Maya R., Resident and school parent in Viewing as to see them.</p>}
      {viewer.role === 'parent' && (
        <p className="cw-muted">
          Showing public notices, notices for all parents and notices for Grade {school.demo.parentGrades.join(', ')}.
        </p>
      )}
      {viewer.role !== 'staff' && <p className="cw-muted">Only school staff can post.</p>}

      {formOpen && canPost(viewer.role) && (
        <NoticeForm
          school={school}
          role={viewer.role}
          nextId={`sn-new-${notices.length + 1}`}
          today={today}
          onPost={(n) => {
            setNotices((all) => [...all, n]);
            postSchoolNotice(persona, n).catch(() => undefined); // kept for parents' notifications
            setFormOpen(false);
            setPosted(n);
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      <div aria-live="polite">
        {posted && (
          <p className="cw-note cw-note--ok" tabIndex={-1} ref={noteRef}>
            <strong>“{posted.title}” is posted.</strong> It is visible to: {audienceLabel(posted.audience)}.
          </p>
        )}
      </div>

      {list.length === 0 ? (
        <p className="cw-muted">Nothing posted yet.</p>
      ) : (
        <ul className="cw-list">
          {list.map((n) => (
            <li key={n.id} className="sw-notice">
              <div className="sw-notice-body">
                <p className="cw-event-name">
                  {n.title} <span className="sw-type">{n.type === 'event' ? 'Event' : 'Notice'}</span>
                </p>
                {n.date && <p className="cw-event-meta">{formatWhen(n.date)}</p>}
                <p className="sw-notice-text">{n.body}</p>
                <p className="sw-notice-by">Posted by {n.postedBy}</p>
              </div>
              <span className={`cw-pill ${n.audience === 'public' ? 'cw-pill--upcoming' : 'cw-pill--pending'}`}>{audienceLabel(n.audience)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface FormProps {
  school: School;
  role: SchoolRole;
  nextId: string;
  today?: Date;
  onPost: (n: Notice) => void;
  onCancel: () => void;
}

function NoticeForm({ school, role, nextId, today, onPost, onCancel }: FormProps) {
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const [draft, setDraft] = useState<NoticeDraft>(EMPTY_NOTICE);
  const [errors, setErrors] = useState<NoticeErrors>({});
  const firstRef = useRef<HTMLSelectElement>(null);
  useEffect(() => firstRef.current?.focus(), []);

  const set = (k: keyof NoticeDraft) => (e: { target: { value: string } }) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }) as NoticeDraft);
    setErrors(({ [k]: _gone, ...rest }) => rest);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateNotice(draft, today);
    setErrors(errs);
    const first = (Object.keys(errs) as (keyof NoticeDraft)[])[0];
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    onPost(buildNotice(draft, role, school, nextId, today));
  };

  const err = (k: keyof NoticeDraft) =>
    errors[k] ? (
      <p id={id(`${k}-err`)} className="cw-error">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: keyof NoticeDraft) => ({ id: id(k), 'aria-invalid': errors[k] ? true : undefined, 'aria-describedby': errors[k] ? id(`${k}-err`) : undefined });

  const audiences: Audience[] = ['public', 'parents', ...GRADES.map((g) => `grade-${g}` as Audience)];

  return (
    <form className="cw-form" onSubmit={submit} noValidate aria-label="Post a notice">
      <p className="cw-form-private">Only staff can post. Choose who can see it. Never include student names.</p>

      <label htmlFor={id('type')}>What are you posting?</label>
      <select ref={firstRef} value={draft.type} onChange={set('type')} {...a11y('type')}>
        <option value="notice">A notice</option>
        <option value="event">An event</option>
      </select>

      <label htmlFor={id('title')}>Title</label>
      <input type="text" value={draft.title} onChange={set('title')} {...a11y('title')} />
      {err('title')}

      {draft.type === 'event' && (
        <div className="cw-form-row sw-form-row">
          <div>
            <label htmlFor={id('date')}>Date</label>
            <input type="date" value={draft.date} onChange={set('date')} {...a11y('date')} />
            {err('date')}
          </div>
          <div>
            <label htmlFor={id('time')}>Starts</label>
            <input type="time" value={draft.time} onChange={set('time')} {...a11y('time')} />
            {err('time')}
          </div>
        </div>
      )}

      <label htmlFor={id('body')}>Message</label>
      <textarea rows={3} value={draft.body} onChange={set('body')} {...a11y('body')} />
      <p className={`cw-count${draft.body.length > BODY_MAX ? ' is-over' : ''}`}>
        {draft.body.length} / {BODY_MAX}
      </p>
      {err('body')}

      <label htmlFor={id('audience')}>Who can see it</label>
      <select value={draft.audience} onChange={set('audience')} {...a11y('audience')}>
        {audiences.map((a) => (
          <option key={a} value={a}>
            {audienceLabel(a)}
          </option>
        ))}
      </select>

      <div className="cw-form-actions">
        <button type="button" className="cw-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="cw-btn cw-btn--primary">
          Post
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- requests to the City (staff)

function RequestsCard({ school, persona, role }: { school: School; persona: Persona; role: SchoolRole }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<{ id: string; title: string; to: string } | null>(null);
  const [mine, setMine] = useState<ServiceRequest[]>([]);
  const [issues, setIssues] = useState<MapItem[]>([]);
  const noteRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const load = () =>
      Promise.all([getRequests(persona), getMapData()]).then(([rs, map]) => {
        setMine(rs);
        setIssues(map.updates);
      });
    load();
    return onDataChange(() => void load());
  }, [persona]);
  useEffect(() => {
    if (sent) noteRef.current?.focus();
  }, [sent]);

  const phaseFor = (r: ServiceRequest) => {
    const pin = issues.find((i) => i.id === r.issueId);
    return pin ? phaseOf(pin)?.label : undefined;
  };

  return (
    <section className="cw-card sw-requests" aria-labelledby="sw-requests-title">
      <div className="cw-card-head">
        <h3 id="sw-requests-title">Requests to the City</h3>
        {!open && (
          <button type="button" className="cw-btn cw-btn--primary" onClick={() => { setOpen(true); setSent(null); }}>
            Send a request to the City
          </button>
        )}
      </div>
      <p className="cw-muted">
        For problems near the school, such as a faded crosswalk. It goes to City of Windsor 311, with a copy to the ward councillor. You choose whether it is
        private or on the map; the outcome is shown on the map only if you put it there.
      </p>

      {open && (
        <RequestForm
          school={school}
          persona={persona}
          role={role}
          onSent={(r) => {
            setOpen(false);
            setSent(r);
          }}
          onCancel={() => setOpen(false)}
        />
      )}

      <div aria-live="polite">
        {sent && (
          <p className="cw-note cw-note--ok" tabIndex={-1} ref={noteRef}>
            <strong>“{sent.title}” was sent to {sent.to}.</strong> Follow it under{' '}
            <a href={`#/requests?id=${encodeURIComponent(sent.id)}`}>Requests</a>.
          </p>
        )}
      </div>

      {mine.length > 0 && (
        <ul className="cw-list" aria-label="Requests your school sent">
          {mine.map((r) => (
            <li key={r.id} className="sw-notice">
              <div className="sw-notice-body">
                <p className="cw-event-name">{r.title}</p>
                <p className="cw-event-meta">
                  {r.category} · <a href={`#/requests?id=${encodeURIComponent(r.id)}`}>Open request</a>
                  {r.issueId && (
                    <>
                      {' '}
                      · <a href={`?pin=${encodeURIComponent(r.issueId)}#/map`}>See on the map</a>
                    </>
                  )}
                </p>
              </div>
              <span className="cw-pill cw-pill--pending">{phaseFor(r) ?? r.state}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RequestForm({
  school,
  persona,
  role,
  onSent,
  onCancel,
}: {
  school: School;
  persona: Persona;
  role: SchoolRole;
  onSent: (r: { id: string; title: string; to: string }) => void;
  onCancel: () => void;
}) {
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const [draft, setDraft] = useState<SchoolRequestDraft>(EMPTY_SCHOOL_REQUEST);
  const [errors, setErrors] = useState<SchoolRequestErrors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const firstRef = useRef<HTMLSelectElement>(null);
  useEffect(() => firstRef.current?.focus(), []);
  const places = requestPlaces(school);

  const set = (k: keyof SchoolRequestDraft) => (e: { target: { value: string } }) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }));
    setErrors(({ [k]: _gone, ...rest }) => rest);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateSchoolRequest(school, draft);
    setErrors(errs);
    const first = (Object.keys(errs) as (keyof SchoolRequestDraft)[])[0];
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const profiles = await getProfiles();
      const report = buildSchoolRequest(school, draft, persona.profileId, profiles, role, `school-req-${Date.now().toString(36)}`);
      await submitReport(report as unknown as MapItem);
      onSent({ id: `req-${report.id}`, title: report.name, to: report.routedTo });
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  const err = (k: keyof SchoolRequestDraft) =>
    errors[k] ? (
      <p id={id(`${k}-err`)} className="cw-error">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: keyof SchoolRequestDraft) => ({ id: id(k), 'aria-invalid': errors[k] ? true : undefined, 'aria-describedby': errors[k] ? id(`${k}-err`) : undefined });

  return (
    <form className="cw-form" onSubmit={submit} noValidate aria-label="Send a request to the City">
      <p className="cw-form-private">Goes to City of Windsor 311, with a copy to the ward councillor. Never include student names.</p>

      <label htmlFor={id('typeId')}>What is the problem?</label>
      <select ref={firstRef} value={draft.typeId} onChange={set('typeId')} {...a11y('typeId')}>
        <option value="">Choose…</option>
        {SCHOOL_REQUEST_TYPES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      {err('typeId')}

      <label htmlFor={id('placeId')}>Where is it?</label>
      <select value={draft.placeId} onChange={set('placeId')} {...a11y('placeId')}>
        <option value="">Choose…</option>
        {places.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {err('placeId')}

      <label htmlFor={id('note')}>Details (optional)</label>
      <textarea rows={3} value={draft.note} onChange={set('note')} {...a11y('note')} />
      <p className={`cw-count${draft.note.length > REQUEST_NOTE_MAX ? ' is-over' : ''}`}>
        {draft.note.length} / {REQUEST_NOTE_MAX}
      </p>
      {err('note')}

      {/* Nigel (Nov 2): the sender decides whether it goes on the map (Purab, Sprint 6) */}
      <fieldset className="sw-share">
        <legend>Who can see it?</legend>
        <label>
          <input type="radio" name={id('share')} checked={draft.share !== 'public'} onChange={() => setDraft((d) => ({ ...d, share: 'private' }))} /> Send
          privately <small>(only the school and the people handling it)</small>
        </label>
        <label>
          <input type="radio" name={id('share')} checked={draft.share === 'public'} onChange={() => setDraft((d) => ({ ...d, share: 'public' }))} /> Post to
          the map <small>(parents and neighbours can follow it)</small>
        </label>
      </fieldset>

      {failed && (
        <p className="cw-error" role="alert">
          The request could not be sent. Please try again.
        </p>
      )}
      <div className="cw-form-actions">
        <button type="button" className="cw-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="cw-btn cw-btn--primary" disabled={busy}>
          Send to the City
        </button>
      </div>
    </form>
  );
}
