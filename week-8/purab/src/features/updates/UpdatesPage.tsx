// Sprint 6: Updates, the neighbourhood's own page (#/updates). What you see depends on who you are:
//   - Area alerts for where you live or work; the City, the BIA and the councillor can send them (Bhavana)
//   - Have your say: ward polls; the councillor asks, residents vote once (Mounika)
//   - Roadwork near your shop, with a one-tap "We're open" notice; the BIA sees every affected shop (Devu)
//   - Recently fixed: requests posted to the map and resolved, with what was done
import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  alertReach,
  createWardPoll,
  getAlerts,
  getMapData,
  getPlaces,
  getPosts,
  getProfiles,
  getRecentlyFixed,
  getWardPolls,
  onDataChange,
  postOpenNotice,
  reportPost,
  sendAreaAlert,
  voteWardPoll,
} from '../../data/api';
import type { MapItem } from '../search/filters';
import { addDays, isoDay } from '../marketplace/marketplace';
import type { Persona } from '../requests/requests';
import { formatAt } from '../requests/requests';
import {
  AUDIENCE_LABEL,
  EMPTY_ALERT,
  EMPTY_POLL,
  OPEN_NOTICE_MAX,
  RADII,
  canAskWard,
  canSeeResults,
  canSendAlerts,
  canVote,
  isPollOpen,
  openNoticeText,
  percent,
  roadworkImpacts,
  validateAlert,
  validatePoll,
  type AlertDraft,
  type AreaAlert,
  type Audience,
  type PollDraft,
  type WardPoll,
} from './neighbourhood';
import { POST_REPORT_REASONS, NOTE_MAX as REPORT_NOTE_MAX, type PostReportReason } from '../moderation/reports';
import { isNeighbrStaff } from '../moderation/permits';
import '../requests/Requests.css';
import './Updates.css';

const plain = (s: string) => s.replace(/\s*\(demo\)/, '');
const day = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

interface Loaded {
  alerts: { received: AreaAlert[]; sent: AreaAlert[] };
  polls: WardPoll[];
  places: MapItem[];
  updates: MapItem[];
  posts: MapItem[];
  myPlaceId?: string;
  fixed: Awaited<ReturnType<typeof getRecentlyFixed>>;
}

export default function UpdatesPage({ persona, now }: { persona: Persona; now?: Date }) {
  const [d, setD] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    Promise.all([getAlerts(persona), getWardPolls(), getPlaces(), getMapData(), getPosts(), getProfiles(), getRecentlyFixed()])
      .then(([alerts, polls, places, map, posts, profiles, fixed]) =>
        setD({ alerts, polls, places, updates: map.updates, posts, myPlaceId: profiles.find((p) => p.id === persona.profileId)?.placeId, fixed }),
      )
      .catch(() => setFailed(true));
  }, [persona]);
  useEffect(() => {
    load();
    return onDataChange(load);
  }, [load]);

  if (failed) return <p className="up-page rq-error">Updates could not be loaded.</p>;
  if (!d) return <p className="up-page">Loading updates…</p>;

  const placeName = (id?: string) => plain(d.places.find((p) => p.id === id)?.name ?? 'Olde Riverside');
  const impacts = roadworkImpacts(d.places, d.updates as never);
  const myImpacts = persona.reportMode === 'business' ? impacts.filter((i) => i.placeId === d.myPlaceId) : [];
  const isBia = persona.id === 'bia-lead';

  return (
    <div className="up-page">
      <header className="up-head">
        <p className="rq-eyebrow">Olde Riverside</p>
        <h1 className="rq-h1">Updates for {plain(persona.label)}</h1>
        <p className="rq-muted">Alerts for where you are, questions from your councillor, and what has been fixed nearby. Illustrative sample data.</p>
      </header>

      <div className="up-grid">
        <div className="up-col">
          {myImpacts.length > 0 && <BusinessImpact persona={persona} impact={myImpacts[0]} posted={d.posts.some((p) => p.placeId === d.myPlaceId && /open/i.test(String(p.name)))} />}
          {isBia && <AffectedShops impacts={impacts} posts={d.posts} />}
          <AlertsSection persona={persona} alerts={d.alerts} places={d.places} placeName={placeName} now={now} />
        </div>
        <div className="up-col">
          <PollsSection persona={persona} polls={d.polls} now={now} />
          <PostsSection persona={persona} posts={d.posts} placeName={placeName} now={now} />
          <FixedSection fixed={d.fixed} placeName={placeName} />
        </div>
      </div>
    </div>
  );
}

