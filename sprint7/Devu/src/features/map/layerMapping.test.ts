import { describe, expect, it } from 'vitest';
import data from '../../data/mock-data.json';
import { layerOf } from './itemLayer';
import { allItems, type MapData } from './types';
import { readUrlState } from './urlState';
import { ALL_LAYER_KEYS, LAYERS, isLayerKey } from './layers';

const items = allItems(data as unknown as MapData);

describe('layers', () => {
  it('puts every item in exactly one of the five layers', () => {
    const counts: Record<string, number> = {};
    for (const i of items) counts[layerOf(i)] = (counts[layerOf(i)] ?? 0) + 1;
    expect(counts).toEqual({ places: 15, events: 5, updates: 2, issues: 4, roadwork: 2 });
  });
});

describe('new layers', () => {
  it('has the posts, polls, school, marketplace and ward layers, and only the ward is an outline', () => {
    expect(ALL_LAYER_KEYS).toEqual(['places', 'events', 'updates', 'issues', 'roadwork', 'posts', 'polls', 'school', 'marketplace', 'ward']);
    expect(LAYERS.filter((l) => l.area).map((l) => l.key)).toEqual(['ward']);
    expect(isLayerKey('posts') && isLayerKey('polls') && isLayerKey('school') && isLayerKey('ward')).toBe(true);
  });
  it('gives every layer its own letter and colour', () => {
    expect(new Set(LAYERS.map((l) => l.glyph)).size).toBe(LAYERS.length);
    expect(new Set(LAYERS.map((l) => l.color)).size).toBe(LAYERS.length);
  });
  it('keeps the ward area inside a closed polygon near the corridor', () => {
    const w = (data as unknown as { wards: { polygon: [number, number][] }[] }).wards[0];
    expect(w.polygon[0]).toEqual(w.polygon[w.polygon.length - 1]);
    for (const [lng, lat] of w.polygon) {
      expect(Math.abs(lng + 82.968)).toBeLessThan(0.01);
      expect(Math.abs(lat - 42.3285)).toBeLessThan(0.01);
    }
    // every pin on the corridor sits inside the outline
    const xs = w.polygon.map((p) => p[0]);
    const ys = w.polygon.map((p) => p[1]);
    for (const i of items) {
      expect(i.lng).toBeGreaterThan(Math.min(...xs));
      expect(i.lng).toBeLessThan(Math.max(...xs));
      expect(i.lat).toBeGreaterThan(Math.min(...ys));
      expect(i.lat).toBeLessThan(Math.max(...ys));
    }
  });
  it('restores the new layers from a shared link', () => {
    expect(readUrlState('?l=polls,ward').layers).toEqual(['polls', 'ward']);
  });
});

describe('URL state', () => {
  it('restores centre, zoom, layers and pin', () => {
    const s = readUrlState('?c=-82.95,42.33&z=16&l=events,issues&pin=place-01');
    expect(s).toEqual({ center: [-82.95, 42.33], zoom: 16, layers: ['events', 'issues'], pin: 'place-01' });
  });
  it('treats l= as all layers off and ignores bad values', () => {
    expect(readUrlState('?l=').layers).toEqual([]);
    const s = readUrlState('?c=abc&z=99&l=nope');
    expect(s.center).toBeNull();
    expect(s.zoom).toBeNull();
    expect(s.layers).toEqual([]);
  });
});
