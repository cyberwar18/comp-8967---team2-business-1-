// KAN-50 (Purab): your profile and your settings. The rules live here as plain functions so they
// can be tested without a screen; src/data/api.ts stores the choices and applies them.
import type { Persona } from '../requests/requests';

/** The kinds of notification someone can turn on or off. */
export type NoticeKind = 'requests' | 'chats' | 'alerts' | 'community' | 'marketplace';

export const NOTICE_KINDS: { id: NoticeKind; label: string; hint: string }[] = [
  { id: 'requests', label: 'My requests', hint: 'When a request you sent or support is received, handled, needs an answer or is resolved' },
  { id: 'chats', label: 'Messages', hint: 'New messages in Chats' },
  { id: 'alerts', label: 'Area alerts', hint: 'Water shut-offs, roadwork and other alerts near your home area' },
  { id: 'community', label: 'Community and school', hint: 'School notices for parents, and Neighbr staff decisions on your events and reports' },
  { id: 'marketplace', label: 'Marketplace and posts', hint: 'When a listing or post of yours has ended' },
];

export interface UserSettings {
  /** Which notifications reach the bell. All on by default. */
  notify: Record<NoticeKind, boolean>;
  /** A place on the corridor used as your home area for alerts and Marketplace distances. */
  homePlaceId?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  notify: { requests: true, chats: true, alerts: true, community: true, marketplace: true },
};

/** A place someone can pick as their home area. */
export interface HomePlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/** Fill in anything missing (older saved data, or nothing saved yet). */
export function withDefaults(s: Partial<UserSettings> | undefined): UserSettings {
  return {
    notify: { ...DEFAULT_SETTINGS.notify, ...(s?.notify ?? {}) },
    ...(s?.homePlaceId ? { homePlaceId: s.homePlaceId } : {}),
  };
}

/** Who has a home area: people and organizations. Staff work for the whole corridor, so they don't. */
export function hasHomeArea(p: Persona): boolean {
  return p.group === 'people' || p.group === 'organizations';
}

/** Check a change before it is saved. Returns the error to show, or null. */
export function validateSettings(p: Persona, s: UserSettings, places: HomePlace[]): string | null {
  if (s.homePlaceId) {
    if (!hasHomeArea(p)) return 'Staff accounts have no home area: alerts reach them through their work queue.';
    if (!places.some((x) => x.id === s.homePlaceId)) return 'Choose a home area from the list.';
  }
  for (const k of Object.keys(s.notify)) {
    if (!NOTICE_KINDS.some((n) => n.id === k)) return `Unknown notification type "${k}".`;
  }
  return null;
}

/**
 * The person as the rest of the app sees them after their settings: a chosen home area replaces the
 * demo default, so area alerts (Bhavana) and Marketplace distances (Devu) follow it.
 */
export function applySettings(p: Persona, s: UserSettings, places: HomePlace[]): Persona {
  const home = s.homePlaceId ? places.find((x) => x.id === s.homePlaceId) : undefined;
  if (!home || !hasHomeArea(p)) return p;
  return { ...p, home: [home.lng, home.lat] };
}

/** Keep only the notification kinds this person has left on. */
export function keepNotice(s: UserSettings, kind: NoticeKind): boolean {
  return s.notify[kind] !== false;
}

/** The plain name shown on a profile: "Maya R. (demo)" -> "Maya R.". */
export function displayName(p: Persona): string {
  return p.label.replace(/\s*\(demo\)/, '');
}

/** "Community organizer, Riverside Neighbours Network" -> role "Community organizer", org "Riverside Neighbours Network". */
export function roleAndOrg(p: Persona): { role: string; org?: string } {
  const [role, ...rest] = p.title.split(',');
  const org = rest.join(',').trim();
  return org ? { role: role.trim(), org } : { role: role.trim() };
}
