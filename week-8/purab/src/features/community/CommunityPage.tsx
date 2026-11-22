// Community organization workspace (KAN-42, Mounika).
// One page in the shell (#/community) where a community group, food bank, school or library has:
//   - its events, with "Create event" (new events stay private until an organizer approves them)
//   - volunteer roles that residents can sign up for
//   - a members list with the same search and chips as the map
// KAN-48 (Mounika) connects it to the rest of the journey:
//   - who you are comes from "Viewing as" in the top bar (no separate switch on this page)
//   - members can send a request to the City for their group (it comes from the person)
//   - approved events with a place become pins on the shared map until they are over
//   - the library posts service changes ("Closed Wednesday") that show on the map
// KAN-52 (Mounika): an event in a public space (a park, a street) needs a permit. It is uploaded with the
// event, an organizer approves it, then Neighbr staff approve the permit before it goes on the map.
// Everything is illustrative demo data. New events, requests and service changes are kept by
// src/data/api.ts until a refresh; volunteer sign-ups stay in this page's memory.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  answerPermit,
  approveOrgEvent,
  getOrgEvents,
  getOrgMembers,
  getOrgPosts,
  getOrganizations,
  getPlaces,
  getProfiles,
  getVolunteerRoles,
  getWards,
  onDataChange,
  submitOrgEvent,
  submitOrgPost,
  submitReport,
} from '../../data/api';
import type { MapItem } from '../search/filters';
import { SearchBar } from '../search/SearchBar';
import { FilterChips } from '../search/FilterChips';
import { RESIDENT_TYPES, buildReport, plainName, routeFor, validateDraft, type DraftErrors, type ReportDraft } from '../report/routing';
import type { CardData } from '../cards/cardData';
import type { Persona } from '../requests/requests';
import {
  EMPTY_DRAFT,
  EMPTY_POST,
  EVENT_NAME_MAX,
  EVENT_NOTE_MAX,
  POST_MESSAGE_MAX,
  POST_TITLE_MAX,
  ROLE_CHIPS,
  ROLE_LABEL,
  buildEvent,
  buildPost,
  canApprove,
  canPost,
  canSeeMembers,
  canSignUp,
  cancelSignUp,
  eventOnMap,
  eventsFor,
  filterMembers,
  formatWhen,
  isOver,
  isPending,
  isSignedUp,
  memberFor,
  membersOf,
  postIsActive,
  postsFor,
  roleCounts,
  rolesFor,
  signUp,
  spotsLeft,
  validateEvent,
  validatePost,
  type CommunityData,
  type EventDraft,
  type EventErrors,
  type OrgEvent,
  type OrgMember,
  type Organization,
  type PostDraft,
  type PostErrors,
  type RoleChip,
} from './communityData';
import {
  PERMIT_EXTENSIONS,
  STAGE_LABEL,
  STEP_LABEL,
  canAnswer,
  fileSizeLabel,
  latestMessage,
  needsPermit,
  newPermit,
  validatePermitFile,
  type PermitFile,
} from '../moderation/permits';
import '../search/SearchAndFilters.css';
import './Community.css';
import { SchoolWorkspace } from '../school/SchoolWorkspace';

interface Props {
  /** Who the demo is signed in as, from "Viewing as" in the top bar (KAN-48). */
  persona: Persona;
  /** Lets tests fix "today" for the date checks and for what is still on the map. */
  today?: Date;
}

