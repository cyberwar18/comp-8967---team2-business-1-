// KAN-35 (Purab): the "Report a problem" form.
//   Me (resident):        pothole, street light, sidewalk... -> City 311 / ward councillor, never the BIA
//   My business (owner):  access, business update, corridor  -> the BIA
// Before sending, the form says who will receive the report and why, and that it stays private
// until approved. After sending, the report appears under My reports at the Reported step.
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { distanceM, type CardData, type Item, type Mode } from '../cards/cardData';
import {
  NOTE_MAX,
  buildReport,
  placesNearest,
  plainName,
  routeFor,
  typeById,
  typesFor,
  validateDraft,
  type DraftErrors,
  type ReportDraft,
} from './routing';
import './Report.css';

interface Props {
  data: CardData;
  mode: Mode;
  viewerId: string;
  /** "You are here" ([lng, lat]); places are listed nearest first. */
  from: [number, number];
  /** Saves the report (the data adapter). Resolves once it is stored. */
  onSubmit: (report: Item) => Promise<void>;
  /** "See it on the map" after sending. */
  onShow: (reportId: string) => void;
  onClose: () => void;
  /** Sprint 6: ask the map page to let the person click the spot. The form hides meanwhile. */
  onPickOnMap?: () => void;
  /** The spot picked on the map ([lng, lat]), passed back by the map page. */
  picked?: [number, number] | null;
  /** True while the person is picking the spot on the map. */
  picking?: boolean;
  /** Sprint 6 ("Me too"): public, open requests that could be the same problem. */
  nearby?: NearbyRequest[];
  /** Add your support to one of them instead of sending a duplicate. */
  onSupport?: (requestId: string) => Promise<void>;
}

export interface NearbyRequest {
  id: string;
  title: string;
  category: string;
  lng: number;
  lat: number;
  count: number; // neighbours behind it (the sender + supporters)
  supported: boolean; // you already support it
}

/** Same kind of problem within this distance counts as "probably the same". */
export const SAME_PROBLEM_M = 150;

/** Make a photo small enough for the demo (max 900 px, JPEG). Falls back to the original file. */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The photo could not be read.'));
    reader.onload = () => {
      const original = String(reader.result);
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, 900 / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(original);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        } catch {
          resolve(original);
        }
      };
      img.onerror = () => resolve(original);
      img.src = original;
    };
    reader.readAsDataURL(file);
  });
}

const EMPTY: ReportDraft = { typeId: '', placeId: '', note: '' };

