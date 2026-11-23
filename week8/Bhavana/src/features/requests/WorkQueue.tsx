// Sprint 5 (Bhavana): the organization workspace (institution dashboard) for City of Windsor 311
// and the Olde Riverside BIA. Staff see their work queue, open a request, acknowledge and assign
// it, ask for more information, send updates, decline with a reason, resolve, and publish the
// outcome to the shared map. A copy holder (the ward councillor) sees the same screen and can comment.
// Sprint 6: due dates and overdue warnings, oldest-first sorting, moving a request to another team
// with a reason, and comments from the councillor (Nigel, Nov 2).
import { useId, useState } from 'react';
import {
  ACTION_LABEL,
  STAFF_ACTIONS,
  can,
  dueText,
  filterQueue,
  overdueDays,
  queueCounts,
  type ActionId,
  type Persona,
  type QueueFilter,
  type QueueSort,
  type ServiceRequest,
} from './requests';
import { CategoryTile, RequestDetail, StateBadge, type RequestContext } from './RequestDetail';
import { useActions } from './useActions';

interface Props {
  persona: Persona;
  list: ServiceRequest[];
  selected: ServiceRequest | null;
  onSelect: (id: string | null) => void;
  ctx: RequestContext;
}

const FILTERS: { id: QueueFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'new', label: 'New' },
  { id: 'mine', label: 'Assigned to me' },
  { id: 'waiting', label: 'Waiting for reply' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

const plain = (s: string) => s.replace(/\s*\(demo\)/, '');

function age(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
}

export function WorkQueue({ persona, list, selected, onSelect, ctx }: Props) {
  const [filter, setFilter] = useState<QueueFilter>('open');
  const [sort, setSort] = useState<QueueSort>('recent');
  const sortId = useId();
  const me = ctx.staff.find((s) => s.id === persona.staffId);
  const org = plain(ctx.orgs[persona.profileId] ?? '');
  const counts = queueCounts(list);
  const shown = filterQueue(list, filter, persona, new Date(), sort);
  const filters = persona.kind === 'staff' ? FILTERS : FILTERS.filter((f) => f.id !== 'mine');

  return (
    <div className={`rq-layout${selected ? ' has-detail' : ''}`}>
      <section className="rq-list" aria-labelledby="rq-q-title">
        <p className="rq-eyebrow">{persona.kind === 'copy' ? 'Copies for your information' : 'Staff workspace'}</p>
        <h1 id="rq-q-title" className="rq-h1">
          {persona.kind === 'copy' ? `${org}: copies` : `${org}: work queue`}
        </h1>
        <p className="rq-muted">
          {persona.kind === 'copy'
            ? 'You get a copy of these requests to stay informed. You can read them, but only the organization handling each one can change it.'
            : `Signed in as ${plain(persona.label)}, ${me?.title ?? persona.title}${me?.lead ? ' (can assign and decline)' : ''}.`}
          {persona.kind === 'copy' && ' You can add comments that the City and the sender will see.'}
        </p>

        <ul className="rq-tiles rq-tiles--5" aria-label="Summary">
          <li>
            <strong>{counts.new}</strong> New or reopened
          </li>
          <li>
            <strong>{counts.working}</strong> In progress
          </li>
          <li>
            <strong>{counts.waiting}</strong> Waiting for reply
          </li>
          <li className={counts.overdue > 0 ? 'is-alert' : undefined}>
            <strong>{counts.overdue}</strong> Overdue
          </li>
          <li>
            <strong>{counts.closed}</strong> Closed
          </li>
        </ul>

        <div className="rq-chips" role="group" aria-label="Show">
          {filters.map((f) => (
            <button key={f.id} type="button" className="rq-chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="rq-sortrow">
          <label htmlFor={sortId}>Sort</label>
          <select id={sortId} value={sort} onChange={(e) => setSort(e.target.value as QueueSort)}>
            <option value="recent">Recently updated</option>
            <option value="oldest">Oldest first</option>
            <option value="supported">Most supported</option>
          </select>
        </div>

        {shown.length === 0 ? (
          <p className="rq-empty">Nothing here.</p>
        ) : (
          <ul className="rq-rows">
            {shown.map((r) => {
              const who = ctx.staff.find((s) => s.id === r.assigneeId);
              return (
                <li key={r.id}>
                  <button type="button" className={`rq-row${selected?.id === r.id ? ' is-on' : ''}`} aria-current={selected?.id === r.id ? 'true' : undefined} onClick={() => onSelect(r.id)}>
                    <CategoryTile r={r} />
                    <span className="rq-row-title">{r.title}</span>
                    <span className="rq-row-sub">
                      {ctx.placeName(r.placeId)} · {plain(r.requesterName)} · {age(r.createdAt)}
                    </span>
                    <span className="rq-row-end">
                      <StateBadge r={r} />
                      {overdueDays(r) > 0 && <span className="rq-row-due">{dueText(r)}</span>}
                      {(r.supporters?.length ?? 0) > 0 && <span className="rq-row-who">{1 + r.supporters!.length} neighbours</span>}
                      {who && <span className="rq-row-who">{plain(who.name)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="rq-pane" aria-label="Request details">
        {selected ? (
          <RequestDetail r={selected} persona={persona} ctx={ctx} onBack={() => onSelect(null)}>
            <StaffActions key={`${persona.id}-${selected.id}`} r={selected} persona={persona} ctx={ctx} />
          </RequestDetail>
        ) : (
          <p className="rq-empty rq-pane-empty">Choose a request from the queue.</p>
        )}
      </section>
    </div>
  );
}

const lockIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

function StaffActions({ r, persona, ctx }: { r: ServiceRequest; persona: Persona; ctx: RequestContext }) {
  const id = useId();
  const [text, setText] = useState('');
  const team = ctx.staff.filter((s) => s.orgProfileId === r.toProfile && !s.lead);
  const [assignee, setAssignee] = useState((team.find((s) => s.id !== r.assigneeId) ?? team[0])?.id ?? '');
  const reassigning = Boolean(r.assigneeId);
  const { act, busy, message, error } = useActions(r, persona, () => setText(''));

  // The lead of the organization: used to tell "not allowed for you" (shown locked)
  // apart from "not possible right now" (hidden).
  const lead = ctx.staff.find((s) => s.orgProfileId === r.toProfile && s.lead);
  const leadPersona: Persona = { id: 'lead', label: lead?.name ?? '', title: lead?.title ?? '', kind: 'staff', profileId: r.toProfile, staffId: lead?.id };
  const mine = (a: ActionId) => can(persona, r, a, ctx.staff, ctx.orgs);
  const possible = (a: ActionId) => can(leadPersona, r, a, ctx.staff, ctx.orgs).ok;

  const shown = STAFF_ACTIONS.filter((a) => possible(a) || mine(a).ok);
  const locked = shown.filter((a) => !mine(a).ok);
  const reasons = Array.from(new Set(locked.map((a) => mine(a).reason)));

  const button = (a: ActionId, extra?: () => void) => {
    const ok = mine(a).ok;
    const danger = a === 'decline';
    return (
      <button
        key={a}
        type="button"
        className={`rq-btn${a === 'acknowledge' || a === 'resolve' ? ' rq-btn--primary' : ''}${danger ? ' rq-btn--danger' : ''}${ok ? '' : ' is-locked'}`}
        aria-disabled={ok ? undefined : 'true'}
        disabled={busy}
        title={ok ? undefined : mine(a).reason}
        onClick={() => (extra ? extra() : act(a, { text }))}
      >
        {!ok && lockIcon}
        {a === 'assign' && reassigning ? 'Move to this team' : ACTION_LABEL[a]}
      </button>
    );
  };

  const writeActions = shown.filter((a) => a !== 'acknowledge' && a !== 'assign');

  return (
    <div className="rq-actions" aria-label="Staff actions">
      {(shown.includes('acknowledge') || shown.includes('assign')) && (
        <div className="rq-btns rq-assign">
          {shown.includes('acknowledge') && button('acknowledge')}
          {shown.includes('assign') && reassigning && <p className="rq-muted rq-fullrow">To move it to another team, choose the team and write the reason below.</p>}
          {shown.includes('assign') && (
            <>
              <label htmlFor={`${id}-who`} className="rq-sr">
                Assign to
              </label>
              <select id={`${id}-who`} value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={!mine('assign').ok}>
                {team.map((s) => (
                  <option key={s.id} value={s.id}>
                    {plain(s.name)}, {s.title}
                  </option>
                ))}
              </select>
              {button('assign', () => act('assign', { assigneeId: assignee, text }))}
            </>
          )}
        </div>
      )}

      {writeActions.length > 0 && (
        <>
          <label htmlFor={`${id}-msg`} className="rq-label">
            {persona.kind === 'copy' ? 'Your comment (the City and the sender will see it)' : `Message to ${plain(r.requesterName)}, or an internal note`}
          </label>
          <textarea id={`${id}-msg`} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. The crew will repair it on Thursday." />
          <div className="rq-btns">{writeActions.map((a) => button(a))}</div>
        </>
      )}

      {reasons.length > 0 && (
        <div className="rq-locked">
          {lockIcon}
          <div>
            <strong>Locked for you</strong>
            {reasons.map((why) => (
              <p key={why}>{why}</p>
            ))}
          </div>
        </div>
      )}
      {shown.length === 0 && <p className="rq-muted">Nothing to do: this request is closed.</p>}

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
