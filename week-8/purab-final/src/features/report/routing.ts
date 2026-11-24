// KAN-35 (Purab): "Report a problem". Who a report goes to, and what the new report looks like.
// No UI here, so it is easy to test.
//
// Follows Nigel's feedback (office hours, Oct 19):
//   - A resident's report (pothole, street light, sidewalk...) goes to whoever is responsible:
//     the City (311) or the ward councillor. Never the BIA.
//   - A business's request goes to its BIA, which follows up with the City if needed.
// Recipients are looked up by role in the data, so this keeps working when real profiles arrive.
import { distanceM, profileById, type CardData, type Item, type Mode, type Profile, type Role } from '../cards/cardData';

export interface ReportType {
  id: string;
  label: string; // shown in the form
  short: string; // used in the report's title: "<short> near <place>"
  category: string; // stored on the report (shown on its card)
  to: Role; // who receives it
  cc?: Role; // who gets a copy
  why: string; // one line telling the person why it goes there
  needsNote?: boolean; // "Something else" needs a description
}

export const RESIDENT_TYPES: ReportType[] = [
  { id: 'pothole', label: 'Pothole or road damage', short: 'Pothole', category: 'Roads', to: 'city', cc: 'councillor', why: 'Roads are repaired by the City. Your ward councillor gets a copy.' },
  { id: 'streetlight', label: 'Street light out', short: 'Street light out', category: 'Street lights', to: 'city', cc: 'councillor', why: 'Street lights are fixed by the City. Your ward councillor gets a copy.' },
  { id: 'sidewalk', label: 'Sidewalk problem', short: 'Sidewalk problem', category: 'Sidewalks', to: 'city', cc: 'councillor', why: 'Sidewalks are maintained by the City. Your ward councillor gets a copy.' },
  { id: 'garbage', label: 'Garbage or recycling', short: 'Garbage or recycling problem', category: 'Garbage and recycling', to: 'city', why: 'Garbage and recycling are handled by the City.' },
  { id: 'park', label: 'Park or tree', short: 'Park or tree problem', category: 'Parks', to: 'councillor', cc: 'city', why: 'Your ward councillor follows up on parks with the City.' },
  { id: 'other', label: 'Something else', short: 'Problem', category: 'Other', to: 'councillor', why: 'Your ward councillor can pass it to the right person.', needsNote: true },
];

export const BUSINESS_TYPES: ReportType[] = [
  { id: 'access', label: 'Roadwork or access blocking my shop', short: 'Access blocked', category: 'Roadworks and access', to: 'bia', why: 'Your BIA follows up with the City and can post a public notice.' },
  { id: 'business-update', label: 'Moved, new hours or closing', short: 'Business update', category: 'Business update', to: 'bia', why: 'Your BIA keeps the corridor directory up to date.' },
  { id: 'corridor', label: 'Corridor problem (lights, litter, safety)', short: 'Corridor problem', category: 'Corridor', to: 'bia', why: 'Your BIA looks after the corridor and contacts the City if needed.' },
  { id: 'other-business', label: 'Something else', short: 'Request', category: 'Other', to: 'bia', why: 'Your BIA can pass it to the right person.', needsNote: true },
];

export const NOTE_MAX = 500;

export function typesFor(mode: Mode): ReportType[] {
  return mode === 'business' ? BUSINESS_TYPES : RESIDENT_TYPES;
}

export function typeById(mode: Mode, id: string): ReportType | undefined {
  return typesFor(mode).find((t) => t.id === id);
}

/** First profile with this role. A ward's own responders come first (the councillor for this ward). */
function profileForRole(data: CardData, role: Role): Profile | undefined {
  const wardIds = (data.wards ?? []).flatMap((w) => w.responsibleProfiles ?? []);
  const inWard = wardIds.map((id) => profileById(data, id)).find((p) => p?.role === role);
  return inWard ?? data.profiles.find((p) => p.role === role);
}

/** Who receives a report of this type, and who gets a copy. */
export function routeFor(data: CardData, type: ReportType): { to?: Profile; cc?: Profile } {
  return { to: profileForRole(data, type.to), cc: type.cc ? profileForRole(data, type.cc) : undefined };
}

/** "City of Windsor 311 (demo)" -> "City of Windsor 311". */
export function plainName(name: string): string {
  return name.replace(/\s*\((demo|illustrative)\)/gi, '').trim();
}

/** Places sorted nearest first, for the "Where is it?" list. */
export function placesNearest(data: CardData, from: [number, number]): Item[] {
  const withPos = data.places.filter((p) => typeof p.lng === 'number' && typeof p.lat === 'number');
  return [...withPos].sort(
    (a, b) => distanceM(from, [a.lng as number, a.lat as number]) - distanceM(from, [b.lng as number, b.lat as number]),
  );
}

export interface ReportDraft {
  typeId: string;
  placeId: string;
  note: string;
  /** Sprint 6 (Nigel, Nov 2): the sender chooses. Private (default) or posted on the map for everyone. */
  share?: 'private' | 'public';
  /** Sprint 6: a photo of the problem (data URL in the demo). */
  photo?: string;
  /** Sprint 6: the exact spot, picked on the map ([lng, lat]). Used instead of the place list. */
  point?: [number, number];
}

export type DraftErrors = Partial<Record<keyof ReportDraft, string>>;

