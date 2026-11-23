// Sprint 5: one request, as both sides see it (Purab and Bhavana).
// The header, the steps, "Who can see and change this" and the record are the same for everyone;
// only the actions underneath differ (requester actions or staff actions), passed in as children.
import type { ReactNode } from 'react';
import { Icon, categoryIcon } from '../../app/Icon';
import {
  ACTION_LABEL,
  STATE_LABEL,
  dueText,
  neighboursText,
  overdueDays,
  accessOf,
  accessSummary,
  formatAt,
  historyFor,
  stepsOf,
  type HistoryEntry,
  type OrgNames,
  type Persona,
  type ServiceRequest,
  type StaffMember,
} from './requests';

export interface RequestContext {
  staff: StaffMember[];
  orgs: OrgNames;
  placeName: (id?: string) => string;
}

const plain = (s: string) => s.replace(/\s*\(demo\)/, '');

/** Week 8 redesign: the category's icon on a tile coloured by where the request is. */
export function CategoryTile({ r, size = 40 }: { r: Pick<ServiceRequest, 'category' | 'state'>; size?: number }) {
  const tone =
    r.state === 'new' || r.state === 'reopened'
      ? 'brick'
      : r.state === 'needs-info'
        ? 'amber'
        : r.state === 'resolved'
          ? 'moss'
          : r.state === 'declined' || r.state === 'withdrawn'
            ? 'stone'
            : 'river';
  return (
    <span className={`rq-cat rq-cat--${tone}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon name={categoryIcon(r.category)} size={Math.round(size * 0.5)} />
    </span>
  );
}

export function StateBadge({ r }: { r: ServiceRequest }) {
  return <span className={`rq-badge rq-badge--${r.state}`}>{STATE_LABEL[r.state]}</span>;
}

/** What a history line says, in words. */
function entryText(h: HistoryEntry, viewerIsRequester: boolean): string {
  switch (h.action) {
    case 'created':
      return 'Sent the request';
    case 'blocked':
      return 'Blocked action';
    case 'acknowledge':
      return 'Received the request';
    case 'assign':
      if (h.text?.startsWith('Moved from')) return viewerIsRequester ? 'Passed it to another team' : 'Moved to another team';
      return viewerIsRequester ? 'Passed it to the team that will fix it' : 'Assigned';
    case 'comment':
      return 'Comment';
    case 'support':
      return 'A neighbour added their support';
    case 'rate':
      return 'Rated the result';
    default:
      return ACTION_LABEL[h.action];
  }
}

/** Requesters see the organization's name, not individual staff names. */
function whoText(h: HistoryEntry, r: ServiceRequest, viewerIsRequester: boolean, ctx: RequestContext, staffView = false, supporterView = false): string {
  const member = ctx.staff.find((s) => s.id === h.byId);
  // Senders see the organization only, never who handles it (Nigel, Nov 2).
  if (member && viewerIsRequester) return plain(ctx.orgs[member.orgProfileId] ?? 'Staff');
  if (member) return `${plain(member.name)}, ${member.title}`;
  // Supporters stay anonymous to everyone but staff.
  if (h.action === 'support') return staffView ? plain(h.byName) : 'Neighbour';
  if (supporterView && h.byId === r.requesterId) return 'The neighbour who sent it';
  return h.byId === r.requesterId ? plain(r.requesterName) : plain(h.byName);
}

export function RequestDetail({
  r,
  persona,
  ctx,
  children,
  onBack,
}: {
  r: ServiceRequest;
  persona: Persona;
  ctx: RequestContext;
  children?: ReactNode;
  onBack?: () => void;
}) {
  const access = accessOf(persona, r, ctx.staff);
  // A neighbour who supports it sees the same anonymous view as the sender: organizations, not names.
  const supporterView = access === 'supporter';
  const viewerIsRequester = access === 'requester';
  const senderView = viewerIsRequester || supporterView;
  const history = historyFor(persona, r, ctx.staff);
  const steps = stepsOf(r);
  const assignee = ctx.staff.find((s) => s.id === r.assigneeId);
  const to = plain(ctx.orgs[r.toProfile] ?? '');
  const cc = r.ccProfile ? plain(ctx.orgs[r.ccProfile] ?? '') : '';
  const staffView = access === 'lead' || access === 'staff';
  const due = staffView ? dueText(r) : '';
  const kindLabel = r.requesterKind === 'business' ? 'business' : r.requesterKind === 'organization' ? 'organization' : 'resident';

  return (
    <article className="rq-detail" aria-labelledby={`rq-title-${r.id}`}>
      {onBack && (
        <button type="button" className="rq-back" onClick={onBack}>
          <Icon name="arrowLeft" size={16} /> Back to the list
        </button>
      )}
      <div className="rq-detail-head">
        <CategoryTile r={r} size={56} />
        <div className="rq-detail-id">
          <p className="rq-eyebrow">
            {r.category} · {ctx.placeName(r.placeId)}
          </p>
          <h2 id={`rq-title-${r.id}`} className="rq-title" tabIndex={-1}>
            {r.title}
          </h2>
        </div>
      </div>
      <div className="rq-meta">
        <StateBadge r={r} />
        <span>Sent {formatAt(r.createdAt)}</span>
        <span>Updated {formatAt(r.updatedAt)}</span>
        {due && <span className={overdueDays(r) > 0 ? 'rq-overdue' : 'rq-due'}>{due}</span>}
        <span className={`rq-vis rq-vis--${r.public ? 'public' : 'private'}`}>{r.public ? 'On the map' : 'Private'}</span>
        {neighboursText(r) && <span className="rq-neigh">{neighboursText(r)}</span>}
      </div>
      {/* KAN-51 (Bhavana): the sender and the organization handling it can message each other. */}
      {(viewerIsRequester || staffView) && (
        <p className="rq-chat-link">
          <Icon name="chat" size={16} />
          <a href={`#/chats?request=${encodeURIComponent(r.id)}`}>{viewerIsRequester ? `Message ${to} about this request` : `Message the sender about this request`}</a>
        </p>
      )}

      <dl className="rq-facts">
        {senderView ? (
          <>
            <dt>Sent to</dt>
            <dd>
              {to}
              {cc && `, copy to ${cc}`}
            </dd>
          </>
        ) : (
          <>
            <dt>From</dt>
            <dd>
              {plain(r.requesterName)} ({kindLabel})
              {r.onBehalfOf && `, for ${plain(r.onBehalfOf)}`}
            </dd>
            <dt>Assigned to</dt>
            <dd>{assignee ? `${plain(assignee.name)}, ${assignee.title}` : 'Nobody yet'}</dd>
          </>
        )}
        {r.description && (
          <>
            <dt>Details</dt>
            <dd>{r.description}</dd>
          </>
        )}
        <dt>Who can see it</dt>
        <dd>{r.public ? 'Everyone: the sender posted it to the map' : 'Only the sender and the people handling it'}</dd>
        {r.point && (
          <>
            <dt>Spot</dt>
            <dd>Picked on the map ({r.point[1].toFixed(5)}, {r.point[0].toFixed(5)})</dd>
          </>
        )}
        {r.rating && (
          <>
            <dt>{viewerIsRequester ? 'Your rating' : "Sender's rating"}</dt>
            <dd>
              {r.rating.value === 'fixed' ? 'Fixed' : 'Not fixed'}
              {r.rating.text ? `: "${r.rating.text}"` : ''}
            </dd>
          </>
        )}
        {r.public && r.outcome && (
          <>
            <dt>Published outcome</dt>
            <dd>{r.outcome}</dd>
          </>
        )}
      </dl>

      {r.photo && (
        <figure className="rq-photo">
          <img src={r.photo} alt={`Photo sent with the request: ${r.title}`} />
          <figcaption>Photo from {viewerIsRequester ? 'you' : supporterView ? 'the neighbour who sent it' : plain(r.requesterName)}</figcaption>
        </figure>
      )}

      <ol className="rq-steps" aria-label={`Progress: ${STATE_LABEL[r.state]}`}>
        {steps.map((s) => (
          <li key={s.label} className={`rq-step rq-step--${s.state}`}>
            <span className="rq-step-dot" aria-hidden="true" />
            {s.label}
            <span className="rq-sr">{s.state === 'done' ? ' (done)' : s.state === 'current' ? ' (current)' : ''}</span>
          </li>
        ))}
      </ol>
      {(r.state === 'needs-info' || r.state === 'declined' || r.state === 'reopened' || r.state === 'withdrawn') && (
        <p className={`rq-branch rq-branch--${r.state}`}>
          {r.state === 'needs-info' && (viewerIsRequester ? 'They need more information from you. Answer below.' : 'Waiting for the person who sent it to answer a question.')}
          {r.state === 'declined' && (viewerIsRequester ? `${to} can't act on this. Their reason is in the record below.` : 'Declined. The reason was sent to the person who sent it.')}
          {r.state === 'reopened' && 'Reopened: the problem came back or was not fixed.'}
          {r.state === 'withdrawn' && 'Withdrawn by the person who sent it.'}
        </p>
      )}

      {children}

      <details className="rq-access" open={!viewerIsRequester}>
        <summary>Who can see and change this</summary>
        <ul>
          {accessSummary(r, ctx.staff, ctx.orgs, senderView)
            .map((row) => (supporterView && row.who === 'You (you sent it)' ? { ...row, who: 'The neighbour who sent it' } : row))
            .map((row) => (
            <li key={row.who}>
              <strong>{row.who}</strong>
              <span>{row.can}</span>
            </li>
          ))}
        </ul>
        <p className="rq-muted">Internal notes and blocked attempts are seen by staff only.</p>
      </details>

      <section className="rq-record" aria-labelledby={`rq-rec-${r.id}`}>
        <h3 id={`rq-rec-${r.id}`}>Record</h3>
        <ol>
          {history.map((h, i) => (
            <li key={i} className={`rq-entry${h.internal ? ' is-internal' : ''}${h.action === 'blocked' ? ' is-blocked' : ''}`}>
              <div className="rq-entry-head">
                <strong>{entryText(h, senderView)}</strong>
                <span>
                  {whoText(h, r, senderView, ctx, staffView, supporterView)} · {formatAt(h.at)}
                </span>
                {h.internal && <span className="rq-tag">{h.action === 'blocked' ? 'Staff only · blocked' : 'Internal note · staff only'}</span>}
              </div>
              {h.text && h.action !== 'created' && !(senderView && h.action === 'assign') && <p>{h.text}</p>}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

/** Shown when someone opens a request they are not allowed to see. */
export function NoAccess({ persona, onBack }: { persona: Persona; onBack?: () => void }) {
  return (
    <div className="rq-detail rq-noaccess" role="alert">
      <h2 className="rq-title">You don't have access to this request</h2>
      <p>
        You're viewing as <strong>{plain(persona.label)}</strong> ({persona.title}). Only the person who sent a request, the organization
        handling it and anyone given a copy can open it.
      </p>
      {onBack && (
        <button type="button" className="rq-btn" onClick={onBack}>
          Back to the list
        </button>
      )}
    </div>
  );
}
