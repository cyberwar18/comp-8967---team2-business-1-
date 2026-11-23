// Sprint 5 (Purab): "My requests" for a resident or a business owner.
// Follow each request you sent: its status, the organization's updates, questions you need to
// answer, and what you can still do (reply, follow up, reopen within 14 days, withdraw).
import { useId, useState } from 'react';
import { ACTION_LABEL, REOPEN_DAYS, accessOf, can, isOpen, type ActionId, type Persona, type ServiceRequest } from './requests';
import { CategoryTile, RequestDetail, StateBadge, type RequestContext } from './RequestDetail';
import { useActions } from './useActions';

interface Props {
  persona: Persona;
  list: ServiceRequest[];
  selected: ServiceRequest | null;
  onSelect: (id: string | null) => void;
  ctx: RequestContext;
  now?: Date;
  /** Sprint 6: a heading of its own, e.g. "Requests we sent" for the BIA. */
  heading?: string;
}

export function MyRequests({ persona, list, selected, onSelect, ctx, now, heading }: Props) {
  const org = (ctx.orgs[persona.profileId] ?? '').replace(/\s*\(demo\)/, '');
  const title =
    heading ??
    (persona.id === 'business' ? 'My requests to the BIA' : persona.group === 'organizations' ? `Requests from ${org}` : 'My requests');
  const needReply = list.filter((r) => r.state === 'needs-info').length;
  return (
    <div className={`rq-layout${selected ? ' has-detail' : ''}`}>
      <section className="rq-list" aria-labelledby="rq-my-title">
        <h1 id="rq-my-title" className="rq-h1">
          {title}
        </h1>
        <p className="rq-muted">
          Everything you've sent, and what's happening with it. Private requests are seen only by you and the people handling them.
        </p>
        {needReply > 0 && (
          <p className="rq-callout" role="status">
            {needReply === 1 ? '1 request needs' : `${needReply} requests need`} an answer from you.
          </p>
        )}
        {list.length === 0 ? (
          <p className="rq-empty">
            Nothing yet. Use <strong>{persona.reportMode === 'business' ? 'Request help from the BIA' : 'Report a problem'}</strong> on the map.
          </p>
        ) : (
          <ul className="rq-rows">
            {list.map((r) => (
              <li key={r.id}>
                <button type="button" className={`rq-row${selected?.id === r.id ? ' is-on' : ''}`} aria-current={selected?.id === r.id ? 'true' : undefined} onClick={() => onSelect(r.id)}>
                  <CategoryTile r={r} />
                  <span className="rq-row-title">{r.title}</span>
                  <span className="rq-row-sub">
                    {ctx.placeName(r.placeId)} · to {ctx.orgs[r.toProfile]?.replace(/\s*\(demo\)/, '')}
                  </span>
                  <span className="rq-row-end">
                    <StateBadge r={r} />
                    {r.state === 'needs-info' && r.requesterId === persona.profileId && <span className="rq-flag">Answer needed</span>}
                    {r.supporters?.includes(persona.profileId) && <span className="rq-flag rq-flag--support">You support this</span>}
                    {r.state === 'resolved' && r.requesterId === persona.profileId && !r.rating && <span className="rq-flag">Was it fixed?</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rq-pane" aria-label="Request details">
        {selected ? (
          <RequestDetail r={selected} persona={persona} ctx={ctx} onBack={() => onSelect(null)}>
            <RequesterActions key={`${persona.id}-${selected.id}`} r={selected} persona={persona} ctx={ctx} now={now} />
          </RequestDetail>
        ) : (
          <p className="rq-empty rq-pane-empty">Choose a request to see its progress.</p>
        )}
      </section>
    </div>
  );
}

function RequesterActions({ r, persona, ctx, now }: { r: ServiceRequest; persona: Persona; ctx: RequestContext; now?: Date }) {
  const id = useId();
  const [text, setText] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const { act, busy, message, error } = useActions(r, persona, () => setText(''));
  const check = (a: ActionId) => can(persona, r, a, ctx.staff, ctx.orgs, now ?? new Date());
  const question = [...r.history].reverse().find((h) => h.action === 'ask-info')?.text;

  const primary: ActionId | null = check('reply').ok ? 'reply' : check('reopen').ok ? 'reopen' : check('follow-up').ok ? 'follow-up' : null;
  const reopenBlocked = r.state === 'resolved' && !check('reopen').ok ? check('reopen').reason : null;
  // Sprint 6: "Was it fixed?"
  const [notFixed, setNotFixed] = useState(false);
  const [ratingNote, setRatingNote] = useState('');

  if (accessOf(persona, r, ctx.staff) === 'supporter') {
    return (
      <div className="rq-actions" aria-label="What you can do">
        <p className="rq-muted">
          You added your support to this request. You'll get its updates; only the person who sent it and the people handling it can change it.
        </p>
      </div>
    );
  }

  return (
    <div className="rq-actions" aria-label="What you can do">
      {check('rate').ok && (
        <div className="rq-rate" role="group" aria-labelledby={`${id}-rate`}>
          <p id={`${id}-rate`} className="rq-label">
            Was it fixed?
          </p>
          {!notFixed ? (
            <div className="rq-btns">
              <button type="button" className="rq-btn rq-btn--primary" disabled={busy} onClick={() => act('rate', { rating: 'fixed', text: ratingNote })}>
                Yes, it's fixed
              </button>
              <button type="button" className="rq-btn" onClick={() => setNotFixed(true)}>
                No, it's not
              </button>
            </div>
          ) : (
            <>
              <label htmlFor={`${id}-rnote`} className="rq-muted">
                What is still wrong? (the City sees this)
              </label>
              <textarea id={`${id}-rnote`} rows={2} value={ratingNote} onChange={(e) => setRatingNote(e.target.value)} />
              <div className="rq-btns">
                <button type="button" className="rq-btn rq-btn--primary" disabled={busy} onClick={() => act('rate', { rating: 'not-fixed', text: ratingNote })}>
                  Send rating
                </button>
                <button type="button" className="rq-btn" onClick={() => setNotFixed(false)}>
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {r.rating && (
        <p className={`rq-rated rq-rated--${r.rating.value}`}>
          You said: {r.rating.value === 'fixed' ? "it's fixed" : "it's not fixed"}
          {r.rating.value === 'not-fixed' && check('reopen').ok && '. You can reopen it below.'}
        </p>
      )}
      {r.state === 'needs-info' && question && (
        <div className="rq-question">
          <span className="rq-tag">Question for you</span>
          <p>{question}</p>
        </div>
      )}
      {r.state === 'resolved' && (
        <p className="rq-muted">
          Marked resolved. If the problem is still there, you can reopen it for {REOPEN_DAYS} days.
        </p>
      )}
      {primary && (
        <>
          <label htmlFor={`${id}-msg`} className="rq-label">
            {primary === 'reply' ? 'Your answer' : primary === 'reopen' ? 'What is still wrong?' : 'Message to the people handling it'}
          </label>
          <textarea id={`${id}-msg`} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="rq-btns">
            <button type="button" className="rq-btn rq-btn--primary" disabled={busy} onClick={() => act(primary, { text })}>
              {ACTION_LABEL[primary]}
            </button>
            {isOpen(r.state) && !confirmWithdraw && (
              <button type="button" className="rq-btn" onClick={() => setConfirmWithdraw(true)}>
                Withdraw request
              </button>
            )}
          </div>
        </>
      )}
      {confirmWithdraw && (
        <div className="rq-confirm" role="group" aria-label="Withdraw this request?">
          <p>Withdraw this request? The people handling it will stop working on it.</p>
          <div className="rq-btns">
            <button type="button" className="rq-btn rq-btn--danger" disabled={busy} onClick={() => act('withdraw').then(() => setConfirmWithdraw(false))}>
              Yes, withdraw
            </button>
            <button type="button" className="rq-btn" onClick={() => setConfirmWithdraw(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}
      {reopenBlocked && <p className="rq-muted">{reopenBlocked}</p>}
      {!primary && !reopenBlocked && <p className="rq-muted">Nothing more to do here.</p>}
      <p className="rq-live" aria-live="polite">
        {message}
      </p>
      {error && (
        <p className="rq-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
