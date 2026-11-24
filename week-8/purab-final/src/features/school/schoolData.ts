// Logic for the school workspace (KAN-43, Devu).
// No UI in here, so every rule can be tested on its own:
//   - who sees which notice (public / all parents / one grade) and who may post (staff only)
//   - the safe walking routes, and the roadwork alert when roadwork is close to the school or a route
//   - no student information is ever part of what the public or a parent view returns
// All data is illustrative. A school here is a demo school near the corridor.

export type SchoolRole = 'public' | 'parent' | 'staff';
export const ROLE_LABEL: Record<SchoolRole, string> = { public: 'Public (you)', parent: 'Parent (demo)', staff: 'Staff (demo)' };
// The same four roles the team's shared workspace uses (Admin, Staff, Member, Public): a parent is a Member here.

export type Audience = 'public' | 'parents' | `grade-${string}`;
export const GRADES = ['2', '5'] as const; // the grades this demo school posts to

export interface Crossing {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

export interface Route {
  id: string;
  name: string;
  from: string;
  minutes: number;
  coords: [number, number][]; // [lng, lat] points, last one is the school
  crossings: Crossing[];
}

export interface School {
  id: string;
  kind: 'school';
  orgId: string; // the matching organization in the community workspace
  name: string;
  lat: number;
  lng: number;
  zoneRadiusM: number;
  routes: Route[];
  demo: { staffName: string; parentGrades: string[] };
  illustrative: boolean;
}

export interface Notice {
  id: string;
  kind: 'school-notice';
  schoolId: string;
  type: 'notice' | 'event';
  title: string;
  body: string;
  audience: Audience;
  date?: string; // YYYY-MM-DDTHH:MM, events only
  postedBy: string;
  posted: string; // YYYY-MM-DD
  illustrative: boolean;
}

/** What each role is allowed to do, shown on screen. */
export const ROLE_HELP: Record<SchoolRole, string> = {
  public: 'You see public notices and events, the safe routes and the roadwork alert.',
  parent: 'You also see notices for all parents and for your own child\'s grade, and nothing meant for other grades.',
  staff: 'You see every notice and you are the only one who can post.',
};

// ---------- who sees what ----------

export interface Viewer {
  role: SchoolRole;
  grades: string[]; // a parent's own children's grades; only used for the parent role
}

export function audienceLabel(a: Audience): string {
  if (a === 'public') return 'Public';
  if (a === 'parents') return 'All parents';
  return `Grade ${a.slice('grade-'.length)} parents`;
}

export function canSeeNotice(n: Notice, viewer: Viewer): boolean {
  if (n.audience === 'public') return true;
  if (viewer.role === 'staff') return true;
  if (viewer.role === 'parent') return n.audience === 'parents' || viewer.grades.some((g) => n.audience === `grade-${g}`);
  return false;
}

/** Notices and events this viewer may see: upcoming events by date first, then notices, newest first. */
export function noticesFor(all: Notice[], schoolId: string, viewer: Viewer): Notice[] {
  return all
    .filter((n) => n.schoolId === schoolId && canSeeNotice(n, viewer))
    .sort((a, b) => (a.type === b.type ? (a.type === 'event' ? (a.date ?? '').localeCompare(b.date ?? '') : b.posted.localeCompare(a.posted)) : a.type === 'event' ? -1 : 1));
}

/** The only role that may post. Parents and the public never see the form. */
export function canPost(role: SchoolRole): boolean {
  return role === 'staff';
}

// ---------- the post form ----------

export const TITLE_MAX = 80;
export const BODY_MAX = 300;

export interface NoticeDraft {
  type: 'notice' | 'event';
  title: string;
  body: string;
  audience: Audience;
  date: string; // YYYY-MM-DD, events only
  time: string; // HH:MM, events only
}

export type NoticeErrors = Partial<Record<keyof NoticeDraft, string>>;
export const EMPTY_NOTICE: NoticeDraft = { type: 'notice', title: '', body: '', audience: 'public', date: '', time: '' };

function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function validateNotice(draft: NoticeDraft, today: Date = new Date()): NoticeErrors {
  const errors: NoticeErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'Give the notice a title.';
  else if (title.length > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`;
  if (!draft.body.trim()) errors.body = 'Write the message.';
  else if (draft.body.length > BODY_MAX) errors.body = `Keep the message under ${BODY_MAX} characters.`;
  if (draft.type === 'event') {
    if (!draft.date) errors.date = 'Pick a date.';
    else if (draft.date < isoDay(today)) errors.date = 'The date has already passed.';
    if (!draft.time) errors.time = 'Pick a start time.';
  }
  return errors;
}

/** Builds the post. Throws unless the poster is staff: only staff can post. */
export function buildNotice(draft: NoticeDraft, role: SchoolRole, school: School, id: string, today: Date = new Date()): Notice {
  if (!canPost(role)) throw new Error('Only school staff can post notices');
  return {
    id,
    kind: 'school-notice',
    schoolId: school.id,
    type: draft.type,
    title: draft.title.trim(),
    body: draft.body.trim(),
    audience: draft.audience,
    date: draft.type === 'event' ? `${draft.date}T${draft.time}` : undefined,
    postedBy: school.demo.staffName,
    posted: isoDay(today),
    illustrative: true,
  };
}

// ---------- distances and the roadwork alert ----------

type LngLat = [number, number];

/** Metres between two points (flat-earth maths is accurate enough over a few hundred metres). */
export function metresBetween(a: LngLat, b: LngLat): number {
  const midLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * 111320 * Math.cos(midLat);
  const dy = (b[1] - a[1]) * 110574;
  return Math.hypot(dx, dy);
}

/** Shortest distance in metres from a point to a walking route (a line of points). */
export function distanceToRouteM(point: LngLat, coords: LngLat[]): number {
  if (coords.length === 0) return Infinity;
  if (coords.length === 1) return metresBetween(point, coords[0]);
  const lat0 = (point[1] * Math.PI) / 180;
  const toXY = (c: LngLat): [number, number] => [(c[0] - point[0]) * 111320 * Math.cos(lat0), (c[1] - point[1]) * 110574];
  let best = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const [ax, ay] = toXY(coords[i]);
    const [bx, by] = toXY(coords[i + 1]);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

export interface Roadwork {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

interface UpdateLike {
  id: string;
  kind: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  visibility?: unknown;
}

/**
 * The roadwork a school alert may use: updates and issues about roadwork that are PUBLIC.
 * A business's private request to the BIA (e.g. the bakery's blocked sidewalk) is never used.
 */
export function publicRoadwork(items: UpdateLike[]): Roadwork[] {
  return items
    .filter((i) => (i.kind === 'update' || i.kind === 'issue') && /roadwork/i.test(i.category))
    .filter((i) => i.visibility === undefined || i.visibility === 'public')
    .map((i) => ({ id: i.id, name: i.name, lng: i.lng, lat: i.lat }));
}

export const ROUTE_ALERT_M = 100; // roadwork this close to a walking route affects it
export const SCHOOL_ALERT_M = 250; // roadwork this close to the school is worth an alert

export interface RouteStatus {
  route: Route;
  affected: boolean;
  nearest?: { roadwork: Roadwork; metres: number }; // the closest roadwork within range
}

export function routeStatuses(school: School, roadworks: Roadwork[]): RouteStatus[] {
  return school.routes.map((route) => {
    let nearest: RouteStatus['nearest'];
    for (const rw of roadworks) {
      const metres = distanceToRouteM([rw.lng, rw.lat], route.coords);
      if (metres <= ROUTE_ALERT_M && (!nearest || metres < nearest.metres)) nearest = { roadwork: rw, metres };
    }
    return { route, affected: nearest !== undefined, nearest };
  });
}

export interface SchoolAlert {
  active: boolean;
  nearSchool: { roadwork: Roadwork; metres: number }[]; // roadwork within SCHOOL_ALERT_M of the school, closest first
  statuses: RouteStatus[];
  headline: string;
  lines: string[]; // one per affected route
  advice: string;
}

const round10 = (m: number) => Math.max(10, Math.round(m / 10) * 10);

/** The alert for parents and neighbours: is there roadwork near the school, and which routes does it touch? */
export function schoolAlert(school: School, roadworks: Roadwork[]): SchoolAlert {
  const nearSchool = roadworks
    .map((roadwork) => ({ roadwork, metres: metresBetween([school.lng, school.lat], [roadwork.lng, roadwork.lat]) }))
    .filter((x) => x.metres <= SCHOOL_ALERT_M)
    .sort((a, b) => a.metres - b.metres);
  const statuses = routeStatuses(school, roadworks);
  const affected = statuses.filter((s) => s.affected);
  const clear = statuses.filter((s) => !s.affected);
  const active = nearSchool.length > 0 || affected.length > 0;

  const headline = active
    ? nearSchool.length > 0
      ? `Roadwork near the school: ${nearSchool[0].roadwork.name}, about ${round10(nearSchool[0].metres)} m away.`
      : `Roadwork near a walking route: ${affected[0].nearest!.roadwork.name}.`
    : 'No roadwork near the school or its walking routes.';
  const lines = affected.map((s) => `${s.route.name} passes within ${round10(s.nearest!.metres)} m of ${s.nearest!.roadwork.name}.`);
  const advice = !active
    ? ''
    : affected.length === 0
      ? 'Both walking routes are clear. Take care near the work.'
      : clear.length > 0
        ? `Use ${clear.map((s) => s.route.name).join(' or ')} instead.`
        : 'Every walking route is affected. Take extra care and cross only at the crosswalks.';
  return { active, nearSchool, statuses, headline, lines, advice };
}

/** The alert as one line of text, used in the map popup. */
export function alertText(a: SchoolAlert): string {
  return a.active ? [a.headline, ...a.lines, a.advice].filter(Boolean).join(' ') : a.headline;
}

// ---------- the school area on the map ----------

/** A ring of points around the school (closed: the first point is repeated at the end). */
export function zonePolygon(school: Pick<School, 'lat' | 'lng' | 'zoneRadiusM'>, steps = 48): LngLat[] {
  const ring: LngLat[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const dLat = (school.zoneRadiusM * Math.sin(a)) / 110574;
    const dLng = (school.zoneRadiusM * Math.cos(a)) / (111320 * Math.cos((school.lat * Math.PI) / 180));
    ring.push([school.lng + dLng, school.lat + dLat]);
  }
  ring.push(ring[0]);
  return ring;
}

/** The school's shapes for the map: the zone, each route (marked when roadwork is near) and the crosswalks. */
export function schoolGeoJson(schools: School[], roadworks: Roadwork[]) {
  const features: GeoJSON.Feature[] = [];
  for (const school of schools) {
    features.push({ type: 'Feature', properties: { part: 'zone', label: school.name }, geometry: { type: 'Polygon', coordinates: [zonePolygon(school)] } });
    for (const s of routeStatuses(school, roadworks)) {
      features.push({
        type: 'Feature',
        properties: { part: 'route', affected: s.affected, label: s.affected ? `${s.route.name} (roadwork near)` : `${s.route.name} (clear)` },
        geometry: { type: 'LineString', coordinates: s.route.coords },
      });
      for (const c of s.route.crossings) {
        features.push({ type: 'Feature', properties: { part: 'crossing', label: c.name }, geometry: { type: 'Point', coordinates: [c.lng, c.lat] } });
      }
    }
  }
  return { type: 'FeatureCollection' as const, features };
}

/** The school as a pin for the map (layer "School safe routes"), with the alert in its popup. */
export function schoolPin(school: School, roadworks: Roadwork[]) {
  const alert = schoolAlert(school, roadworks);
  return {
    id: school.id,
    kind: 'school' as const,
    name: school.name,
    category: 'School safe routes',
    status: alert.active ? 'roadwork near' : 'routes clear',
    lat: school.lat,
    lng: school.lng,
    description: alertText(alert),
    illustrative: true,
  };
}

// ---------- Sprint 6: "Viewing as" decides the school view ----------

/** The school view for whoever the demo is "viewing as". Only the school's own people get more than the public view. */
export function schoolRoleFor(persona: { schoolRole?: SchoolRole } | undefined): SchoolRole {
  return persona?.schoolRole ?? 'public';
}

// ---------- Sprint 6: the school sends a request to the City ----------
// A school sends a request like any other user (Nigel, Nov 2): to whoever is responsible, here the
// City (311), with a copy to the ward councillor. It starts private. It reaches the public map only
// when the City resolves it and publishes the outcome, and then only as a title and an outcome.

export interface SchoolRequestType {
  id: string;
  label: string;
  short: string; // used in the title: "<short> near <place>"
  category: string;
  needsNote?: boolean;
}

export const SCHOOL_REQUEST_TYPES: SchoolRequestType[] = [
  { id: 'crosswalk', label: 'Crosswalk or signal problem', short: 'Crosswalk problem', category: 'Roads' },
  { id: 'sidewalk', label: 'Sidewalk problem', short: 'Sidewalk problem', category: 'Sidewalks' },
  { id: 'pothole', label: 'Pothole or road damage', short: 'Pothole', category: 'Roads' },
  { id: 'streetlight', label: 'Street light out', short: 'Street light out', category: 'Street lights' },
  { id: 'other', label: 'Something else', short: 'Problem', category: 'Other', needsNote: true },
];

export const REQUEST_NOTE_MAX = 300;

export interface RequestPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/** Where the problem can be: the school itself, each crosswalk, each route's start. */
export function requestPlaces(school: School): RequestPlace[] {
  const seen = new Set<string>();
  const out: RequestPlace[] = [{ id: school.id, name: school.name.replace(/\s*\(demo\)/, ''), lat: school.lat, lng: school.lng }];
  for (const r of school.routes) {
    for (const c of r.crossings) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ id: c.id, name: c.name, lat: c.lat, lng: c.lng });
    }
  }
  return out;
}

export interface SchoolRequestDraft {
  typeId: string;
  placeId: string;
  note: string;
  /** Nigel (Nov 2): the sender chooses. Private: only the school and the City. Public: on the map. */
  share?: 'private' | 'public';
}
export type SchoolRequestErrors = Partial<Record<keyof SchoolRequestDraft, string>>;
export const EMPTY_SCHOOL_REQUEST: SchoolRequestDraft = { typeId: '', placeId: '', note: '' };

/** Only school staff send requests for the school. */
export const canSendRequest = (role: SchoolRole): boolean => role === 'staff';

export function validateSchoolRequest(school: School, draft: SchoolRequestDraft): SchoolRequestErrors {
  const errors: SchoolRequestErrors = {};
  const type = SCHOOL_REQUEST_TYPES.find((t) => t.id === draft.typeId);
  if (!type) errors.typeId = 'Choose what the problem is.';
  if (!requestPlaces(school).some((p) => p.id === draft.placeId)) errors.placeId = 'Choose where it is.';
  const note = draft.note.trim();
  if (note.length > REQUEST_NOTE_MAX) errors.note = `Keep the details under ${REQUEST_NOTE_MAX} characters.`;
  else if (type?.needsNote && note.length < 5) errors.note = 'Describe the problem in a few words.';
  return errors;
}

interface ProfileLite {
  id: string;
  name: string;
  role: string;
}

const plain = (name: string) => name.replace(/\s*\((demo|illustrative)\)/gi, '').trim();

/**
 * The new request as a map item, in the same shape as a resident's report, so the request system
 * (work queue, My requests, status on the map) handles it with no special case. It goes to the
 * City, with a copy to the ward councillor, and starts private.
 */
export function buildSchoolRequest(
  school: School,
  draft: SchoolRequestDraft,
  senderId: string,
  profiles: ProfileLite[],
  role: SchoolRole,
  id: string,
  now: Date = new Date(),
) {
  if (!canSendRequest(role)) throw new Error('Only school staff can send a request for the school');
  const type = SCHOOL_REQUEST_TYPES.find((t) => t.id === draft.typeId);
  const place = requestPlaces(school).find((p) => p.id === draft.placeId);
  const city = profiles.find((p) => p.role === 'city');
  const councillor = profiles.find((p) => p.role === 'councillor');
  if (!type || !place || !city) throw new Error('A school request needs a type, a place and the City to receive it');
  return {
    id,
    kind: 'issue' as const,
    chip: 'issues',
    name: `${type.short} near ${place.name}`,
    category: type.category,
    status: 'reported',
    description: draft.note.trim() || undefined,
    // a few metres off the spot, so the pin doesn't sit exactly on the crosswalk's own marker
    lat: place.lat + 0.00006,
    lng: place.lng,
    reportedBy: senderId,
    placeId: null,
    visibility: draft.share === 'public' ? 'public' : 'private until approved',
    updatedAt: now.toISOString().slice(0, 10),
    illustrative: true,
    routedTo: [city, councillor].filter(Boolean).map((p) => plain((p as ProfileLite).name)).join(' / ') + ' (demo)',
    routedToProfile: city.id,
    ...(councillor ? { ccProfile: councillor.id } : {}),
  };
}