export function ReportProblem({ data, mode, viewerId, from, onSubmit, onShow, onClose, onPickOnMap, picked = null, picking = false, nearby = [], onSupport }: Props) {
  const uid = useId();
  const ids = { title: `${uid}-title`, type: `${uid}-type`, place: `${uid}-place`, note: `${uid}-note`, count: `${uid}-count` };
  const business = mode === 'business';

  const [draft, setDraft] = useState<ReportDraft>(EMPTY);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<Item | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [supportedReq, setSupportedReq] = useState<NearbyRequest | null>(null);
  const [supportError, setSupportError] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  const types = typesFor(mode);
  const places = useMemo(() => placesNearest(data, from), [data, from]);
  const type = typeById(mode, draft.typeId);
  const route = type ? routeFor(data, type) : null;
  const toName = route?.to ? plainName(route.to.name) : '';
  const ccName = route?.cc ? plainName(route.cc.name) : '';

  // A spot picked on the map replaces the place from the list.
  useEffect(() => {
    if (picked) {
      setDraft((d) => ({ ...d, point: picked, placeId: '' }));
      setErrors((e) => ({ ...e, placeId: undefined }));
    }
  }, [picked]);
  const pickedNear = draft.point ? placesNearest(data, draft.point)[0] : undefined;

  // "Me too": the same kind of problem already posted to the map nearby.
  const spot: [number, number] | null = useMemo(() => {
    if (draft.point) return draft.point;
    const pl = data.places.find((p) => p.id === draft.placeId);
    return pl && typeof pl.lng === 'number' && typeof pl.lat === 'number' ? [pl.lng, pl.lat] : null;
  }, [draft.point, draft.placeId, data.places]);
  const similar = useMemo(
    () =>
      type && spot && onSupport
        ? nearby.filter((n) => n.category === type.category && distanceM(spot, [n.lng, n.lat]) <= SAME_PROBLEM_M)
        : [],
    [type, spot, nearby, onSupport],
  );

  async function support(n: NearbyRequest) {
    if (!onSupport) return;
    setSupportError('');
    try {
      await onSupport(n.id);
      setSupportedReq(n);
    } catch (e) {
      setSupportError((e as Error).message);
    }
  }

  async function handlePhoto(file: File | undefined) {
    setPhotoError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) return setPhotoError('Choose a photo (JPG, PNG or HEIC).');
    if (file.size > 10 * 1024 * 1024) return setPhotoError('That photo is over 10 MB. Choose a smaller one.');
    try {
      const url = await readPhoto(file);
      setDraft((d) => ({ ...d, photo: url }));
    } catch (e) {
      setPhotoError((e as Error).message);
    }
  }

  // Focus the title when the form opens, and the confirmation once sent.
  useEffect(() => headingRef.current?.focus(), []);
  useEffect(() => {
    if (sent || supportedReq) doneRef.current?.focus();
  }, [sent, supportedReq]);

  const set = <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateDraft(mode, draft);
    setErrors(found);
    const first = (['typeId', 'placeId', 'note'] as const).find((k) => found[k]);
    if (first) {
      // Move focus to the first field that needs fixing.
      const target =
        first === 'typeId'
          ? dialogRef.current?.querySelector<HTMLInputElement>(`input[name="${ids.type}"]`)
          : document.getElementById(first === 'placeId' ? ids.place : ids.note);
      target?.focus();
      return;
    }
    setSending(true);
    setFailed(false);
    try {
      const report = buildReport(data, mode, viewerId, draft);
      await onSubmit(report);
      setSent(report);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  // Escape closes; Tab stays inside the dialog.
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  }

  const noteLeft = NOTE_MAX - draft.note.length;

  const body = (
    <div className="rp-overlay" hidden={picking} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="rp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        onKeyDown={handleKeyDown}
      >
        <button type="button" className="rp-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        {supportedReq ? (
          <div className="rp-done">
            <span className="rp-done-mark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 5 5 9-10" />
              </svg>
            </span>
            <h2 id={ids.title} tabIndex={-1} ref={doneRef}>
              You're supporting it
            </h2>
            <p>
              <strong>{supportedReq.title}</strong> is now reported by {supportedReq.count + 1} neighbours. You'll get its updates, and the people
              handling it see one more neighbour behind it.
            </p>
            <div className="rp-actions">
              <a className="rp-btn rp-btn--primary rp-btn--link" href={`#/requests?id=${supportedReq.id}`} onClick={onClose}>
                Follow it in Requests
              </a>
              <button type="button" className="rp-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : sent ? (
          <div className="rp-done">
            <span className="rp-done-mark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 5 5 9-10" />
              </svg>
            </span>
            <h2 id={ids.title} ref={doneRef} tabIndex={-1}>
              {business ? 'Sent to your BIA' : 'Report sent'}
            </h2>
            <p>
              <strong>{sent.name}</strong> went to {toName}
              {ccName && `, with a copy to ${ccName}`}. It's at the <strong>Reported</strong> step{sent.visibility === 'public' ? ' and is on the map for everyone' : ' and stays private'}.
            </p>
            <p className="rp-muted">{business ? 'Follow it under My requests on your business card.' : 'Follow it under My reports on your profile.'}</p>
            <div className="rp-actions">
              <button type="button" className="rp-btn rp-btn--primary" onClick={() => onShow(sent.id)}>
                See it on the map
              </button>
              <a className="rp-btn rp-btn--link" href={`#/requests?id=req-${sent.id}`} onClick={onClose}>
                Track it in Requests
              </a>
              <button type="button" className="rp-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2 id={ids.title} ref={headingRef} tabIndex={-1}>
              {business ? 'Request help from the BIA' : 'Report a problem'}
            </h2>
            <p className="rp-muted">
              {business
                ? 'For problems affecting your business on the corridor.'
                : 'Tell the people responsible about a problem on your street.'}
            </p>

            <fieldset className="rp-field" aria-describedby={errors.typeId ? `${ids.type}-err` : undefined}>
              <legend>What's the problem?</legend>
              <div className="rp-types">
                {types.map((t) => (
                  <label key={t.id} className={`rp-type${draft.typeId === t.id ? ' is-on' : ''}`}>
                    <input
                      type="radio"
                      name={ids.type}
                      value={t.id}
                      checked={draft.typeId === t.id}
                      onChange={() => set('typeId', t.id)}
                      aria-invalid={errors.typeId ? true : undefined}
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
              {errors.typeId && (
                <p id={`${ids.type}-err`} className="rp-error">
                  {errors.typeId}
                </p>
              )}
            </fieldset>

            <div className="rp-field">
              <label htmlFor={ids.place}>Where is it?</label>
              <select
                id={ids.place}
                value={draft.placeId}
                onChange={(e) => set('placeId', e.target.value)}
                aria-invalid={errors.placeId ? true : undefined}
                aria-describedby={errors.placeId ? `${ids.place}-err` : undefined}
              >
                <option value="">Choose the nearest place</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {plainName(p.name)}
                    {typeof p.address === 'string' ? `, ${plainName(p.address)}` : ''}
                  </option>
                ))}
              </select>
              {onPickOnMap && (
                <div className="rp-pick">
                  {draft.point ? (
                    <p className="rp-picked">
                      Spot chosen on the map{pickedNear ? `, near ${plainName(pickedNear.name)}` : ''}.{' '}
                      <button type="button" className="rp-linkbtn" onClick={() => setDraft((d) => ({ ...d, point: undefined }))}>
                        Clear
                      </button>
                    </p>
                  ) : null}
                  <button type="button" className="rp-btn rp-btn--small" onClick={onPickOnMap}>
                    {draft.point ? 'Pick again on the map' : 'Or pick the spot on the map'}
                  </button>
                </div>
              )}
              {errors.placeId && (
                <p id={`${ids.place}-err`} className="rp-error">
                  {errors.placeId}
                </p>
              )}
            </div>

            <div className="rp-field">
              <label htmlFor={`${uid}-photo`}>Photo (optional)</label>
              {draft.photo ? (
                <div className="rp-photo">
                  <img src={draft.photo} alt="The photo you added" />
                  <button type="button" className="rp-linkbtn" onClick={() => setDraft((d) => ({ ...d, photo: undefined }))}>
                    Remove photo
                  </button>
                </div>
              ) : (
                <input id={`${uid}-photo`} type="file" accept="image/*" onChange={(e) => handlePhoto(e.target.files?.[0])} />
              )}
              {photoError && (
                <p className="rp-error" role="alert">
                  {photoError}
                </p>
              )}
            </div>

            <div className="rp-field">
              <label htmlFor={ids.note}>
                Details{type?.needsNote ? '' : ' (optional)'}
              </label>
              <textarea
                id={ids.note}
                rows={3}
                value={draft.note}
                onChange={(e) => set('note', e.target.value)}
                placeholder={business ? 'e.g. The sidewalk in front of the shop has been closed since Monday.' : 'e.g. The light has been off for three nights.'}
                aria-invalid={errors.note ? true : undefined}
                aria-describedby={[ids.count, errors.note ? `${ids.note}-err` : ''].filter(Boolean).join(' ')}
              />
              <p id={ids.count} className={`rp-count${noteLeft < 0 ? ' is-over' : ''}`}>
                {noteLeft >= 0 ? `${noteLeft} characters left` : `${-noteLeft} characters too many`}
              </p>
              {errors.note && (
                <p id={`${ids.note}-err`} className="rp-error">
                  {errors.note}
                </p>
              )}
            </div>

            {similar.length > 0 && (
              <section className="rp-similar" aria-labelledby={`${uid}-similar`}>
                <h3 id={`${uid}-similar`}>Already reported nearby</h3>
                <p className="rp-muted">If it's the same problem, add your support instead of sending it again. You'll get its updates.</p>
                <ul>
                  {similar.map((n) => (
                    <li key={n.id}>
                      <span>
                        <strong>{n.title}</strong>
                        <small>
                          {n.count === 1 ? 'Reported by 1 neighbour' : `Reported by ${n.count} neighbours`} · {Math.round(distanceM(spot!, [n.lng, n.lat]))} m away
                        </small>
                      </span>
                      {n.supported ? (
                        <span className="rp-supported">You support this</span>
                      ) : (
                        <button type="button" className="rp-btn rp-btn--small" onClick={() => support(n)}>
                          Support this instead
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {supportError && (
                  <p className="rp-error" role="alert">
                    {supportError}
                  </p>
                )}
              </section>
            )}

            {/* Sprint 6 (Nigel, Nov 2): the sender decides whether it goes on the map. */}
            <fieldset className="rp-field">
              <legend>Who can see it?</legend>
              <div className="rp-types rp-share">
                <label className={`rp-type${draft.share !== 'public' ? ' is-on' : ''}`}>
                  <input type="radio" name={`${uid}-share`} checked={draft.share !== 'public'} onChange={() => set('share', 'private')} />
                  <span>
                    Send privately
                    <small>Only you and the people handling it</small>
                  </span>
                </label>
                <label className={`rp-type${draft.share === 'public' ? ' is-on' : ''}`}>
                  <input type="radio" name={`${uid}-share`} checked={draft.share === 'public'} onChange={() => set('share', 'public')} />
                  <span>
                    Post to the map
                    <small>Neighbours can see it and follow its progress</small>
                  </span>
                </label>
              </div>
            </fieldset>

            {/* Who will receive it: updates as soon as a type is chosen. */}
            <div className="rp-route" aria-live="polite">
              {type && route?.to ? (
                <>
                  <p className="rp-route-to">
                    <span>Goes to</span> <strong>{toName}</strong>
                    {ccName && (
                      <>
                        {' '}
                        <span>with a copy to</span> <strong>{ccName}</strong>
                      </>
                    )}
                  </p>
                  <p className="rp-muted">{type.why}</p>
                  <p className="rp-private">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    {draft.share === 'public'
                      ? `Public: it goes to ${toName} and appears on the map for everyone, with its progress.`
                      : `Private: only you and ${toName} see this.`}
                  </p>
                </>
              ) : (
                <p className="rp-muted">Choose a problem to see who it goes to.</p>
              )}
            </div>

            {failed && (
              <p className="rp-error" role="alert">
                The report wasn't sent. Check your connection and try again.
              </p>
            )}

            <div className="rp-actions">
              <button type="submit" className="rp-btn rp-btn--primary" disabled={sending}>
                {sending ? 'Sending…' : business ? 'Send to the BIA' : 'Send report'}
              </button>
              <button type="button" className="rp-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
            <p className="rp-demo">Demo: reports are kept in this browser until you press Reset demo.</p>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
