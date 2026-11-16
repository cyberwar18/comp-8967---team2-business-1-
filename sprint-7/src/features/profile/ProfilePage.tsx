// KAN-50 (Purab): "Your profile" and "Settings" for whoever is chosen in Viewing as.
// Profile: who you are on Neighbr, what others can see, and links to everything that is yours.
// Settings: who can message you (Bhavana's Chats rule), which notifications reach the bell,
// and your home area for area alerts and Marketplace distances.
import { useEffect, useId, useRef, useState } from 'react';
import {
  getHomePlaces,
  getMessageSetting,
  getProfileSummary,
  getSettings,
  onDataChange,
  saveSettings,
  setMessageSetting,
  type ProfileSummary,
} from '../../data/api';
import { GROUP_LABEL } from '../requests/personas';
import type { Persona } from '../requests/requests';
import { SETTING_LABEL, type MessageSetting } from '../chats/chats';
import { NOTICE_KINDS, displayName, hasHomeArea, roleAndOrg, type HomePlace, type NoticeKind, type UserSettings } from './settings';
import './Profile.css';

const plain = (s: string) => s.replace(/\s*\(demo\)/, '').replace(/\s*\(illustrative\)/, '');

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

export function ProfilePage({ persona }: { persona: Persona }) {
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const load = () =>
      getProfileSummary(persona)
        .then(setSummary)
        .catch(() => setFailed(true));
    load();
    return onDataChange(load);
  }, [persona]);

  if (failed) return <p className="yp-status" role="alert">Your profile could not be loaded. Try Reset demo in the yellow strip.</p>;
  if (!summary) return <p className="yp-status">Loading your profile…</p>;

  return (
    <div className="yp-page">
      <header className="yp-head">
        <h1>Your profile</h1>
        <p>What neighbours see about you, everything that is yours, and your settings.</p>
      </header>
      <div className="yp-grid">
        <div className="yp-col">
          <ProfileCard persona={persona} summary={summary} />
          <YourStuff persona={persona} summary={summary} />
        </div>
        <div className="yp-col">
          <SettingsCard persona={persona} />
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ persona, summary }: { persona: Persona; summary: ProfileSummary }) {
  const name = displayName(persona);
  const { role, org } = roleAndOrg(persona);
  const p = summary.profile;
  const isBusiness = persona.reportMode === 'business';
  return (
    <section className="yp-card" aria-labelledby="yp-who">
      <div className="yp-who">
        <span className="yp-avatar" aria-hidden="true">
          {initials(name)}
        </span>
        <div>
          <h2 id="yp-who" className="yp-h2">
            {name}
          </h2>
          <p className="yp-role">
            <span className="yp-badge">{role}</span>
            {org && <span> at {org}</span>}
          </p>
          <p className="yp-muted">
            {persona.group ? GROUP_LABEL[persona.group] : 'Neighbr'}
            {p?.area && <> · {plain(p.area)}</>}
          </p>
        </div>
      </div>
      {p?.bio && <p className="yp-bio">{p.bio}</p>}
      {isBusiness && summary.owner && (
        <p className="yp-muted">
          Owner: {plain(summary.owner.name)}. The owner's own profile stays separate from the shop's.
        </p>
      )}
      {p && (
        <div className="yp-split">
          <div>
            <h3 className="yp-h3">Neighbours can see</h3>
            <ul className="yp-tags">
              {p.public.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="yp-h3">Only you{persona.kind === 'staff' ? ' and your team' : ''}</h3>
            <ul className="yp-tags yp-tags--private">
              {p.private.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <p className="yp-muted yp-small">No home address or phone number is shown anywhere on Neighbr. People reach you through Chats.</p>
    </section>
  );
}

function YourStuff({ persona, summary }: { persona: Persona; summary: ProfileSummary }) {
  const staff = persona.kind !== 'requester';
  const rows: { label: string; value: string; href: string }[] = [
    staff
      ? { label: 'Work queue', value: 'Requests your team handles', href: '#/requests' }
      : { label: 'Requests you sent', value: `${summary.sent} (${summary.open} still open)`, href: '#/requests' },
    ...(!staff ? [{ label: 'Requests you support', value: String(summary.supporting), href: '#/requests' }] : []),
    { label: 'Unread messages', value: String(summary.unreadChats), href: '#/chats' },
    ...(persona.canReport !== false && !staff
      ? [{ label: 'Your Marketplace listings', value: `${summary.listings} up now`, href: '#/marketplace' }]
      : []),
    { label: 'Updates near you', value: `${summary.notifications} new notifications in the bell`, href: '#/updates' },
  ];
  return (
    <section className="yp-card" aria-labelledby="yp-stuff">
      <h2 id="yp-stuff" className="yp-h2">
        Yours on Neighbr
      </h2>
      <ul className="yp-rows">
        {rows.map((r) => (
          <li key={r.label}>
            <a href={r.href}>
              <span className="yp-row-label">{r.label}</span>
              <span className="yp-row-value">{r.value}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SettingsCard({ persona }: { persona: Persona }) {
  const uid = useId();
  const [draft, setDraft] = useState<UserSettings | null>(null);
  const [msg, setMsg] = useState<MessageSetting>('anyone');
  const [places, setPlaces] = useState<HomePlace[]>([]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    Promise.all([getSettings(persona), getMessageSetting(persona), getHomePlaces()])
      .then(([s, m, pl]) => {
        setDraft(s);
        setMsg(m);
        setPlaces(pl);
      })
      .catch(() => setStatus({ ok: false, text: 'Your settings could not be loaded.' }));
  }, [persona]);

  if (!draft) return <section className="yp-card">Loading settings…</section>;

  const toggle = (k: NoticeKind) => setDraft((d) => (d ? { ...d, notify: { ...d.notify, [k]: !d.notify[k] } } : d));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSettings(persona, draft);
      await setMessageSetting(persona, msg);
      setStatus({ ok: true, text: 'Settings saved.' });
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
    }
    requestAnimationFrame(() => statusRef.current?.focus());
  };

  return (
    <section className="yp-card" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className="yp-h2">
        Settings
      </h2>
      <form onSubmit={save} className="yp-form" noValidate>
        <fieldset className="yp-set">
          <legend>Who can message me</legend>
          {(Object.keys(SETTING_LABEL) as MessageSetting[]).map((m) => (
            <label key={m} className={`yp-option${msg === m ? ' is-on' : ''}`}>
              <input type="radio" name={`${uid}-msg`} checked={msg === m} onChange={() => setMsg(m)} />
              {SETTING_LABEL[m]}
            </label>
          ))}
        </fieldset>

        <fieldset className="yp-set">
          <legend>Notifications in the bell</legend>
          {NOTICE_KINDS.map((n) => (
            <label key={n.id} className={`yp-option yp-option--check${draft.notify[n.id] ? ' is-on' : ''}`}>
              <input type="checkbox" checked={draft.notify[n.id]} onChange={() => toggle(n.id)} />
              <span>
                <strong>{n.label}</strong>
                <span className="yp-hint">{n.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {hasHomeArea(persona) ? (
          <div className="yp-set">
            <label htmlFor={`${uid}-home`} className="yp-legend">
              Home area
            </label>
            <p className="yp-hint" id={`${uid}-home-hint`}>
              Area alerts reach you around this spot, and the Marketplace measures distances from it. Pick a nearby public place, never your address.
            </p>
            <select
              id={`${uid}-home`}
              aria-describedby={`${uid}-home-hint`}
              value={draft.homePlaceId ?? ''}
              onChange={(e) => setDraft((d) => (d ? { ...d, homePlaceId: e.target.value || undefined } : d))}
            >
              <option value="">{persona.home ? 'The demo default' : 'Not set'}</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {plain(p.name)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="yp-hint">Staff accounts have no home area: alerts reach you through your work queue.</p>
        )}

        <div className="yp-actions">
          <button type="submit" className="yp-btn">
            Save settings
          </button>
        </div>
        <p
          ref={statusRef}
          tabIndex={-1}
          role={status?.ok === false ? 'alert' : 'status'}
          className={status ? (status.ok ? 'yp-ok' : 'yp-err') : 'yp-hidden'}
        >
          {status?.text}
        </p>
      </form>
    </section>
  );
}
