// Sprint 6: the Updates section, the neighbourhood's own page. No UI here, so it can be tested.
//   - Area alerts (Bhavana): the City, the BIA or the councillor warns everyone in an area
//     ("Water shut-off on Wyandotte, 9 am to 2 pm"). It reaches the people whose home is inside it.
//   - Ward polls (Mounika): the councillor asks the ward; only residents of the ward can vote, once.
//   - Roadwork impact (Devu): a business near public roadwork is warned and can post "We're open".
import { metresBetween, publicRoadwork } from '../school/schoolData';
import type { Persona } from '../requests/requests';

type LngLat = [number, number];

// ---------- area alerts ----------

export type Audience = 'everyone' | 'residents' | 'businesses' | 'organizations';
export const AUDIENCE_LABEL: Record<Audience, string> = {
  everyone: 'Everyone in the area',
  residents: 'Residents',
  businesses: 'Businesses',
  organizations: 'Schools and community organizations',
};
export const RADII = [100, 250, 500] as const;

export interface AreaAlert {
  id: string;
  fromProfile: string; // profile-city, profile-bia, profile-councillor
  fromName: string;
  title: string;
  message: string;
  placeId: string; // the area is a circle around this place
  center: LngLat;
  radiusM: number;
  audience: Audience;
  until?: string; // ISO date the alert stops applying
  createdAt: string;
  illustrative?: boolean;
}

export interface AlertDraft {
  title: string;
  message: string;
  placeId: string;
  radiusM: number;
  audience: Audience;
  until: string;
}

export const EMPTY_ALERT: AlertDraft = { title: '', message: '', placeId: '', radiusM: 250, audience: 'everyone', until: '' };

/** Who may send area alerts: the City's lead, the BIA coordinator and the ward councillor. */
export function canSendAlerts(p: Persona): boolean {
  return p.id === 'city-lead' || p.id === 'bia-lead' || p.kind === 'copy';
}

export function validateAlert(d: AlertDraft): Partial<Record<keyof AlertDraft, string>> {
  const e: Partial<Record<keyof AlertDraft, string>> = {};
  if (d.title.trim().length < 5) e.title = 'Give the alert a short title.';
  if (d.title.trim().length > 80) e.title = 'Keep the title under 80 characters.';
  if (d.message.trim().length < 10) e.message = 'Say what is happening and what people should do.';
  if (d.message.trim().length > 300) e.message = 'Keep the message under 300 characters.';
  if (!d.placeId) e.placeId = 'Choose where.';
  if (!RADII.includes(d.radiusM as (typeof RADII)[number])) e.radiusM = 'Choose how far around it.';
  return e;
}

function inAudience(p: Persona, audience: Audience): boolean {
  if (audience === 'everyone') return true;
  if (audience === 'residents') return p.group === 'people' && p.reportMode !== 'business';
  if (audience === 'businesses') return p.reportMode === 'business';
  return p.group === 'organizations';
}

/** Does this alert reach this person? (their home is inside the circle and they are in the audience) */
export function reaches(a: AreaAlert, p: Persona): boolean {
  if (!p.home || p.profileId === a.fromProfile) return false;
  return inAudience(p, a.audience) && metresBetween(p.home, a.center) <= a.radiusM;
}

/** How many of the demo accounts an alert would reach (shown before sending). */
export function reachCount(a: Pick<AreaAlert, 'center' | 'radiusM' | 'audience' | 'fromProfile'>, people: Persona[]): number {
  return people.filter((p) => reaches({ ...a, id: '', fromName: '', title: '', message: '', placeId: '', createdAt: '' }, p)).length;
}

export function isCurrent(a: AreaAlert, now: Date = new Date()): boolean {
  return !a.until || new Date(`${a.until}T23:59:59`).getTime() >= now.getTime();
}

// ---------- ward polls ----------

export interface WardPoll {
  id: string;
  wardId: string;
  question: string;
  options: { id: string; label: string; votes: number }[];
  closesOn: string; // ISO date
  nextStep?: string; // "What happens next"
  createdBy: string; // profile-councillor
  votedBy: string[]; // profiles that voted (never shown, only used to allow one vote)
  createdAt: string;
  illustrative?: boolean;
}

