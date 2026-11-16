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