const initialsOf = (name: string) =>
  name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const shortDay = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter += 1)}`;

/** The rest of the app the workspace needs: places for "where", and profiles and wards to route requests. */
interface Shared {
  places: MapItem[];
  route: CardData;
}

export default function CommunityPage({ persona, today }: Props) {
  const [data, setData] = useState<CommunityData | null>(null);
  const [shared, setShared] = useState<Shared>({ places: [], route: { places: [], profiles: [] } as unknown as CardData });
  const [failed, setFailed] = useState(false);
  const [orgId, setOrgId] = useState('org-rnn');

  // Events and service changes live in the adapter, so the map sees the same ones. Reload them when
  // anything changes; volunteer sign-ups stay as they are.
  const reload = useCallback(() => {
    Promise.all([getOrgEvents(), getOrgPosts()])
      .then(([events, posts]) => setData((d) => (d ? { ...d, events, posts } : d)))
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    Promise.all([getOrganizations(), getOrgMembers(), getVolunteerRoles(), getOrgEvents(), getOrgPosts(), getPlaces(), getProfiles(), getWards()])
      .then(([organizations, members, roles, events, posts, places, profiles, wards]) => {
        setData({ organizations, members, roles, events, posts });
        setShared({ places, route: { places, profiles, wards } as unknown as CardData });
      })
      .catch(() => setFailed(true));
    return onDataChange(reload);
  }, [reload]);

  // A group organizer from "Viewing as" opens on their own group.
  useEffect(() => {
    if (!persona.memberId || !data) return;
    const m = data.members.find((x) => x.id === persona.memberId);
    if (m) setOrgId(m.orgId);
  }, [persona, data]);

  // Sprint 6 (Devu): a school parent or school staff in "Viewing as" opens the school.
  const schoolOrgId = data?.organizations.find((o) => o.type === 'school')?.id;
  const wantsSchool = persona.schoolRole === 'parent' || persona.schoolRole === 'staff';
  useEffect(() => {
    if (wantsSchool && schoolOrgId) setOrgId(schoolOrgId);
  }, [persona.id, wantsSchool, schoolOrgId]);

  if (failed) return <p className="cw-status" role="alert">The community workspace could not load. Please refresh the page.</p>;
  if (!data) return <p className="cw-status">Loading the community workspace…</p>;

  const org = data.organizations.find((o) => o.id === orgId) ?? data.organizations[0];
  if (!org) return <p className="cw-status">No community organizations in the demo data yet.</p>;
  // Staff and the councillor are not members of any group, so they only see what the public sees.
  const signer = persona.kind === 'requester' ? { profileId: persona.profileId, memberId: persona.memberId } : { profileId: '' };
  const viewer = memberFor(data, org.id, signer);

  return (
    <div className="cw">
      <nav className="cw-orgs" aria-label="Organizations">
        <h1 className="cw-orgs-title">Community</h1>
        <ul>
          {data.organizations.map((o) => (
            <li key={o.id}>
              <button type="button" className={`cw-org${o.id === org.id ? ' is-on' : ''}`} aria-pressed={o.id === org.id} onClick={() => setOrgId(o.id)}>
                <span className={`cw-org-mark cw-org-mark--${o.type}`} aria-hidden="true">
                  {initialsOf(o.name)}
                </span>
                <span className="cw-org-text">
                  <span className="cw-org-name">{o.name}</span>
                  <span className="cw-org-type">{o.typeLabel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="cw-demo">Illustrative sample data. All names and organizations are invented for the prototype.</p>
      </nav>

      <Workspace key={`${org.id}-${persona.id}`} data={data} org={org} persona={persona} viewer={viewer} shared={shared} today={today} />
    </div>
  );
}

interface WorkspaceProps {
  data: CommunityData;
  org: Organization;
  persona: Persona;
  viewer: OrgMember | undefined;
  shared: Shared;
  today?: Date;
}

function Workspace({ data, org, persona, viewer, shared, today }: WorkspaceProps) {
  const [roles, setRoles] = useState(data.roles);
  const members = membersOf(data, org.id);
  const placeName = (id: string | null) => (id ? shared.places.find((p) => p.id === id)?.name ?? '' : '');
  const where = placeName(org.placeId);
  const who = persona.label.replace(/\s*\(demo\)/, '');

  return (
    <article className="cw-main" aria-labelledby="cw-title">
      <header className="cw-head">
        <div>
          <p className="cw-kicker">{org.typeLabel}</p>
          <h2 id="cw-title" className="cw-title">
            {org.name}
          </h2>
          <p className="cw-about">{org.about}</p>
          <p className="cw-meta">
            {org.area}
            {where && ` · ${where}`} · {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        <div className="cw-viewas">
          <p className="cw-you">
            Signed in as <strong>{who}</strong>.{' '}
            {viewer ? (
              <>
                You are {viewer.role === 'organizer' ? 'an' : 'a'} <strong>{ROLE_LABEL[viewer.role].toLowerCase()}</strong> here.
              </>
            ) : (
              'You are not a member of this group.'
            )}
          </p>
          <p className="cw-hint">Switch person with Viewing as at the top, for example to an organizer.</p>
        </div>
      </header>

      {org.type === 'school' && <SchoolWorkspace today={today} persona={persona} />} {/* KAN-43 (Devu): safe routes, roadwork alert, notices */}

      <div className="cw-grid">
        <div className="cw-col">
          <EventsSection data={data} orgId={org.id} viewer={viewer} places={shared.places} placeName={placeName} today={today} />
          {org.location && <ServiceChangesSection data={data} org={org} viewer={viewer} today={today} />}
          <RolesSection data={{ ...data, roles }} setRoles={setRoles} orgId={org.id} viewer={viewer} placeName={placeName} />
        </div>
        <div className="cw-col">
          {/* The school has its own "Requests to the City" card (Devu, KAN-47) */}
          {org.type !== 'school' && <RequestSection org={org} persona={persona} viewer={viewer} shared={shared} />}
          <MembersSection members={members} viewer={viewer} />
        </div>
      </div>

      <footer className="cw-privacy">
        <h3>What's public and what's private</h3>
        <p>
          <strong>Anyone can see:</strong> {org.public.join(', ')}.
        </p>
        <p>
          <strong>Never shown to others:</strong> {org.private.join(', ')}.
        </p>
      </footer>
    </article>
  );
}

// ---------------------------------------------------------------- events

interface EventsProps {
  data: CommunityData;
  orgId: string;
  viewer: OrgMember | undefined;
  places: MapItem[];
  placeName: (id: string | null) => string;
  today?: Date;
}

function EventsSection({ data, orgId, viewer, places, placeName, today }: EventsProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [sent, setSent] = useState<OrgEvent | null>(null);
  const [approved, setApproved] = useState<OrgEvent | null>(null);
  const [error, setError] = useState('');
  const sentRef = useRef<HTMLParagraphElement>(null);
  const now = today ?? new Date();
  const events = eventsFor(data, orgId, viewer);
  const canCreate = !!viewer;

  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  const create = (ev: OrgEvent) => {
    submitOrgEvent(ev)
      .then(() => {
        setFormOpen(false);
        setSent(ev);
        setError('');
      })
      .catch(() => setError('The event could not be sent. Please try again.'));
  };

  const approve = (ev: OrgEvent) => {
    approveOrgEvent(ev.id, viewer)
      .then((done) => {
        setApproved(done);
        setSent(null);
        setError('');
      })
      .catch(() => setError('Only an organizer of this group can approve its events.'));
  };

  return (
    <section className="cw-card" aria-labelledby="cw-events">
      <div className="cw-card-head">
        <h3 id="cw-events">Events</h3>
        {canCreate && !formOpen && (
          <button
            type="button"
            className="cw-btn cw-btn--primary"
            onClick={() => {
              setFormOpen(true);
              setSent(null);
              setApproved(null);
            }}
          >
            Create event
          </button>
        )}
      </div>

      {!canCreate && <p className="cw-muted">Only members can create events.</p>}

      {formOpen && viewer && (
        <EventForm orgId={orgId} creator={viewer} places={places} nextId={newId('oe')} today={today} onCreate={create} onCancel={() => setFormOpen(false)} />
      )}

      <div aria-live="polite">
        {sent && (
          <p className="cw-note cw-note--pending" tabIndex={-1} ref={sentRef}>
            <strong>“{sent.name}” was sent to the organizers.</strong> It stays private (only you and the organizers can see it) until an
            organizer approves it.
          </p>
        )}
        {approved?.permit && approved.permit.status === 'with-staff' && (
          <p className="cw-note cw-note--ok">
            <strong>“{approved.name}” is approved by you.</strong> It is in a public space, so Neighbr staff now check its permit. It goes on
            the map once they approve it, and you will get a notification.
          </p>
        )}
        {approved && !approved.permit && (
          <p className="cw-note cw-note--ok">
            <strong>“{approved.name}” is approved</strong> and now public.
            {eventOnMap(approved, now) ? (
              <>
                {' '}
                It is on the <a href="#/map">shared map</a> until it ends.
              </>
            ) : (
              ' It has no place on the corridor, so it is not on the map.'
            )}
          </p>
        )}
        {error && (
          <p className="cw-note cw-note--pending" role="alert">
            {error}
          </p>
        )}
      </div>

      {events.length === 0 ? (
        <p className="cw-muted">No events yet.</p>
      ) : (
        <ul className="cw-list">
          {events.map((e) => {
            const pending = isPending(e);
            const day = new Date(e.start);
            const place = placeName(e.placeId);
            return (
              <li key={e.id} className={`cw-event${pending ? ' is-pending' : ''}`}>
                <span className="cw-date" aria-hidden="true">
                  <span className="cw-date-d">{day.getDate()}</span>
                  <span className="cw-date-m">{day.toLocaleDateString('en-US', { month: 'short' })}</span>
                </span>
                <div className="cw-event-body">
                  <p className="cw-event-name">{e.name}</p>
                  <p className="cw-event-meta">
                    {formatWhen(e.start, e.end)}
                    {place && ` · ${place}`}
                  </p>
                  {pending && <p className="cw-event-private">Only the person who made it and the organizers can see this until it's approved.</p>}
                  {e.permit && <PermitStatus event={e} viewer={viewer} />}
                  {(e.onMap || eventOnMap(e, now)) && <p className="cw-event-map">On the shared map</p>}
                </div>
                <div className="cw-event-side">
                  <span className={`cw-pill cw-pill--${pending ? 'pending' : e.status === 'past' || isOver(e, now) ? 'past' : 'upcoming'}`}>
                    {pending ? PENDING_LABEL[e.permit?.status ?? 'with-organizer'] : e.status === 'past' || isOver(e, now) ? 'Past' : 'Upcoming'}
                  </span>
                  {canApprove(e, viewer) && (
                    <button type="button" className="cw-btn cw-btn--small" aria-label={`Approve ${e.name}`} onClick={() => approve(e)}>
                      Approve
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const PENDING_LABEL = {
  'with-organizer': 'Waiting for approval',
  'with-staff': 'With Neighbr staff',
  'more-info': 'Needs an answer',
  declined: 'Permit declined',
  approved: 'Permit approved',
} as const;

/** Where an event's permit is, what Neighbr staff said, and (for organizers) the answer form. Never a staff name. */
function PermitStatus({ event, viewer }: { event: OrgEvent; viewer: OrgMember | undefined }) {
  const permit = event.permit!;
  const message = latestMessage(permit);
  const [open, setOpen] = useState(false);
  return (
    <div className="cw-permit">
      <p className="cw-permit-line">
        <strong>{STAGE_LABEL[permit.status]}</strong> <span className="cw-optional">({permit.file.name}, {fileSizeLabel(permit.file.size)})</span>
      </p>
      {message && (
        <p className="cw-permit-msg">
          <strong>{message.kind === 'question' ? 'Neighbr staff asked:' : 'Neighbr staff declined it:'}</strong> {message.text}
        </p>
      )}
      {canAnswer(permit, viewer, event.orgId) && !open && (
        <button type="button" className="cw-btn cw-btn--small" aria-label={`${permit.status === 'declined' ? 'Send again with a new permit' : 'Answer Neighbr staff'}: ${event.name}`} onClick={() => setOpen(true)}>
          {permit.status === 'declined' ? 'Send again with a new permit' : 'Answer Neighbr staff'}
        </button>
      )}
      {open && <AnswerForm event={event} viewer={viewer} onClose={() => setOpen(false)} />}
      {!message && permit.steps.length > 1 && <p className="cw-optional">{STEP_LABEL[permit.steps[permit.steps.length - 1].action]}</p>}
    </div>
  );
}

function AnswerForm({ event, viewer, onClose }: { event: OrgEvent; viewer: OrgMember | undefined; onClose: () => void }) {
  const uid = useId();
  const declined = event.permit!.status === 'declined';
  const [note, setNote] = useState('');
  const [file, setFile] = useState<PermitFile | null>(null);
  const [error, setError] = useState('');
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (declined) {
      const bad = validatePermitFile(file);
      if (bad) return setError(bad);
    } else {
      if (note.trim().length < 5) return setError('Write your answer to the question.');
      if (file) {
        const bad = validatePermitFile(file);
        if (bad) return setError(bad);
      }
    }
    answerPermit(viewer, event.id, { note, file })
      .then(onClose)
      .catch((err) => setError(err instanceof Error ? err.message : 'That did not work. Please try again.'));
  };
  return (
    <form className="cw-form cw-form--inline" onSubmit={send} noValidate aria-label={`Answer Neighbr staff about ${event.name}`}>
      <label htmlFor={`${uid}-n`}>{declined ? 'Anything to add? (optional)' : 'Your answer'}</label>
      <textarea id={`${uid}-n`} rows={2} value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} />
      <label htmlFor={`${uid}-f`}>{declined ? 'New permit file' : 'New permit file (optional)'}</label>
      <input
        id={`${uid}-f`}
        type="file"
        accept={`${PERMIT_EXTENSIONS.join(',')},application/pdf,image/jpeg,image/png`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          setFile(f ? { name: f.name, size: f.size, type: f.type } : null);
          setError('');
        }}
      />
      {error && (
        <p className="cw-error" role="alert">
          {error}
        </p>
      )}
      <div className="cw-form-actions">
        <button type="button" className="cw-btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="cw-btn cw-btn--primary">
          Send to Neighbr staff
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- service changes (KAN-48)

function ServiceChangesSection({ data, org, viewer, today }: { data: CommunityData; org: Organization; viewer: OrgMember | undefined; today?: Date }) {
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const now = today ?? new Date();
  const posts = postsFor(data, org.id, now);
  const allowed = canPost(org, viewer);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PostDraft>(EMPTY_POST);
  const [errors, setErrors] = useState<PostErrors>({});
  const [done, setDone] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  const set = (k: keyof PostDraft) => (e: { target: { value: string } }) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }));
    setErrors(({ [k]: _gone, ...rest }) => rest);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validatePost(draft, now);
    setErrors(errs);
    const first = (Object.keys(errs) as (keyof PostDraft)[])[0];
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    const post = buildPost(draft, org, viewer, newId('op'));
    submitOrgPost(post, viewer)
      .then(() => {
        setOpen(false);
        setDraft(EMPTY_POST);
        setDone(`“${post.title}” is posted. ${postIsActive(post, now) ? 'It is on the shared map now' : `It shows on the map from ${shortDay(post.from)}`} until the end of ${shortDay(post.until)}.`);
      })
      .catch(() => setDone('Only organizers can post service changes.'));
  };

  const a11y = (k: keyof PostDraft) => ({
    id: id(k),
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? id(`${k}-err`) : undefined,
  });
  const err = (k: keyof PostDraft) =>
    errors[k] ? (
      <p id={id(`${k}-err`)} className="cw-error">
        {errors[k]}
      </p>
    ) : null;

  return (
    <section className="cw-card" aria-labelledby="cw-posts">
      <div className="cw-card-head">
        <h3 id="cw-posts">Service changes</h3>
        {allowed && !open && (
          <button
            type="button"
            className="cw-btn cw-btn--primary"
            onClick={() => {
              setOpen(true);
              setDone('');
            }}
          >
            Post a service change
          </button>
        )}
      </div>
      <p className="cw-muted">
        Closures and new hours show on the shared map at the {org.typeLabel.toLowerCase() === 'institution' ? 'branch' : 'location'} until their last day.
        {!allowed && ' Only its organizers can post them.'}
      </p>

      {open && (
        <form className="cw-form" onSubmit={submit} noValidate aria-label="Post a service change">
          <label htmlFor={id('title')}>What is changing</label>
          <input ref={titleRef} type="text" maxLength={POST_TITLE_MAX + 20} placeholder="Closed Monday for staff training" value={draft.title} onChange={set('title')} {...a11y('title')} />
          {err('title')}
          <label htmlFor={id('message')}>
            Details <span className="cw-optional">(optional)</span>
          </label>
          <textarea rows={2} value={draft.message} onChange={set('message')} {...a11y('message')} />
          {err('message')}
          <div className="cw-form-row cw-form-row--2">
            <div>
              <label htmlFor={id('from')}>First day</label>
              <input type="date" value={draft.from} onChange={set('from')} {...a11y('from')} />
              {err('from')}
            </div>
            <div>
              <label htmlFor={id('until')}>Last day</label>
              <input type="date" value={draft.until} onChange={set('until')} {...a11y('until')} />
              {err('until')}
            </div>
          </div>
          <div className="cw-form-actions">
            <button type="button" className="cw-btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="cw-btn cw-btn--primary">
              Post to the map
            </button>
          </div>
        </form>
      )}

      <p aria-live="polite" className={done ? 'cw-note cw-note--ok' : 'visually-hidden'}>
        {done}
      </p>

      {posts.length === 0 ? (
        <p className="cw-muted">No service changes right now.</p>
      ) : (
        <ul className="cw-list">
          {posts.map((p) => {
            const active = postIsActive(p, now);
            return (
              <li key={p.id} className="cw-event">
                <div className="cw-event-body">
                  <p className="cw-event-name">{p.title}</p>
                  <p className="cw-event-meta">{p.from === p.until ? shortDay(p.from) : `${shortDay(p.from)} – ${shortDay(p.until)}`}</p>
                  {p.message && <p className="cw-role-desc">{p.message}</p>}
                </div>
                <div className="cw-event-side">
                  <span className={`cw-pill cw-pill--${active ? 'upcoming' : 'past'}`}>{active ? 'On the map now' : `From ${shortDay(p.from)}`}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- requests to the City (KAN-48)

function RequestSection({ org, persona, viewer, shared }: { org: Organization; persona: Persona; viewer: OrgMember | undefined; shared: Shared }) {
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ReportDraft>({ typeId: '', placeId: '', note: '' });
  const [errors, setErrors] = useState<DraftErrors>({});
  const [sent, setSent] = useState<{ id: string; to: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const sentRef = useRef<HTMLParagraphElement>(null);
  const type = RESIDENT_TYPES.find((t) => t.id === draft.typeId);
  const route = useMemo(() => (type ? routeFor(shared.route, type) : null), [shared.route, type]);
  const toText = route ? [route.to, route.cc].filter(Boolean).map((p, i) => (i === 0 ? plainName(p!.name) : `copy to ${plainName(p!.name)}`)).join(', ') : '';

  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  if (!viewer) {
    return (
      <section className="cw-card" aria-labelledby="cw-request">
        <div className="cw-card-head">
          <h3 id="cw-request">Send a request to the City</h3>
        </div>
        <p className="cw-muted">Members can report a problem for this group, like a broken light outside the hall.</p>
      </section>
    );
  }

  const set = (k: keyof ReportDraft) => (e: { target: { value: string } }) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }));
    setErrors(({ [k]: _gone, ...rest }) => rest);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateDraft('me', draft);
    setErrors(errs);
    const first = (Object.keys(errs) as (keyof ReportDraft)[])[0];
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    // Nigel (Nov 2): the request comes from the person who sends it; the group is noted with it.
    const report = { ...buildReport(shared.route, 'me', persona.profileId, draft), senderName: viewer.name, onBehalfOf: org.name };
    submitReport(report as unknown as MapItem)
      .then(() => {
        setOpen(false);
        setFailed(false);
        setSent({ id: `req-${report.id}`, to: toText });
        setDraft({ typeId: '', placeId: '', note: '' });
      })
      .catch(() => setFailed(true));
  };

  const a11y = (k: keyof ReportDraft) => ({
    id: id(k),
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? id(`${k}-err`) : undefined,
  });
  const err = (k: keyof ReportDraft) =>
    errors[k] ? (
      <p id={id(`${k}-err`)} className="cw-error">
        {errors[k]}
      </p>
    ) : null;

  return (
    <section className="cw-card" aria-labelledby="cw-request">
      <div className="cw-card-head">
        <h3 id="cw-request">Send a request to the City</h3>
        {!open && (
          <button
            type="button"
            className="cw-btn cw-btn--primary"
            onClick={() => {
              setOpen(true);
              setSent(null);
            }}
          >
            New request
          </button>
        )}
      </div>
      <p className="cw-muted">
        Report a problem for {plainName(org.name)}, like a broken light outside the hall. It is sent from you, {plainName(viewer.name)}, and
        you follow it in Requests like any request.
      </p>

      {open && (
        <form className="cw-form" onSubmit={submit} noValidate aria-label="Send a request to the City">
          <label htmlFor={id('typeId')}>What is the problem?</label>
          <select value={draft.typeId} onChange={set('typeId')} {...a11y('typeId')}>
            <option value="">Choose…</option>
            {RESIDENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {err('typeId')}

          <label htmlFor={id('placeId')}>Where is it?</label>
          <select value={draft.placeId} onChange={set('placeId')} {...a11y('placeId')}>
            <option value="">Choose…</option>
            {shared.places.map((p) => (
              <option key={p.id} value={p.id}>
                Near {plainName(p.name)}
              </option>
            ))}
          </select>
          {err('placeId')}

          <label htmlFor={id('note')}>
            Details <span className="cw-optional">{type?.needsNote ? '' : '(optional)'}</span>
          </label>
          <textarea rows={2} value={draft.note} onChange={set('note')} {...a11y('note')} />
          {err('note')}

          {/* Nigel (Nov 2): the sender decides whether it goes on the map (Purab, Sprint 6) */}
          <fieldset className="sw-share">
            <legend>Who can see it?</legend>
            <label>
              <input type="radio" name={id('share')} checked={draft.share !== 'public'} onChange={() => setDraft((d) => ({ ...d, share: 'private' }))} /> Send
              privately <small>(only you and the people handling it)</small>
            </label>
            <label>
              <input type="radio" name={id('share')} checked={draft.share === 'public'} onChange={() => setDraft((d) => ({ ...d, share: 'public' }))} /> Post to
              the map <small>(neighbours can follow it)</small>
            </label>
          </fieldset>

          {type && route && (
            <p className="cw-route" aria-live="polite">
              <strong>Goes to:</strong> {toText}. {type.why}
              <br />
              <span>
                From you, for {plainName(org.name)}. {draft.share === 'public' ? 'Shown on the map.' : 'Only you and the receiver see it.'}
              </span>
            </p>
          )}

          <div className="cw-form-actions">
            <button type="button" className="cw-btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="cw-btn cw-btn--primary">
              Send request
            </button>
          </div>
        </form>
      )}

      <div aria-live="polite">
        {sent && (
          <p className="cw-note cw-note--ok" tabIndex={-1} ref={sentRef}>
            <strong>Sent to {sent.to}.</strong> <a href={`#/requests?id=${encodeURIComponent(sent.id)}`}>Follow it in Requests</a>.
          </p>
        )}
        {failed && (
          <p className="cw-note cw-note--pending" role="alert">
            The request could not be sent. Please try again.
          </p>
        )}
      </div>
    </section>
  );
}