// ---------- Devu: roadwork impact ----------

function BusinessImpact({ persona, impact, posted }: { persona: Persona; impact: ReturnType<typeof roadworkImpacts>[number]; posted: boolean }) {
  const id = useId();
  const [text, setText] = useState(openNoticeText(impact.name));
  // KAN-53 (Devu): every map post has an end date. After it the notice leaves the map and you get a notification.
  const [endsOn, setEndsOn] = useState(() => addDays(new Date(), 14));
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function post() {
    setError('');
    try {
      await postOpenNotice(persona, impact.placeId, text, endsOn);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="up-card up-card--alert" aria-labelledby={`${id}-t`}>
      <p className="up-tag">Roadwork near your shop</p>
      <h2 id={`${id}-t`} className="up-h2">
        {impact.roadwork}, about {impact.metres} m from {impact.name}
      </h2>
      <p className="rq-muted">Customers may think you're closed. Tell them you're open: the notice goes on the map for everyone.</p>
      {done || posted ? (
        <p className="up-ok" role="status">
          Your "We're open" notice is on the map.
        </p>
      ) : (
        <>
          <label htmlFor={`${id}-n`} className="rq-label">
            Notice for your customers
          </label>
          <textarea id={`${id}-n`} rows={2} maxLength={OPEN_NOTICE_MAX + 20} value={text} onChange={(e) => setText(e.target.value)} />
          <p className="up-count">{OPEN_NOTICE_MAX - text.length} characters left</p>
          <label htmlFor={`${id}-e`} className="rq-label">
            Show it on the map until
          </label>
          <input id={`${id}-e`} type="date" value={endsOn} min={isoDay(new Date())} onChange={(e) => setEndsOn(e.target.value)} />
          <p className="up-count">After this day the notice leaves the map and you get a "This post has ended" notification.</p>
          <div className="rq-btns">
            <button type="button" className="rq-btn rq-btn--primary" onClick={post}>
              Post "We're open" to the map
            </button>
          </div>
          {error && (
            <p className="rq-error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function AffectedShops({ impacts, posts }: { impacts: ReturnType<typeof roadworkImpacts>; posts: MapItem[] }) {
  const shops = useMemo(() => {
    const seen = new Map<string, (typeof impacts)[number]>();
    for (const i of impacts) if (!seen.has(i.placeId)) seen.set(i.placeId, i);
    return [...seen.values()];
  }, [impacts]);
  return (
    <section className="up-card" aria-labelledby="up-shops">
      <p className="up-tag up-tag--plain">For the BIA</p>
      <h2 id="up-shops" className="up-h2">
        Shops affected by roadwork ({shops.length})
      </h2>
      {shops.length === 0 ? (
        <p className="rq-muted">No public roadwork near any shop right now.</p>
      ) : (
        <ul className="up-list">
          {shops.map((s) => {
            const open = posts.some((p) => p.placeId === s.placeId && /open/i.test(String(p.name)));
            return (
              <li key={s.placeId}>
                <strong>{s.name}</strong>
                <span>
                  {s.metres} m from {s.roadwork}
                </span>
                <span className={open ? 'up-ok' : 'up-warn'}>{open ? '"We\'re open" posted' : 'No notice yet'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------- Bhavana: area alerts ----------

function AlertsSection({
  persona,
  alerts,
  places,
  placeName,
  now,
}: {
  persona: Persona;
  alerts: { received: AreaAlert[]; sent: AreaAlert[] };
  places: MapItem[];
  placeName: (id?: string) => string;
  now?: Date;
}) {
  return (
    <section className="up-card" aria-labelledby="up-alerts">
      <h2 id="up-alerts" className="up-h2">
        Alerts for your area
      </h2>
      {alerts.received.length === 0 ? (
        <p className="rq-muted">No alerts where you live or work.</p>
      ) : (
        <ul className="up-alerts">
          {alerts.received.map((a) => (
            <li key={a.id}>
              <p className="up-alert-from">
                {plain(a.fromName)} · {formatAt(a.createdAt)}
                {a.until ? ` · until ${day(a.until)}` : ''}
              </p>
              <strong>{a.title}</strong>
              <p>{a.message}</p>
              <p className="up-alert-area">
                Within {a.radiusM} m of {placeName(a.placeId)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {canSendAlerts(persona) && <AlertForm persona={persona} places={places} sent={alerts.sent} placeName={placeName} now={now} />}
    </section>
  );
}

function AlertForm({ persona, places, sent, placeName }: { persona: Persona; places: MapItem[]; sent: AreaAlert[]; placeName: (id?: string) => string; now?: Date }) {
  const id = useId();
  const [draft, setDraft] = useState<AlertDraft>(EMPTY_ALERT);
  const [errors, setErrors] = useState<Partial<Record<keyof AlertDraft, string>>>({});
  const [message, setMessage] = useState('');
  const place = places.find((p) => p.id === draft.placeId);
  const reach = place
    ? alertReach({ center: [place.lng as number, place.lat as number], radiusM: draft.radiusM, audience: draft.audience, fromProfile: persona.profileId })
    : null;
  const set = <K extends keyof AlertDraft>(k: K, v: AlertDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validateAlert(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      const a = await sendAreaAlert(persona, draft);
      setMessage(`Alert sent: "${a.title}". It reached ${reach ?? 0} ${reach === 1 ? 'person' : 'people'} in the demo.`);
      setDraft(EMPTY_ALERT);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }
  const err = (k: keyof AlertDraft) =>
    errors[k] ? (
      <p id={`${id}-${k}-e`} className="rq-error">
        {errors[k]}
      </p>
    ) : null;
  return (
    <form className="up-form" onSubmit={submit} noValidate aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`} className="up-h3">
        Send an area alert
      </h3>
      <p className="rq-muted">Everyone whose home or business is inside the area gets a notification.</p>
      <label htmlFor={`${id}-title`}>Title</label>
      <input id={`${id}-title`} value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Water shut-off on Wyandotte St E" aria-invalid={!!errors.title || undefined} aria-describedby={errors.title ? `${id}-title-e` : undefined} />
      {err('title')}
      <label htmlFor={`${id}-msg`}>Message</label>
      <textarea id={`${id}-msg`} rows={2} value={draft.message} onChange={(e) => set('message', e.target.value)} placeholder="What is happening and what should people do?" aria-invalid={!!errors.message || undefined} aria-describedby={errors.message ? `${id}-message-e` : undefined} />
      {err('message')}
      <div className="up-row">
        <div>
          <label htmlFor={`${id}-place`}>Around</label>
          <select id={`${id}-place`} value={draft.placeId} onChange={(e) => set('placeId', e.target.value)} aria-invalid={!!errors.placeId || undefined}>
            <option value="">Choose a place</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {plain(p.name)}
              </option>
            ))}
          </select>
          {err('placeId')}
        </div>
        <div>
          <label htmlFor={`${id}-r`}>How far</label>
          <select id={`${id}-r`} value={draft.radiusM} onChange={(e) => set('radiusM', Number(e.target.value))}>
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r} m
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-a`}>Who</label>
          <select id={`${id}-a`} value={draft.audience} onChange={(e) => set('audience', e.target.value as Audience)}>
            {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-u`}>Until (optional)</label>
          <input id={`${id}-u`} type="date" value={draft.until} onChange={(e) => set('until', e.target.value)} />
        </div>
      </div>
      {reach !== null && (
        <p className="up-reach" aria-live="polite">
          Reaches {reach} {reach === 1 ? 'person' : 'people'} in the demo.
        </p>
      )}
      <div className="rq-btns">
        <button type="submit" className="rq-btn rq-btn--primary">
          Send alert
        </button>
      </div>
      <p className="rq-live" aria-live="polite">
        {message}
      </p>
      {sent.length > 0 && (
        <>
          <h4 className="up-h4">Sent by you</h4>
          <ul className="up-sent">
            {sent.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong> · within {a.radiusM} m of {placeName(a.placeId)} · {AUDIENCE_LABEL[a.audience].toLowerCase()}
              </li>
            ))}
          </ul>
        </>
      )}
    </form>
  );
}

// ---------- Mounika: ward polls ----------

function PollsSection({ persona, polls, now }: { persona: Persona; polls: WardPoll[]; now?: Date }) {
  return (
    <section className="up-card" aria-labelledby="up-polls">
      <h2 id="up-polls" className="up-h2">
        Have your say
      </h2>
      <p className="rq-muted">Questions from your ward councillor. Only residents of the ward can vote, once each. Votes are anonymous.</p>
      {polls.length === 0 && <p className="rq-muted">No questions right now.</p>}
      {polls.map((p) => (
        <Poll key={p.id} poll={p} persona={persona} now={now} />
      ))}
      {canAskWard(persona) && <PollForm persona={persona} now={now} />}
    </section>
  );
}

// ---------- KAN-52 (Mounika): business posts, and reporting one ----------

/** "#/updates?post=post-01" -> the post the map popup's "Report this post" link pointed at. */
const postFromLink = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('post');

function PostsSection({ persona, posts, placeName, now = new Date() }: { persona: Persona; posts: MapItem[]; placeName: (id?: string) => string; now?: Date }) {
  const today = isoDay(now);
  const live = posts.filter((p) => {
    const end = (p as { endsOn?: unknown }).endsOn;
    return p.visibility === 'public' && p.reportedBy !== persona.profileId && (typeof end !== 'string' || end >= today);
  });
  if (isNeighbrStaff(persona) || live.length === 0) return null;
  return (
    <section className="up-card" aria-labelledby="up-posts">
      <h2 id="up-posts" className="up-h2">
        Posts from local businesses
      </h2>
      <p className="rq-muted">If a post looks like spam, a scam or something offensive, you can report it. Neighbr staff review it. The business is not told who reported it.</p>
      <ul className="up-posts">
        {live.map((p) => (
          <PostRow key={p.id} persona={persona} post={p} where={placeName(p.placeId ?? undefined)} startOpen={postFromLink() === p.id} />
        ))}
      </ul>
    </section>
  );
}

function PostRow({ persona, post, where, startOpen }: { persona: Persona; post: MapItem; where: string; startOpen: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(startOpen);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return setError('Choose a reason.');
    reportPost(persona, post.id, reason as PostReportReason, note)
      .then(() => {
        setDone(true);
        setOpen(false);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'That did not work. Please try again.'));
  };
  return (
    <li className="up-post">
      <p className="up-post-name">{post.name}</p>
      <p className="rq-muted">
        {where}
        {post.description ? ` · ${String(post.description)}` : ''}
      </p>
      {done ? (
        <p className="up-post-ok" role="status">
          Thanks. Neighbr staff will review “{post.name}”. The business is not told who reported it.
        </p>
      ) : open ? (
        <form className="up-form" onSubmit={send} noValidate aria-label={`Report ${post.name}`}>
          <label htmlFor={`${id}-r`}>Why are you reporting it?</label>
          <select id={`${id}-r`} value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }}>
            <option value="">Choose a reason</option>
            {POST_REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <label htmlFor={`${id}-n`}>Anything to add? (optional)</label>
          <textarea id={`${id}-n`} rows={2} maxLength={REPORT_NOTE_MAX + 20} value={note} onChange={(e) => setNote(e.target.value)} />
          {error && (
            <p className="rq-error" role="alert">
              {error}
            </p>
          )}
          <div className="rq-btns">
            <button type="button" className="rq-btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="rq-btn rq-btn--primary">
              Send report
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="rp-linkbtn" aria-label={`Report this post: ${post.name}`} onClick={() => setOpen(true)}>
          Report this post
        </button>
      )}
    </li>
  );
}

function Poll({ poll, persona, now = new Date() }: { poll: WardPoll; persona: Persona; now?: Date }) {
  const id = useId();
  const [choice, setChoice] = useState('');
  const [error, setError] = useState('');
  const vote = canVote(poll, persona, now);
  const results = canSeeResults(poll, persona, now);
  const total = poll.options.reduce((t, o) => t + o.votes, 0);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!choice) return setError('Choose one.');
    try {
      await voteWardPoll(persona, poll.id, choice);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className="up-poll">
      <p className="up-alert-from">
        Ward Councillor · {isPollOpen(poll, now) ? `closes ${day(poll.closesOn)}` : 'closed'} · {total} votes
      </p>
      <h3 id={`${id}-q`} className="up-h3">
        {poll.question}
      </h3>
      {vote.ok ? (
        <form onSubmit={submit} aria-labelledby={`${id}-q`}>
          <fieldset className="up-options">
            <legend className="rq-sr">{poll.question}</legend>
            {poll.options.map((o) => (
              <label key={o.id} className={`up-option${choice === o.id ? ' is-on' : ''}`}>
                <input type="radio" name={`${id}-o`} value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} />
                {o.label}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="rq-btn rq-btn--primary">
            Vote
          </button>
          {error && (
            <p className="rq-error" role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <p className="up-why">{vote.reason}</p>
      )}
      {results && (
        <ul className="up-results" aria-label="Results">
          {percent(poll).map((o) => (
            <li key={o.id}>
              <span>{o.label}</span>
              <span className="in-bar" aria-hidden="true">
                <span style={{ width: `${o.pct}%` }} />
              </span>
              <span className="in-bar-n">{o.pct}%</span>
            </li>
          ))}
        </ul>
      )}
      {poll.nextStep && (
        <p className="up-next">
          <strong>What happens next:</strong> {poll.nextStep}
        </p>
      )}
    </div>
  );
}

function PollForm({ persona, now = new Date() }: { persona: Persona; now?: Date }) {
  const id = useId();
  const [draft, setDraft] = useState<PollDraft>(EMPTY_POLL);
  const [errors, setErrors] = useState<Partial<Record<keyof PollDraft, string>>>({});
  const [message, setMessage] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validatePoll(draft, now);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await createWardPoll(persona, draft);
      setMessage('Your question is live. Residents of the ward can vote now.');
      setDraft(EMPTY_POLL);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }
  return (
    <form className="up-form" onSubmit={submit} noValidate aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`} className="up-h3">
        Ask the ward
      </h3>
      <label htmlFor={`${id}-q`}>Question</label>
      <input id={`${id}-q`} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} placeholder="e.g. Which park should get a new bench first?" />
      {errors.question && <p className="rq-error">{errors.question}</p>}
      <fieldset className="up-optinputs">
        <legend>Choices</legend>
        {draft.options.map((o, i) => (
          <input
            key={i}
            aria-label={`Choice ${i + 1}`}
            value={o}
            onChange={(e) => setDraft({ ...draft, options: draft.options.map((x, j) => (j === i ? e.target.value : x)) })}
          />
        ))}
        {draft.options.length < 4 && (
          <button type="button" className="rp-linkbtn" onClick={() => setDraft({ ...draft, options: [...draft.options, ''] })}>
            Add a choice
          </button>
        )}
      </fieldset>
      {errors.options && <p className="rq-error">{errors.options}</p>}
      <div className="up-row">
        <div>
          <label htmlFor={`${id}-c`}>Voting closes</label>
          <input id={`${id}-c`} type="date" value={draft.closesOn} onChange={(e) => setDraft({ ...draft, closesOn: e.target.value })} />
          {errors.closesOn && <p className="rq-error">{errors.closesOn}</p>}
        </div>
      </div>
      <label htmlFor={`${id}-n`}>What happens next (optional)</label>
      <input id={`${id}-n`} value={draft.nextStep} onChange={(e) => setDraft({ ...draft, nextStep: e.target.value })} placeholder="e.g. The result goes to council in December." />
      <div className="rq-btns">
        <button type="submit" className="rq-btn rq-btn--primary">
          Post question
        </button>
      </div>
      <p className="rq-live" aria-live="polite">
        {message}
      </p>
    </form>
  );
}

// ---------- recently fixed ----------

function FixedSection({ fixed, placeName }: { fixed: Awaited<ReturnType<typeof getRecentlyFixed>>; placeName: (id?: string) => string }) {
  return (
    <section className="up-card" aria-labelledby="up-fixed">
      <h2 id="up-fixed" className="up-h2">
        Recently fixed nearby
      </h2>
      {fixed.length === 0 ? (
        <p className="rq-muted">Nothing yet. Requests posted to the map show here once they are fixed.</p>
      ) : (
        <ul className="up-list">
          {fixed.map((f) => (
            <li key={f.id}>
              <strong>{f.title}</strong>
              <span>
                {placeName(f.placeId)} · {formatAt(f.at)}
                {f.neighbours > 1 ? ` · reported by ${f.neighbours} neighbours` : ''}
              </span>
              {(f.outcome || f.done) && <span>{f.outcome ?? f.done}</span>}
              {f.rating && <span className={f.rating === 'fixed' ? 'up-ok' : 'up-warn'}>{f.rating === 'fixed' ? 'The sender says it’s fixed' : 'The sender says it’s not fixed'}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
