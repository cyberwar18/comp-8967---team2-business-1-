// The four main sections of the shell. Navigation uses the URL hash (#/map, #/updates ...)
// so the map's own state in the query string (?c=...&z=...) is left alone.
export type RouteId = 'map' | 'requests' | 'community' | 'updates' | 'chats' | 'marketplace';

export interface RouteDef {
  id: RouteId;
  label: string;
  ready: boolean; // false = placeholder page for a later milestone
}

export const ROUTES: RouteDef[] = [
  { id: 'map', label: 'Map', ready: true },
  { id: 'requests', label: 'Requests', ready: true }, // Sprint 5: My requests / staff work queue
  { id: 'community', label: 'Community', ready: true }, // KAN-42: community organization workspace
  { id: 'updates', label: 'Updates', ready: true }, // Sprint 6: alerts, ward polls, roadwork impact, recently fixed
  { id: 'chats', label: 'Chats', ready: true }, // KAN-51 (Bhavana): messages between people and organizations
  { id: 'marketplace', label: 'Marketplace', ready: false },
];

export const DEFAULT_ROUTE: RouteId = 'map';

/** "#/chats" -> "chats". Anything unknown falls back to the map. */
export function parseRoute(hash: string): RouteId {
  const id = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return ROUTES.some((r) => r.id === id) ? (id as RouteId) : DEFAULT_ROUTE;
}

export const hrefFor = (id: RouteId) => `#/${id}`;