interface FormProps {
  orgId: string;
  creator: OrgMember;
  places: MapItem[];
  nextId: string;
  today?: Date;
  onCreate: (e: OrgEvent) => void;
  onCancel: () => void;
}

function EventForm({ orgId, creator, places, nextId, today, onCreate, onCancel }: FormProps) {
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<EventErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  // KAN-52: in a public space (a park, a street) the event needs a permit.
  const permitNeeded = needsPermit(draft.placeId, places as never);
  const [file, setFile] = useState<PermitFile | null>(null);
  const [permitError, setPermitError] = useState('');

  useEffect(() => nameRef.current?.focus(), []);

  // Typing in a field clears its error, so old messages don't stay on screen.
  const set = (k: keyof EventDraft) => (e: { target: { value: string } }) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }));
    setErrors(({ [k]: _gone, ...rest }) => rest);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateEvent(draft, today);
    setErrors(errs);
    const first = (Object.keys(errs) as (keyof EventDraft)[])[0];
    const fileProblem = permitNeeded ? validatePermitFile(file) : null;
    setPermitError(fileProblem ?? '');
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    if (fileProblem) {
      document.getElementById(id('permit'))?.focus();
      return;
    }
    const permit = permitNeeded && file ? newPermit(file, (today ?? new Date()).toISOString()) : undefined;
    onCreate(buildEvent(draft, orgId, creator, nextId, permit));
  };

  const err = (k: keyof EventDraft) =>
    errors[k] ? (
      <p id={id(`${k}-err`)} className="cw-error">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: keyof EventDraft) => ({
    id: id(k),
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? id(`${k}-err`) : undefined,
  });

  return (
    <form className="cw-form" onSubmit={submit} noValidate aria-label="Create event">
      <p className="cw-form-private">New events stay private until an organizer approves them.</p>

      <label htmlFor={id('name')}>Event name</label>
      <input ref={nameRef} type="text" maxLength={EVENT_NAME_MAX + 20} value={draft.name} onChange={set('name')} {...a11y('name')} />
      {err('name')}

      <div className="cw-form-row">
        <div>
          <label htmlFor={id('date')}>Date</label>
          <input type="date" value={draft.date} onChange={set('date')} {...a11y('date')} />
          {err('date')}
        </div>
        <div>
          <label htmlFor={id('start')}>Starts</label>
          <input type="time" value={draft.start} onChange={set('start')} {...a11y('start')} />
          {err('start')}
        </div>
        <div>
          <label htmlFor={id('end')}>
            Ends <span className="cw-optional">(optional)</span>
          </label>
          <input type="time" value={draft.end} onChange={set('end')} {...a11y('end')} />
          {err('end')}
        </div>
      </div>

      <label htmlFor={id('placeId')}>Where</label>
      <select value={draft.placeId} onChange={set('placeId')} {...a11y('placeId')}>
        <option value="">Not on the corridor / online</option>
        {places.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {permitNeeded && (
        <div className="cw-permit-box">
          <p className="cw-permit-title">This is a public space, so the event needs a permit.</p>
          <p className="cw-optional">An organizer approves the event first, then Neighbr staff check the permit. The event goes on the map only after they approve it.</p>
          <label htmlFor={id('permit')}>Permit (PDF, JPG or PNG, up to 5 MB)</label>
          <input
            id={id('permit')}
            type="file"
            accept={`${PERMIT_EXTENSIONS.join(',')},application/pdf,image/jpeg,image/png`}
            aria-invalid={permitError ? true : undefined}
            aria-describedby={permitError ? id('permit-err') : undefined}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f ? { name: f.name, size: f.size, type: f.type } : null);
              setPermitError('');
            }}
          />
          {file && !permitError && (
            <p className="cw-optional">
              Chosen: {file.name} ({fileSizeLabel(file.size)})
            </p>
          )}
          {permitError && (
            <p id={id('permit-err')} className="cw-error">
              {permitError}
            </p>
          )}
        </div>
      )}

      <label htmlFor={id('description')}>
        Details <span className="cw-optional">(optional)</span>
      </label>
      <textarea rows={3} value={draft.description} onChange={set('description')} {...a11y('description')} />
      <p className={`cw-count${draft.description.length > EVENT_NOTE_MAX ? ' is-over' : ''}`}>
        {draft.description.length} / {EVENT_NOTE_MAX}
      </p>
      {err('description')}

      <div className="cw-form-actions">
        <button type="button" className="cw-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="cw-btn cw-btn--primary">
          Send for approval
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- volunteer roles