export function validateDraft(mode: Mode, draft: ReportDraft): DraftErrors {
  const errors: DraftErrors = {};
  const type = typeById(mode, draft.typeId);
  if (!type) errors.typeId = 'Choose what the problem is.';
  if (!draft.placeId && !draft.point) errors.placeId = 'Choose where it is, from the list or on the map.';
  const note = draft.note.trim();
  if (note.length > NOTE_MAX) errors.note = `Keep the details under ${NOTE_MAX} characters.`;
  else if (type?.needsNote && note.length < 5) errors.note = 'Describe the problem in a few words.';
  return errors;
}

let counter = 0;

/**
 * The new report, in the same shape as the issues in mock-data.json, so every existing screen
 * (pins, Around you, My reports, the place card's "Sent to" row) shows it without changes.
 * It starts at the Reported step and stays private until the receiver approves it.
 */
export function buildReport(
  data: CardData,
  mode: Mode,
  viewerId: string,
  draft: ReportDraft,
  now: Date = new Date(),
): Item {
  const type = typeById(mode, draft.typeId);
  // A spot picked on the map is named after the nearest place ("Street light out near Second Spin Cycles").
  const place = draft.point ? placesNearest(data, draft.point)[0] : data.places.find((p) => p.id === draft.placeId);
  if (!type || !place) throw new Error('buildReport needs a valid type and place (call validateDraft first)');
  const { to, cc } = routeFor(data, type);
  counter += 1;
  return {
    id: `report-${now.getTime().toString(36)}-${counter}`,
    kind: 'issue',
    chip: 'issues',
    name: `${type.short} near ${plainName(place.name)}`,
    category: type.category,
    status: 'reported',
    description: draft.note.trim() || undefined,
    // On the spot picked on the map, or a few metres from the place so it doesn't sit on the shop's pin.
    lat: draft.point ? draft.point[1] : (place.lat as number) + 0.00006,
    lng: draft.point ? draft.point[0] : (place.lng as number),
    reportedBy: viewerId,
    placeId: place.id,
    visibility: draft.share === 'public' ? 'public' : 'private until approved',
    ...(draft.photo ? { photo: draft.photo } : {}),
    ...(draft.point ? { point: draft.point } : {}),
    updatedAt: now.toISOString().slice(0, 10),
    illustrative: true,
    routedTo: [to, cc].filter(Boolean).map((p) => plainName((p as Profile).name)).join(' / ') + ' (demo)',
    routedToProfile: to?.id,
    ...(cc ? { ccProfile: cc.id } : {}),
  };
}

// ---------------------------------------------------------------------------------------------
// Week 8 (pitch): "Describe it in your own words". Simple keyword matching (no AI, works offline):
// it suggests the problem type and the place, and the person confirms with "Use this".
// English and French words, so it works in both languages.

const TYPE_WORDS: Record<string, string[]> = {
  pothole: ['pothole', 'pot hole', 'hole in the road', 'road', 'asphalt', 'crack in the road', 'bump', 'nid-de-poule', 'nid de poule', 'chaussée'],
  streetlight: ['light', 'lamp', 'bulb', 'dark', 'flicker', 'streetlight', 'lampadaire', 'éclairage', 'lumière'],
  sidewalk: ['sidewalk', 'curb', 'ramp', 'trip', 'pavement', 'uneven', 'slab', 'trottoir', 'bordure'],
  garbage: ['garbage', 'trash', 'bin', 'litter', 'recycl', 'dump', 'overflow', 'rubbish', 'ordure', 'poubelle', 'déchet', 'recyclage'],
  park: ['park', 'tree', 'branch', 'bench', 'grass', 'parkette', 'leaves', 'parc', 'arbre', 'branche', 'banc'],
  access: ['roadwork', 'road work', 'blocked', 'access', 'detour', 'construction', 'entrance', 'travaux', 'accès', 'bloqu'],
  'business-update': ['hours', 'moved', 'moving', 'closing', 'new address', 'heures', 'déménag', 'fermeture'],
  corridor: ['litter', 'graffiti', 'safety', 'unsafe', 'light', 'lamp', 'corridor', 'sécurité', 'déchet'],
};

/** Words that say nothing about a place ("the", "and", common shop words used by several places). */
const PLACE_STOP = new Set(['the', 'and', 'near', 'demo', 'shop', 'store', 'wyandotte', 'street', 'olde', 'riverside', 'corner']);

function words(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/'s\b/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !PLACE_STOP.has(w));
}

export interface Suggestion {
  typeId?: string;
  placeId?: string;
}

/**
 * Suggest a problem type and a place from what the person wrote.
 * The type with the most matching keywords wins (ties: the first in the form's order).
 * A place matches when a distinctive word of its name (4+ letters) appears in the text.
 */
export function suggestFromText(text: string, types: ReportType[], places: { id: string; name: string }[]): Suggestion {
  const t = ` ${text.toLowerCase()} `;
  const plain = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (text.trim().length < 3) return {};
  let best: { id: string; score: number } | null = null;
  for (const type of types) {
    const score = (TYPE_WORDS[type.id] ?? []).reduce((n, w) => {
      const ww = w.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return plain.includes(ww) ? n + 1 : n;
    }, 0);
    if (score > 0 && (!best || score > best.score)) best = { id: type.id, score };
  }
  const textWords = new Set(words(text));
  let place: { id: string; score: number } | null = null;
  for (const p of places) {
    const score = words(p.name).filter((w) => textWords.has(w) || [...textWords].some((tw) => tw.startsWith(w) || w.startsWith(tw))).length;
    if (score > 0 && (!place || score > place.score)) place = { id: p.id, score };
  }
  return { ...(best ? { typeId: best.id } : {}), ...(place ? { placeId: place.id } : {}) };
}
