// The map layers. One entry per toggle; the colour and letter are also used on the pins
// so type is never shown by colour alone.
// "ward" is an area outline, not a pin layer: it has no pins and is drawn as a dashed line.
export type LayerKey = 'places' | 'events' | 'updates' | 'issues' | 'roadwork' | 'posts' | 'polls' | 'school' | 'marketplace' | 'ward';

export interface LayerDef {
  key: LayerKey;
  label: string;
  color: string; // pin colour (white letter on top has enough contrast)
  glyph: string; // letter drawn inside the pin
  area?: boolean; // true = an outline on the map, not pins
}

export const LAYERS: LayerDef[] = [
  { key: 'places', label: 'Shops and places', color: '#0072B2', glyph: 'P' },
  { key: 'events', label: 'Events', color: '#007A5A', glyph: 'E' },
  { key: 'updates', label: 'Public updates', color: '#B35900', glyph: 'U' },
  { key: 'issues', label: 'Issues', color: '#A33D78', glyph: 'I' },
  { key: 'roadwork', label: 'Roadwork', color: '#C0392B', glyph: 'R' },
  { key: 'posts', label: 'Business posts and offers', color: '#8A6D00', glyph: 'B' },
  { key: 'polls', label: 'BIA polls', color: '#5E3A9E', glyph: 'V' },
  { key: 'school', label: 'School safe routes', color: '#2D6A4F', glyph: 'S' },
  { key: 'marketplace', label: 'Marketplace listings', color: '#7A3E1D', glyph: 'M' }, // KAN-53 (Devu)
  { key: 'ward', label: 'Ward area outline', color: '#2F5D8A', glyph: 'W', area: true },
];

export const ALL_LAYER_KEYS: LayerKey[] = LAYERS.map((l) => l.key);

export function isLayerKey(value: string): value is LayerKey {
  return (ALL_LAYER_KEYS as string[]).includes(value);
}

// Week 8 redesign: each pin layer's icon, drawn white inside a teardrop pin of the layer's colour
// (24 x 24 line icons, the same family as the rest of the app in src/app/Icon.tsx).
export const PIN_ICON: Record<Exclude<LayerKey, 'ward'>, string> = {
  places: '<path d="M3.5 10V20h17V10M2.5 10 5 4h14l2.5 6h-19Z"/><path d="M9 20v-5h6v5"/>',
  events: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  updates: '<path d="M3.5 10v4a1 1 0 0 0 1 1H7l7 4.5v-15L7 9H4.5a1 1 0 0 0-1 1Z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
  issues: '<path d="M12 3.5 21.5 20h-19L12 3.5Z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  roadwork: '<path d="M10 4h4l4.5 14h-13L10 4Z"/><path d="M8.3 10h7.4M7 14h10M3.5 20.5h17"/>',
  posts: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7-8.3-8.3Z"/><circle cx="8" cy="8" r="1.4"/>',
  polls: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  school: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9Z"/><path d="M6 11v5c1.6 1.6 3.6 2.5 6 2.5s4.4-.9 6-2.5v-5"/>',
  marketplace: '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12v8h13v-8"/>',
};

/** A teardrop map pin (32 x 40, drawn at 2x) in the layer's colour with its icon in white. */
export function pinSvg(color: string, iconPaths: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 32 40">' +
    `<path d="M16 38.5C16 38.5 4.2 26.2 4.2 15.2a11.8 11.8 0 0 1 23.6 0C27.8 26.2 16 38.5 16 38.5Z" fill="${color}" stroke="#ffffff" stroke-width="2.4"/>` +
    `<g transform="translate(8.5 7.7) scale(0.625)" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</g>` +
    '</svg>'
  );
}