export interface PollDraft {
  question: string;
  options: string[];
  closesOn: string;
  nextStep: string;
}

export const EMPTY_POLL: PollDraft = { question: '', options: ['', ''], closesOn: '', nextStep: '' };

export function canAskWard(p: Persona): boolean {
  return p.kind === 'copy'; // the ward councillor
}

/** Only verified residents of the ward vote, once. Businesses and organizations don't. */
export function canVote(poll: WardPoll, p: Persona, now: Date = new Date()): { ok: boolean; reason?: string } {
  if (!isPollOpen(poll, now)) return { ok: false, reason: 'This poll has closed.' };
  if (p.group !== 'people' || p.reportMode === 'business') return { ok: false, reason: 'Only residents of the ward can vote. Business owners can vote as themselves (Me).' };
  if (poll.votedBy.includes(p.profileId)) return { ok: false, reason: 'You voted. Thank you.' };
  return { ok: true };
}

export function isPollOpen(poll: WardPoll, now: Date = new Date()): boolean {
  return new Date(`${poll.closesOn}T23:59:59`).getTime() >= now.getTime();
}

/** Results are shown after you vote, when the poll closes, and always to the councillor. */
export function canSeeResults(poll: WardPoll, p: Persona, now: Date = new Date()): boolean {
  return canAskWard(p) || poll.votedBy.includes(p.profileId) || !isPollOpen(poll, now);
}

export function validatePoll(d: PollDraft, today: Date = new Date()): Partial<Record<keyof PollDraft, string>> {
  const e: Partial<Record<keyof PollDraft, string>> = {};
  if (d.question.trim().length < 10) e.question = 'Ask a clear question.';
  const opts = d.options.map((o) => o.trim()).filter(Boolean);
  if (opts.length < 2) e.options = 'Give at least two choices.';
  if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) e.options = 'Each choice must be different.';
  if (!d.closesOn) e.closesOn = 'Choose when voting closes.';
  else if (new Date(`${d.closesOn}T23:59:59`) < today) e.closesOn = 'Choose a date in the future.';
  return e;
}

export function percent(poll: WardPoll): { id: string; label: string; votes: number; pct: number }[] {
  const total = poll.options.reduce((t, o) => t + o.votes, 0);
  return poll.options.map((o) => ({ ...o, pct: total ? Math.round((o.votes / total) * 100) : 0 }));
}

// ---------- roadwork impact for businesses ----------

export const BUSINESS_IMPACT_M = 150; // roadwork this close to a shop affects it

interface PlaceLike {
  id: string;
  name: string;
  category?: string;
  lat?: unknown;
  lng?: unknown;
}
interface UpdateLike {
  id: string;
  kind: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  visibility?: unknown;
  description?: string;
}

const NOT_A_SHOP = /park|vacant|community|bia office/i;

export interface Impact {
  placeId: string;
  name: string;
  roadworkId: string;
  roadwork: string;
  metres: number;
}

/** Shops within 150 m of public roadwork, nearest first. Private requests are never used. */
export function roadworkImpacts(places: PlaceLike[], items: UpdateLike[]): Impact[] {
  const works = publicRoadwork(items);
  const out: Impact[] = [];
  for (const p of places) {
    if (typeof p.lng !== 'number' || typeof p.lat !== 'number' || NOT_A_SHOP.test(p.category ?? '')) continue;
    for (const w of works) {
      const m = metresBetween([p.lng, p.lat], [w.lng, w.lat]);
      if (m <= BUSINESS_IMPACT_M) out.push({ placeId: p.id, name: p.name.replace(/\s*\(demo\)/, ''), roadworkId: w.id, roadwork: w.name, metres: Math.round(m) });
    }
  }
  return out.sort((a, b) => a.metres - b.metres);
}

export const OPEN_NOTICE_MAX = 140;

export function openNoticeText(shop: string): string {
  return `${shop} is open as usual during the roadwork. Use the side entrance.`;
}
