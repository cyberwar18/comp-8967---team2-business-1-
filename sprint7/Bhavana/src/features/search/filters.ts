// Search and filter logic for the map (KAN-9).
// Kept separate from the UI so it is easy to test and reuse with the real map later.

export type ChipId = 'all' | 'shops' | 'services' | 'community' | 'events' | 'updates' | 'issues' | 'vacant';

export interface Chip {
  id: ChipId;
  label: string;
}

// One thing that can show up as a pin and a card: a place, event, update or issue.
export interface MapItem {
  id: string;
  kind: 'place' | 'event' | 'update' | 'issue';
  chip: ChipId;
  name: string;
  category: string;
  status: string;
  lat: number;
  lng: number;
  description?: string;
  placeId?: string | null;
  illustrative: boolean;
  [extra: string]: unknown; // other fields in the data (start, end, visibility...) are carried along untouched
}

export interface MockData {
  meta: { title: string; label: string };
  chips: Chip[];
  places: MapItem[];
  events: MapItem[];
  updates: MapItem[];
}

// Put places, events, updates and issues into one list so search and chips work on all of them.
export function getAllItems(data: MockData): MapItem[] {
  return [...data.places, ...data.events, ...data.updates];
}

// Lowercase and trim so "  Bakery " and "bakery" match the same things.
function normalize(text: string): string {
  return text.toLowerCase().trim();
}

// An item matches when every word typed appears in its name or category.
// Example: "bakery cafe" matches Rosa's Bakery (category "Bakery and cafe").
export function matchesQuery(item: MapItem, query: string): boolean {
  return matchesWords(`${item.name} ${item.category}`, query);
}

// Same rule for any text, so other lists can reuse the search (KAN-42 members list).
// Every typed word has to appear somewhere in the text; an empty search matches everything.
export function matchesWords(text: string, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(text);
  return words.every((word) => haystack.includes(word));
}

// "All" lets everything through; any other chip only keeps items tagged with it.
export function matchesChip(item: MapItem, chip: ChipId): boolean {
  return chip === 'all' || item.chip === chip;
}

// The one function the map and the card list both use, so pins and cards always agree.
export function applyFilters(items: MapItem[], query: string, chip: ChipId): MapItem[] {
  return items.filter((item) => matchesChip(item, chip) && matchesQuery(item, query));
}

// The map moves to this item after a search. Returns null when nothing matched.
export function firstResult(results: MapItem[]): MapItem | null {
  return results.length > 0 ? results[0] : null;
}