interface RolesProps {
  data: CommunityData;
  setRoles: (fn: (roles: CommunityData['roles']) => CommunityData['roles']) => void;
  orgId: string;
  viewer: OrgMember | undefined;
  placeName: (id: string | null) => string;
}

function RolesSection({ data, setRoles, orgId, viewer, placeName }: RolesProps) {
  const roles = rolesFor(data, orgId);
  const [msg, setMsg] = useState('');

  const toggle = (roleId: string, title: string, on: boolean) => {
    setRoles((rs) => (on ? signUp(rs, roleId, viewer) : cancelSignUp(rs, roleId, viewer)));
    setMsg(on ? `You signed up for ${title}.` : `You cancelled your sign-up for ${title}.`);
  };

  return (
    <section className="cw-card" aria-labelledby="cw-roles">
      <div className="cw-card-head">
        <h3 id="cw-roles">Volunteer roles</h3>
      </div>
      <p className="cw-muted">Organizers see who signed up; everyone else only sees how many spots are left.</p>
      <p className="visually-hidden" aria-live="polite">
        {msg}
      </p>
      {roles.length === 0 ? (
        <p className="cw-muted">No volunteer roles right now.</p>
      ) : (
        <ul className="cw-list">
          {roles.map((r) => {
            const left = spotsLeft(r);
            const mineOn = isSignedUp(r, viewer);
            const place = placeName(r.placeId);
            const filled = r.signedUp.length;
            return (
              <li key={r.id} className="cw-role">
                <div className="cw-role-body">
                  <p className="cw-event-name">{r.title}</p>
                  <p className="cw-event-meta">
                    {formatWhen(`${r.date}T${r.start}`, `${r.date}T${r.end}`)}
                    {place && ` · ${place}`}
                  </p>
                  <p className="cw-role-desc">{r.description}</p>
                  <div className="cw-spots">
                    <span className="cw-bar" aria-hidden="true">
                      <span style={{ width: `${(filled / r.spots) * 100}%` }} />
                    </span>
                    <span>
                      {left === 0 ? 'Full' : `${left} of ${r.spots} spots left`}
                    </span>
                  </div>
                  {viewer?.role === 'organizer' && filled > 0 && (
                    <p className="cw-role-who">
                      Signed up: {r.signedUp.map((id) => data.members.find((m) => m.id === id)?.name ?? id).join(', ')}
                    </p>
                  )}
                </div>
                <div className="cw-event-side">
                  {mineOn ? (
                    <>
                      <span className="cw-pill cw-pill--upcoming">You're signed up</span>
                      <button type="button" className="cw-btn cw-btn--small" aria-label={`Cancel sign-up for ${r.title}`} onClick={() => toggle(r.id, r.title, false)}>
                        Cancel
                      </button>
                    </>
                  ) : canSignUp(r, viewer) ? (
                    <button
                      type="button"
                      className="cw-btn cw-btn--primary cw-btn--small"
                      aria-label={`Sign up for ${r.title}`}
                      onClick={() => toggle(r.id, r.title, true)}
                    >
                      Sign up
                    </button>
                  ) : (
                    <span className="cw-pill cw-pill--past">{left === 0 ? 'Full' : 'Members only'}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- members

function MembersSection({ members, viewer }: { members: OrgMember[]; viewer: OrgMember | undefined }) {
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<RoleChip>('all');
  const results = useMemo(() => filterMembers(members, query, chip), [members, query, chip]);
  const counts = useMemo(() => roleCounts(members, query), [members, query]);

  if (!canSeeMembers(viewer)) {
    return (
      <section className="cw-card cw-members" aria-labelledby="cw-members">
        <div className="cw-card-head">
          <h3 id="cw-members">Members</h3>
        </div>
        <p className="cw-muted">
          {members.length} people belong to this group. Only members can see who they are; contact details are never shown.
        </p>
      </section>
    );
  }

  return (
    <section className="cw-card cw-members" aria-labelledby="cw-members">
      <div className="cw-card-head">
        <h3 id="cw-members">Members</h3>
      </div>
      <SearchBar
        id="member-search"
        label="Search members"
        placeholder="Name, role or skill"
        value={query}
        onChange={setQuery}
        onSubmit={() => undefined}
      />
      <FilterChips chips={ROLE_CHIPS} active={chip} onChange={setChip} counts={counts} label="Filter members by role" />
      <p className="cw-count-line" aria-live="polite">
        {results.length === 0 ? 'No members match. Try another word or choose All.' : `${results.length} ${results.length === 1 ? 'member' : 'members'}`}
      </p>
      <ul className="cw-people">
        {results.map((m) => (
          <li key={m.id} className="cw-person">
            <span className={`cw-avatar cw-avatar--${m.role}`} aria-hidden="true">
              {initialsOf(m.name)}
            </span>
            <div>
              <p className="cw-person-name">
                {m.name}
                {viewer && m.id === viewer.id && <span className="cw-you-tag">You</span>}
              </p>
              <p className="cw-person-role">{ROLE_LABEL[m.role]}</p>
              {m.skills.length > 0 && <p className="cw-person-skills">{m.skills.join(' · ')}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="cw-muted cw-small">Contact details and home addresses are never shown.</p>
    </section>
  );
}
