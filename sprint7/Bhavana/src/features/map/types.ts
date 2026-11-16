// The shape of one item on the map. Same fields as the search feature's MapItem,
// so the two plug together later.
// Places, events, updates and issues come from the search data; offers, business posts and
// BIA polls are added by extras.ts.
export interface MapItem {
  id: string;
  kind: 'place' | 'event' | 'update' | 'issue' | 'offer' | 'post' | 'poll' | 'school';
  name: string;
  category: string;
  status: string;
  lat: number;
  lng: number;
  [extra: string]: unknown; // chip, description, etc. are ignored by the map
}

export interface MapData {
  places: MapItem[];
  events: MapItem[];
  updates: MapItem[]; // also holds the issues
}

export const allItems = (d: MapData): MapItem[] => [...d.places, ...d.events, ...d.updates];

/** An area drawn as an outline, e.g. the ward that handles resident reports. */
export interface WardArea {
  id: string;
  name: string;
  note?: string;
  responsible?: string;
  polygon: [number, number][]; // [lng, lat] corners; the first point is repeated at the end
  labelAt?: [number, number];
}
