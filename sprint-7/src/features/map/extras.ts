// Business posts, offers and BIA polls for the map.
// These come from their own lists in the mock data (not the search list), and only PUBLIC ones
// ever reach the map. Private items, such as a business's draft post waiting for BIA approval,
// are dropped here for everyone, so the public map can never show them.
import type { MapItem } from './types';

interface RawItem {
  id: string;
  kind: string;
  name: string;
  category?: string;
  status?: string;
  placeId?: string | null;
  lat?: number;
  lng?: number;
  visibility?: string;
  validUntil?: string;
  closesOn?: string;
  [extra: string]: unknown;
}

export interface ExtrasInput {
  places: MapItem[];
  offers?: RawItem[];
  posts?: RawItem[];
  polls?: RawItem[];
}

/** Only items with no visibility setting, or "public", may be drawn on the shared map. */
export function isPublic(item: { visibility?: unknown }): boolean {
  return item.visibility === undefined || item.visibility === 'public';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-10-31" -> "Oct 31" */
export function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}` : iso;
}

// Pins that belong to a place sit a short way off the place's own pin (about 10 m),
// each in its own direction, so they never hide each other.
const NUDGES: [number, number][] = [
  [0.0001, 0.00004],
  [-0.0001, 0.00004],
  [0.0001, -0.00005],
  [-0.0001, -0.00005],
];

/** 2026-11-14 for the day this date falls on, where the person is (a post ends at the end of its last day). */
function localDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildMapExtras(input: ExtrasInput, today: Date = new Date()): MapItem[] {
  const todayIso = today.toISOString().slice(0, 10);
  const used: Record<string, number> = {};
  const out: MapItem[] = [];

  const place = (id?: string | null) => (id ? input.places.find((p) => p.id === id) : undefined);

  const add = (raw: RawItem, kind: 'offer' | 'post' | 'poll') => {
    if (!isPublic(raw)) return; // private: never on the map
    let lat = raw.lat;
    let lng = raw.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      const p = place(raw.placeId);
      if (!p) return; // nowhere to draw it
      const n = used[p.id] ?? 0;
      used[p.id] = n + 1;
      const [dLat, dLng] = NUDGES[n % NUDGES.length];
      lat = p.lat + dLat;
      lng = p.lng + dLng;
    }
    out.push({ ...raw, id: raw.id, kind, name: raw.name, category: raw.category ?? '', status: raw.status ?? '', lat, lng });
  };

  for (const o of input.offers ?? []) {
    if (o.validUntil && o.validUntil < todayIso) continue; // an expired offer comes off the map
    add({ ...o, category: 'Offer', status: o.validUntil ? `until ${shortDate(o.validUntil)}` : 'open' }, 'offer');
  }
  // KAN-53 (Devu): a post with an end date leaves the map after that day (its owner gets a notification).
  const todayLocal = localDay(today);
  for (const p of input.posts ?? []) {
    if (typeof p.endsOn === 'string' && p.endsOn < todayLocal) continue;
    add(p, 'post');
  }
  for (const q of input.polls ?? []) {
    add({ ...q, status: q.status === 'open' && q.closesOn ? `open until ${shortDate(q.closesOn)}` : (q.status ?? '') }, 'poll');
  }
  return out;
}
