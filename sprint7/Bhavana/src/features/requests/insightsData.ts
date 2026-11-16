// Sprint 6 (Bhavana): Corridor pulse and the board report.
// What a City team, the BIA or the ward councillor wants to know about the requests they handle:
// how many, what kind, where they cluster, how fast they are fixed, what is late, and whether the
// people who sent them say they were fixed. No UI here, so it can be tested.
import { isOpen, overdueDays, type ServiceRequest } from './requests';

export interface PlaceLike {
  id: string;
  name: string;
  lat?: unknown;
  lng?: unknown;
}

export interface Insights {
  total: number;
  open: number;
  overdue: number;
  resolved: number;
  resolvedThisMonth: number;
  /** Average days from sent to resolved, one decimal (null when nothing is resolved yet). */
  avgDaysToResolve: number | null;
  /** Share of rated requests the sender says were fixed (0–100), null if none rated. */
  fixedRate: number | null;
  rated: number;
  supporters: number;
  thisMonth: number;
  lastMonth: number;
  byCategory: { category: string; count: number; open: number }[];
  hotspots: { placeId: string; name: string; count: number; lng: number; lat: number }[];
  mostSupported: ServiceRequest | null;
}

const DAY = 86400000;
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

export function summarize(list: ServiceRequest[], places: PlaceLike[], now: Date = new Date()): Insights {
  const resolved = list.filter((r) => r.state === 'resolved' && r.resolvedAt);
  const days = resolved.map((r) => (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / DAY);
  const rated = list.filter((r) => r.rating);
  const thisKey = monthKey(now);
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const lastKey = monthKey(last);

  const cats = new Map<string, { count: number; open: number }>();
  for (const r of list) {
    const c = cats.get(r.category) ?? { count: 0, open: 0 };
    c.count += 1;
    if (isOpen(r.state)) c.open += 1;
    cats.set(r.category, c);
  }

  const spots = new Map<string, number>();
  for (const r of list) if (r.placeId) spots.set(r.placeId, (spots.get(r.placeId) ?? 0) + 1 + (r.supporters?.length ?? 0));
  const hotspots = [...spots.entries()]
    .map(([placeId, count]) => {
      const p = places.find((x) => x.id === placeId);
      return p && typeof p.lng === 'number' && typeof p.lat === 'number'
        ? { placeId, name: p.name.replace(/\s*\(demo\)/, ''), count, lng: p.lng, lat: p.lat }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.count - a.count);

  const supported = [...list].sort((a, b) => (b.supporters?.length ?? 0) - (a.supporters?.length ?? 0));

  return {
    total: list.length,
    open: list.filter((r) => isOpen(r.state)).length,
    overdue: list.filter((r) => overdueDays(r, now) > 0).length,
    resolved: resolved.length,
    resolvedThisMonth: resolved.filter((r) => monthKey(new Date(r.resolvedAt!)) === thisKey).length,
    avgDaysToResolve: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null,
    fixedRate: rated.length ? Math.round((rated.filter((r) => r.rating!.value === 'fixed').length / rated.length) * 100) : null,
    rated: rated.length,
    supporters: list.reduce((t, r) => t + (r.supporters?.length ?? 0), 0),
    thisMonth: list.filter((r) => monthKey(new Date(r.createdAt)) === thisKey).length,
    lastMonth: list.filter((r) => monthKey(new Date(r.createdAt)) === lastKey).length,
    byCategory: [...cats.entries()].map(([category, c]) => ({ category, ...c })).sort((a, b) => b.count - a.count),
    hotspots,
    mostSupported: supported[0] && (supported[0].supporters?.length ?? 0) > 0 ? supported[0] : null,
  };
}

/** The one-page board report, as plain sentences ("You said, we did" with numbers). */
export function boardReport(org: string, i: Insights, list: ServiceRequest[], now: Date = new Date()): { title: string; lines: string[]; fixed: string[] } {
  const month = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const trend =
    i.lastMonth === 0 ? `${i.thisMonth} requests this month.` : `${i.thisMonth} requests this month, compared with ${i.lastMonth} last month.`;
  const lines = [
    trend,
    `${i.open} open, ${i.resolved} resolved${i.overdue ? `, ${i.overdue} overdue` : ''}.`,
    i.avgDaysToResolve !== null ? `On average a request was resolved in ${i.avgDaysToResolve} days.` : 'No requests resolved yet.',
    i.fixedRate !== null ? `${i.fixedRate}% of people who rated the result said it was fixed (${i.rated} rated).` : 'No ratings yet.',
    i.byCategory.length ? `Most common: ${i.byCategory.slice(0, 3).map((c) => `${c.category.toLowerCase()} (${c.count})`).join(', ')}.` : '',
    i.hotspots.length ? `Where: ${i.hotspots.slice(0, 3).map((h) => `${h.name} (${h.count})`).join(', ')}.` : '',
    i.supporters ? `Neighbours added their support ${i.supporters} times instead of sending duplicates.` : '',
  ].filter(Boolean);
  const fixed = list
    .filter((r) => r.state === 'resolved')
    .map((r) => {
      const done = [...r.history].reverse().find((h) => h.action === 'resolve')?.text;
      return `${r.title}${done ? `: ${done}` : ''}`;
    });
  return { title: `${org}: ${month} report`, lines, fixed };
}
