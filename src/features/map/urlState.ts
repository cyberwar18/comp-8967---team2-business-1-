// Task 8: read and write the map state in the page URL.
//   ?c=<lng>,<lat>&z=<zoom>&l=<layer,layer>&pin=<id>
// Absent parameter = default (fit corridor, all layers, nothing selected).
// "l=" with nothing after it = every layer switched off.
import { ALL_LAYER_KEYS, isLayerKey, type LayerKey } from './layers';

export interface MapUrlState {
  center: [number, number] | null;
  zoom: number | null;
  layers: LayerKey[] | null;
  pin: string | null;
}

export function readUrlState(search: string): MapUrlState {
  const p = new URLSearchParams(search);

  let center: [number, number] | null = null;
  const c = p.get('c');
  if (c) {
    const [lng, lat] = c.split(',').map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90) {
      center = [lng, lat];
    }
  }

  let zoom: number | null = null;
  const z = p.get('z');
  if (z !== null && z.trim() !== '') {
    const n = Number(z);
    if (Number.isFinite(n) && n >= 0 && n <= 22) zoom = n;
  }

  let layers: LayerKey[] | null = null;
  if (p.has('l')) {
    const raw = p.get('l') ?? '';
    layers = raw.split(',').filter(isLayerKey);
  }

  const pin = p.get('pin') || null;
  return { center, zoom, layers, pin };
}

export function writeUrlState(state: {
  center: [number, number];
  zoom: number;
  layers: LayerKey[];
  pin: string | null;
}): void {
  const p = new URLSearchParams(window.location.search); // keep unrelated params
  p.set('c', `${state.center[0].toFixed(5)},${state.center[1].toFixed(5)}`);
  p.set('z', state.zoom.toFixed(2));
  if (state.layers.length === ALL_LAYER_KEYS.length) p.delete('l');
  else p.set('l', state.layers.join(','));
  if (state.pin) p.set('pin', state.pin);
  else p.delete('pin');
  const qs = p.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', url);
}
