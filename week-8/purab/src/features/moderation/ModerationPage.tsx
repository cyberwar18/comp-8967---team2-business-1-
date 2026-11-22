// KAN-52 (Mounika): the Review page, for Neighbr staff only (#/review).
//   - Event permits: events in a public space (a park, a street) wait here after an organizer approves
//     them. Staff Approve, Decline with a reason, or Ask for more information.
//   - Reported content: chats, Marketplace listings and business posts that people reported. Staff Hide or Keep.
// Everyone else is told this page is for Neighbr staff. The data layer checks again (api.ts).
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { decidePermit, getPermitQueue, getReportQueue, onDataChange, resolveReport, type PermitItem } from '../../data/api';
import type { Persona } from '../requests/requests';
import {
  REASON_MAX,
  STAGE_LABEL,
  STEP_LABEL,
  fileSizeLabel,
  isNeighbrStaff,
  validateDecision,
  type PermitDecision,
} from './permits';
import {
  KIND_LABEL,
  STATUS_LABEL,
  canDecide,
  countByKind,
  filterQueue,
  type KindFilter,
  type QueueItem,
  type StatusFilter,
} from './reports';
import './Moderation.css';

const when = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};
const eventWhen = (start: string, end?: string) => {
  const s = new Date(start);
  const day = s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const t = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return end ? `${day}, ${t(s)} to ${t(new Date(end))}` : `${day}, ${t(s)}`;
};
const kindOf = (name: string) => (name.toLowerCase().endsWith('.pdf') ? 'PDF' : name.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG');

export default function ModerationPage({ persona }: { persona: Persona }) {
  if (!isNeighbrStaff(persona)) {
    return (
      <div className="mo-page">
        <h1 className="mo-h1">Review</h1>
        <p className="mo-muted" role="status">
          This page is for Neighbr staff. Use <strong>Viewing as</strong> to switch to Taylor Brooks, Neighbr staff.
        </p>
        <a className="mo-btn" href="#/map">
          Back to the map
        </a>
      </div>
    );
  }
  return <Review persona={persona} />;
}

type Tab = 'permits' | 'reports';

function Review({ persona }: { persona: Persona }) {
  const [tab, setTab] = useState<Tab>('permits');
  const [permits, setPermits] = useState<PermitItem[] | null>(null);
  const [reports, setReports] = useState<QueueItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    Promise.all([getPermitQueue(persona), getReportQueue(persona)])
      .then(([p, r]) => {
        setPermits(p);
        setReports(r);
      })
      .catch(() => setFailed(true));
  }, [persona]);
  useEffect(() => {
    load();
    return onDataChange(load);
  }, [load]);

  if (failed) return <p className="mo-page mo-error">The review queues could not be loaded.</p>;
  if (!permits || !reports) return <p className="mo-page">Loading the review queues…</p>;

  const waitingPermits = permits.filter((p) => p.permit.status === 'with-staff').length;
  const openReports = reports.filter((r) => r.status === 'open').length;
  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: 'permits', label: 'Event permits', n: waitingPermits },
    { id: 'reports', label: 'Reported content', n: openReports },
  ];

  return (
    <div className="mo-page">
      <header className="mo-head">
        <p className="mo-eyebrow">Neighbr staff · Olde Riverside</p>
        <h1 className="mo-h1">Review</h1>
        <p className="mo-muted">
          Events in public spaces need a permit before they go on the map. People can also report chats, listings and posts. Illustrative sample data.
        </p>
      </header>

      <div className="mo-tabs" role="tablist" aria-label="Review queues">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`mo-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`mo-panel-${t.id}`}
            className={`mo-tab${tab === t.id ? ' is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}{' '}
            <span className="mo-count" aria-label={`${t.n} waiting`}>
              {t.n}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`mo-panel-${tab}`} aria-labelledby={`mo-tab-${tab}`}>
        {tab === 'permits' ? <PermitsPanel persona={persona} items={permits} /> : <ReportsPanel persona={persona} items={reports} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- event permits

type PermitFilter = 'review' | 'waiting' | 'decided';
const PERMIT_FILTERS: { id: PermitFilter; label: string }[] = [
  { id: 'review', label: 'Needs review' },
  { id: 'waiting', label: 'Waiting for the group' },
  { id: 'decided', label: 'Decided' },
];

function PermitsPanel({ persona, items }: { persona: Persona; items: PermitItem[] }) {
  const [filter, setFilter] = useState<PermitFilter>('review');
  const [note, setNote] = useState('');
  const shown = items.filter((i) => (filter === 'review' ? i.permit.status === 'with-staff' : filter === 'waiting' ? i.permit.status === 'more-info' : i.permit.status === 'approved' || i.permit.status === 'declined'));
  const count = (f: PermitFilter) => items.filter((i) => (f === 'review' ? i.permit.status === 'with-staff' : f === 'waiting' ? i.permit.status === 'more-info' : i.permit.status === 'approved' || i.permit.status === 'declined')).length;

  return (
    <section aria-label="Event permits" className="mo-section">
      <div className="mo-chips" role="group" aria-label="Show permits">
        {PERMIT_FILTERS.map((f) => (
          <button key={f.id} type="button" className={`mo-chip${filter === f.id ? ' is-on' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} ({count(f.id)})
          </button>
        ))}
      </div>
      <div aria-live="polite">{note && <p className="mo-ok">{note}</p>}</div>
      {shown.length === 0 ? (
        <p className="mo-empty">{filter === 'review' ? 'No permits are waiting for you. Nice and quiet.' : filter === 'waiting' ? 'No permits are waiting for an answer from a group.' : 'No decisions yet.'}</p>
      ) : (
        <ul className="mo-list">
          {shown.map((i) => (
            <PermitCard key={i.event.id} persona={persona} item={i} onDone={setNote} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PermitCard({ persona, item, onDone }: { persona: Persona; item: PermitItem; onDone: (msg: string) => void }) {
  const { event: e, permit, orgName, placeName } = item;
  const uid = useId();
  const [form, setForm] = useState<null | 'decline' | 'ask'>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (form) areaRef.current?.focus();
  }, [form]);

  const run = async (decision: PermitDecision, why = '') => {
    setBusy(true);
    try {
      await decidePermit(persona, e.id, decision, why);
      setForm(null);
      setText('');
      setError('');
      onDone(
        decision === 'approve'
          ? `“${e.name}” is approved. It is public now and on the map until it ends. The group has been notified.`
          : decision === 'decline'
            ? `“${e.name}” was declined. The group has been notified, with your reason.`
            : `You asked the group about “${e.name}”. It comes back to you when they answer.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const sendForm = (ev: FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    const problem = validateDecision(form, text);
    if (problem) {
      setError(problem);
      areaRef.current?.focus();
      return;
    }
    void run(form, text);
  };

  const waiting = permit.status === 'with-staff';
  return (
    <li className="mo-card">
      <div className="mo-card-head">
        <h3 className="mo-card-title">{e.name}</h3>
        <span className={`mo-pill mo-pill--${permit.status}`}>{STAGE_LABEL[permit.status]}</span>
      </div>
      <p className="mo-meta">
        {orgName} · {eventWhen(e.start, e.end)} · {placeName}
      </p>
      <p className="mo-file">
        <strong>Permit:</strong> {permit.file.name} <span className="mo-muted">({kindOf(permit.file.name)}, {fileSizeLabel(permit.file.size)})</span>
      </p>
      {e.description && <p className="mo-text">{e.description}</p>}

      <details className="mo-steps">
        <summary>History ({permit.steps.length})</summary>
        <ol>
          {permit.steps.map((s, idx) => (
            <li key={idx}>
              <strong>{STEP_LABEL[s.action]}</strong> <span className="mo-muted">{when(s.at)}</span>
              {s.text && <span className="mo-quote">“{s.text}”</span>}
            </li>
          ))}
        </ol>
      </details>

      {waiting && !form && (
        <div className="mo-actions">
          <button type="button" className="mo-btn mo-btn--primary" disabled={busy} aria-label={`Approve the permit for ${e.name}`} onClick={() => void run('approve')}>
            Approve
          </button>
          <button type="button" className="mo-btn" aria-label={`Ask for more information about ${e.name}`} onClick={() => setForm('ask')}>
            Ask for more information
          </button>
          <button type="button" className="mo-btn mo-btn--danger" aria-label={`Decline the permit for ${e.name}`} onClick={() => setForm('decline')}>
            Decline
          </button>
        </div>
      )}
      {waiting && form && (
        <form className="mo-form" onSubmit={sendForm} noValidate aria-label={form === 'decline' ? `Decline ${e.name}` : `Ask about ${e.name}`}>
          <label htmlFor={`${uid}-t`}>{form === 'decline' ? 'Why is it declined? The group will read this.' : 'What do you need to know? The group will read this.'}</label>
          <textarea
            id={`${uid}-t`}
            ref={areaRef}
            rows={3}
            value={text}
            maxLength={REASON_MAX + 50}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${uid}-e` : undefined}
            onChange={(ev) => {
              setText(ev.target.value);
              setError('');
            }}
          />
          {error && (
            <p id={`${uid}-e`} className="mo-error" role="alert">
              {error}
            </p>
          )}
          <p className="mo-hint">The group sees “Neighbr staff”, not your name.</p>
          <div className="mo-actions">
            <button type="button" className="mo-btn" onClick={() => { setForm(null); setError(''); setText(''); }}>
              Cancel
            </button>
            <button type="submit" className={`mo-btn ${form === 'decline' ? 'mo-btn--danger' : 'mo-btn--primary'}`} disabled={busy}>
              {form === 'decline' ? 'Decline the permit' : 'Send the question'}
            </button>
          </div>
        </form>
      )}
      {!waiting && error && (
        <p className="mo-error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- reported content

const KIND_CHIPS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'chat', label: 'Chats' },
  { id: 'listing', label: 'Listings' },
  { id: 'post', label: 'Posts' },
];
const STATUS_CHIPS: { id: StatusFilter; label: string }[] = [
  { id: 'open', label: 'Needs a decision' },
  { id: 'decided', label: 'Decided' },
  { id: 'all', label: 'All' },
];

function ReportsPanel({ persona, items }: { persona: Persona; items: QueueItem[] }) {
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const counts = countByKind(items, status);
  const shown = filterQueue(items, kind, status);

  const decide = async (item: QueueItem, how: 'hidden' | 'kept') => {
    try {
      await resolveReport(persona, item.kind, item.id, how);
      setError('');
      setNote(
        how === 'hidden'
          ? `Hidden. ${item.kind === 'chat' ? 'The message is replaced for both people in the chat.' : item.kind === 'listing' ? 'The listing is off the Marketplace and the map.' : 'The post is off the map.'} The people involved have been notified.`
          : 'Kept up. The person who reported it has been notified.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work. Please try again.');
    }
  };

  return (
    <section aria-label="Reported content" className="mo-section">
      <div className="mo-chips" role="group" aria-label="Kind of content">
        {KIND_CHIPS.map((k) => (
          <button key={k.id} type="button" className={`mo-chip${kind === k.id ? ' is-on' : ''}`} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
            {k.label} ({counts[k.id]})
          </button>
        ))}
      </div>
      <div className="mo-chips" role="group" aria-label="Status">
        {STATUS_CHIPS.map((s) => (
          <button key={s.id} type="button" className={`mo-chip${status === s.id ? ' is-on' : ''}`} aria-pressed={status === s.id} onClick={() => setStatus(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div aria-live="polite">{note && <p className="mo-ok">{note}</p>}</div>
      {error && (
        <p className="mo-error" role="alert">
          {error}
        </p>
      )}
      {shown.length === 0 ? (
        <p className="mo-empty">{status === 'open' ? 'Nothing is waiting for a decision.' : 'No reports match.'}</p>
      ) : (
        <ul className="mo-list">
          {shown.map((i) => (
            <li key={i.key} className="mo-card">
              <div className="mo-card-head">
                <h3 className="mo-card-title">
                  <span className="mo-kind">{KIND_LABEL[i.kind]}</span> {i.kind === 'chat' ? '' : i.title}
                </h3>
                <span className={`mo-pill mo-pill--${i.status}`}>{STATUS_LABEL[i.status]}</span>
              </div>
              <p className="mo-meta">
                Reason: <strong>{i.reason}</strong> · {when(i.at)}
              </p>
              <blockquote className="mo-quote-block">{i.text || 'No text.'}</blockquote>
              {i.note && (
                <p className="mo-text">
                  <strong>Note from the person who reported it:</strong> {i.note}
                </p>
              )}
              <p className="mo-meta">
                {i.kind === 'chat' ? 'Written by' : 'Posted by'} {i.aboutName} · Reported by {i.reportedByName}
              </p>
              {canDecide(i) && (
                <div className="mo-actions">
                  <button type="button" className="mo-btn mo-btn--danger" aria-label={`Hide this ${KIND_LABEL[i.kind].toLowerCase()}`} onClick={() => void decide(i, 'hidden')}>
                    Hide
                  </button>
                  <button type="button" className="mo-btn" aria-label={`Keep this ${KIND_LABEL[i.kind].toLowerCase()} up`} onClick={() => void decide(i, 'kept')}>
                    Keep
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mo-hint">Only staff see who reported something. The person it is about is never told.</p>
    </section>
  );
}
