import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Map as MlMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type IControl,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'; // lets Vite bundle MapLibre's background worker
import './CorridorMap.css';
import type { Feature, Point as GeoPoint } from 'geojson';
import { ALL_LAYER_KEYS, LAYERS, PIN_ICON, pinSvg, type LayerKey } from './layers';
import type { MapItem, WardArea } from './types';
import { layerOf } from './itemLayer';
import { issueSteps, issueStepsLabel } from './popupSteps';
import { readUrlState, writeUrlState } from './urlState';
import { buildPollSection } from './pollPopup';
import type { PollState } from './polls';
import { shortDate } from './extras';
import { phaseOf, isClosedWithoutFix } from './requestStatus';

// ---- Task 5: free basemap, no API key -------------------------------------
// Main style: OpenFreeMap "Positron", a clean light vector map built from OpenStreetMap
// data. Free, no key, made for MapLibre. If it can't load, we fall back to the
// standard OpenStreetMap raster tiles so the map never stays blank.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};
const FONT = ['Noto Sans Regular']; // available in both the Positron style and the fallback glyphs
const SOURCE_ID = 'map-features';
const WARD_SOURCE = 'ward-area';
const SCHOOL_SOURCE = 'school-area'; // KAN-43: school zone, safe walking routes and crosswalks
type Padding = { top: number; bottom: number; left: number; right: number };
const DEFAULT_PADDING: Padding = { top: 60, bottom: 60, left: 60, right: 60 };
setWorkerUrl(workerUrl);
const FALLBACK_BOUNDS: [[number, number], [number, number]] = [[-83.0, 42.30], [-82.95, 42.34]]; // Windsor, used only if there is no data

type PinFeature = Feature<GeoPoint, { id: string; kind: LayerKey; name: string; category: string; status: string; reqLabel: string; reqRing: string; reqClosed: boolean }>;

// Sprint 6 (Devu): a pin that belongs to a request carries its status word (shown under the pin) and
// ring colour (green = resolved, grey = declined or withdrawn, white = still open).
const toFeature = (i: MapItem): PinFeature => {
  const phase = phaseOf(i);
  return {
    type: 'Feature',
    properties: {
      id: i.id,
      kind: layerOf(i),
      name: i.name,
      category: i.category,
      status: i.status,
      reqLabel: phase?.label ?? '',
      reqRing: phase?.ring ?? '#FFFFFF',
      reqClosed: phase ? isClosedWithoutFix(phase) : false,
    },
    geometry: { type: 'Point', coordinates: [i.lng, i.lat] },
  };
};

// The map frames the data itself, so it stays correct if coordinates are edited.
// The ward outline is included, so the opening view shows it around the street.
function boundsOf(items: MapItem[], areas: WardArea[] = []): [[number, number], [number, number]] {
  const corners = areas.flatMap((a) => a.polygon);
  if (items.length === 0) return FALLBACK_BOUNDS;
  const lngs = [...items.map((i) => i.lng), ...corners.map((c) => c[0])];
  const lats = [...items.map((i) => i.lat), ...corners.map((c) => c[1])];
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}

// The ward outlines as map data: one polygon each, plus one label point each.
function wardGeoJson(areas: WardArea[]) {
  return {
    type: 'FeatureCollection' as const,
    features: areas.flatMap((a) => {
      const label = `${a.name} (illustrative)`;
      const poly = { type: 'Feature' as const, properties: { id: a.id, label }, geometry: { type: 'Polygon' as const, coordinates: [a.polygon] } };
      const at = a.labelAt ?? a.polygon[0];
      const pt = { type: 'Feature' as const, properties: { id: `${a.id}-label`, label }, geometry: { type: 'Point' as const, coordinates: at } };
      return [poly, pt];
    }),
  };
}

class RecenterControl implements IControl {
  private el: HTMLDivElement | null = null;
  private handler: () => void;
  constructor(handler: () => void) {
    this.handler = handler;
  }
  onAdd(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recenter-btn';
    button.title = 'Recenter on the corridor';
    button.setAttribute('aria-label', 'Recenter on the corridor');
    button.textContent = '\u2316';
    button.addEventListener('click', this.handler);
    group.appendChild(button);
    this.el = group;
    return group;
  }
  onRemove(): void {
    this.el?.remove();
    this.el = null;
  }
}

const PIN_LAYERS = LAYERS.filter((l) => !l.area); // the ward outline has no pins

interface Props {
  allItems: MapItem[]; // everything in the mock data: used for the starting view and Recenter
  items: MapItem[]; // what the search box and chips currently let through
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  schoolGeo?: GeoJSON.FeatureCollection; // KAN-43: the school zone, routes and crosswalks, drawn with the "School safe routes" layer
  areas?: WardArea[]; // ward / council areas drawn as an outline (the "Ward area outline" layer)
  fitPadding?: Padding; // room to leave around the pins, e.g. for a panel floating over the map
  onMapReady?: (map: MlMap | null) => void; // lets other features (e.g. the "you are here" marker, task 9) use the map
}

export default function CorridorMap({ allItems, items, selectedId, onSelect, areas = [], schoolGeo, fitPadding = DEFAULT_PADDING, onMapReady }: Props) {
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;
  const schoolGeoRef = useRef(schoolGeo);
  schoolGeoRef.current = schoolGeo;
  const areasRef = useRef(areas);
  areasRef.current = areas;
  const allItemsRef = useRef(allItems);
  allItemsRef.current = allItems;
  const pollVotes = useRef(new Map<string, PollState>()); // demo votes, kept while the page is open
  const paddingRef = useRef(fitPadding);
  paddingRef.current = fitPadding;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const initial = useRef(readUrlState(window.location.search)); // read once on load

  // Task 7: which layers are on. Task 8: restored from the URL if present.
  const [active, setActive] = useState<LayerKey[]>(initial.current.layers ?? ALL_LAYER_KEYS);
  const bounds = useRef(boundsOf(allItems, areas));
  const [ready, setReady] = useState(false);
  // Layers box starts closed so it never covers pins; the button shows how many are on.
  const [layersOpen, setLayersOpen] = useState(false);

  const activeRef = useRef(active);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    activeRef.current = active;
    selectedRef.current = selectedId;
    onSelectRef.current = onSelect;
  }, [active, selectedId, onSelect]);

  // Task 8: write centre, zoom, layers and selected pin into the URL.
  const syncUrl = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    writeUrlState({
      center: [c.lng, c.lat],
      zoom: map.getZoom(),
      layers: activeRef.current,
      pin: selectedRef.current,
    });
  }, []);

  // ---- Create the map once ------------------------------------------------
  useEffect(() => {
    if (!container.current) return;
    const { center, zoom } = initial.current;
    const map = new MlMap({
      container: container.current,
      style: STYLE_URL,
      // Task 8: a shared link restores the exact view; otherwise fit the corridor (Task 5).
      ...(center && zoom !== null
        ? { center, zoom }
        : { bounds: bounds.current, fitBoundsOptions: { padding: paddingRef.current } }),
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // If the vector style can't be reached, switch to plain OSM tiles once.
    let fellBack = false;
    map.on('error', (e) => {
      const msg = String((e as { error?: { message?: string } }).error?.message ?? '');
      if (!fellBack && !map.isStyleLoaded() && /openfreemap|style|Failed to fetch|NetworkError/i.test(msg)) {
        fellBack = true;
        map.setStyle(FALLBACK_STYLE);
      }
    });

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right'); // zoom +/-
    map.addControl(
      new RecenterControl(() => map.fitBounds(bounds.current, { padding: paddingRef.current, duration: 600 })),
      'top-right',
    );

    map.on('load', () => {
      // Ward / council area outline: drawn first, so it sits under the pins and clusters.
      map.addSource(WARD_SOURCE, { type: 'geojson', data: wardGeoJson(areasRef.current) });
      const wardVisible = activeRef.current.includes('ward') ? 'visible' : 'none';
      map.addLayer({
        id: 'ward-fill',
        type: 'fill',
        source: WARD_SOURCE,
        filter: ['==', ['geometry-type'], 'Polygon'],
        layout: { visibility: wardVisible },
        paint: { 'fill-color': '#2F5D8A', 'fill-opacity': 0.07 },
      });
      map.addLayer({
        id: 'ward-line',
        type: 'line',
        source: WARD_SOURCE,
        filter: ['==', ['geometry-type'], 'Polygon'],
        layout: { visibility: wardVisible, 'line-join': 'round' },
        paint: { 'line-color': '#2F5D8A', 'line-width': 2.5, 'line-dasharray': [3, 2] },
      });
      map.addLayer({
        id: 'ward-label',
        type: 'symbol',
        source: WARD_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          visibility: wardVisible,
          'text-field': ['get', 'label'],
          'text-font': FONT,
          'text-size': 12,
          'text-max-width': 14,
          'text-anchor': 'top',
          'text-offset': [0, 0.4],
        },
        paint: { 'text-color': '#1F4468', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
      });

      // KAN-43: school zone, safe walking routes and crosswalks (under the pins, above the ward outline).
      map.addSource(SCHOOL_SOURCE, { type: 'geojson', data: schoolGeoRef.current ?? { type: 'FeatureCollection', features: [] } });
      const schoolVisible = activeRef.current.includes('school') ? 'visible' : 'none';
      map.addLayer({
        id: 'school-zone-fill',
        type: 'fill',
        source: SCHOOL_SOURCE,
        filter: ['==', ['get', 'part'], 'zone'],
        layout: { visibility: schoolVisible },
        paint: { 'fill-color': '#2D6A4F', 'fill-opacity': 0.1 },
      });
      map.addLayer({
        id: 'school-zone-line',
        type: 'line',
        source: SCHOOL_SOURCE,
        filter: ['==', ['get', 'part'], 'zone'],
        layout: { visibility: schoolVisible },
        paint: { 'line-color': '#2D6A4F', 'line-width': 2 },
      });
      map.addLayer({
        id: 'school-route-casing',
        type: 'line',
        source: SCHOOL_SOURCE,
        filter: ['==', ['get', 'part'], 'route'],
        layout: { visibility: schoolVisible, 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 },
      });
      map.addLayer({
        id: 'school-route-clear',
        type: 'line',
        source: SCHOOL_SOURCE,
        filter: ['all', ['==', ['get', 'part'], 'route'], ['==', ['get', 'affected'], false]],
        layout: { visibility: schoolVisible, 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#2D6A4F', 'line-width': 4.5 },
      });
      // A route with roadwork near it is dashed and orange, and its label says so, so it never relies on colour alone.
      map.addLayer({
        id: 'school-route-affected',
        type: 'line',
        source: SCHOOL_SOURCE,
        filter: ['all', ['==', ['get', 'part'], 'route'], ['==', ['get', 'affected'], true]],
        layout: { visibility: schoolVisible, 'line-join': 'round' },
        paint: { 'line-color': '#B35900', 'line-width': 4.5, 'line-dasharray': [1.5, 1.5] },
      });
      map.addLayer({
        id: 'school-crossings',
        type: 'circle',
        source: SCHOOL_SOURCE,
        filter: ['==', ['get', 'part'], 'crossing'],
        layout: { visibility: schoolVisible },
        paint: { 'circle-radius': 7, 'circle-color': '#ffffff', 'circle-stroke-color': '#2D6A4F', 'circle-stroke-width': 3 },
      });
      map.addLayer({
        id: 'school-labels',
        type: 'symbol',
        source: SCHOOL_SOURCE,
        filter: ['!=', ['get', 'part'], 'zone'],
        minzoom: 16,
        layout: {
          visibility: schoolVisible,
          'text-field': ['get', 'label'],
          'text-font': FONT,
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 0.9],
          'text-max-width': 12,
        },
        paint: { 'text-color': '#1B4332', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
      });

      // Task 6: one clustered source, drawn as clusters + typed pins.
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 17,
      });
      map.addLayer({
        id: 'cluster-halo',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0d5f73',
          'circle-opacity': 0.2,
          'circle-radius': ['step', ['get', 'point_count'], 24, 5, 29, 10, 34],
        },
      });
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0e2233',
          'circle-radius': ['step', ['get', 'point_count'], 17, 5, 21, 10, 25],
          'circle-stroke-color': '#f2c14e',
          'circle-stroke-width': 3,
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-font': FONT, 'text-size': 14, 'text-allow-overlap': true },
        paint: { 'text-color': '#ffffff' },
      });
      // Week 8 redesign: teardrop pins with the layer's icon (see PIN_ICON in layers.ts). The pin's tip
      // sits on the spot; its head is 25 px above it, where the selection and request-status rings go.
      for (const l of PIN_LAYERS) {
        const img = new Image(64, 80);
        img.onload = () => {
          if (!map.hasImage(`pin-${l.key}`)) map.addImage(`pin-${l.key}`, img, { pixelRatio: 2 });
        };
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSvg(l.color, PIN_ICON[l.key as keyof typeof PIN_ICON]))}`;
      }
      map.addLayer({
        id: 'pin-shadow',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-color': '#18232e', 'circle-opacity': 0.3, 'circle-radius': 6, 'circle-blur': 0.9, 'circle-translate': [0, 1] },
      });
      map.addLayer({
        id: 'selected-ring',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'id'], ''],
        paint: { 'circle-radius': 22, 'circle-color': 'rgba(242,193,78,0.28)', 'circle-stroke-color': '#0e2233', 'circle-stroke-width': 3, 'circle-translate': [0, -25] },
      });
      // a request's status as a coloured ring around the pin head (the word is under the pin)
      map.addLayer({
        id: 'req-ring',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'reqRing'], '#FFFFFF']],
        paint: {
          'circle-radius': 16,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': ['get', 'reqRing'] as unknown as ExpressionSpecification,
          'circle-stroke-width': 4,
          'circle-translate': [0, -25],
          'circle-stroke-opacity': ['case', ['get', 'reqClosed'], 0.55, 1] as unknown as ExpressionSpecification,
        },
      });
      map.addLayer({
        id: 'pins',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['concat', 'pin-', ['get', 'kind']] as unknown as ExpressionSpecification,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: { 'icon-opacity': ['case', ['get', 'reqClosed'], 0.55, 1] as unknown as ExpressionSpecification },
      });
      // Sprint 6 (Devu): the request's status in words, under its pin. The word is always there,
      // so the status never relies on the ring colour alone.
      map.addLayer({
        id: 'pin-status',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'reqLabel'], '']],
        minzoom: 15.5,
        layout: {
          'text-field': ['get', 'reqLabel'],
          'text-font': FONT,
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 0.35],
          'text-max-width': 9,
        },
        paint: { 'text-color': '#1F2937', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
      });
      setReady(true);
      onMapReadyRef.current?.(map);
    });

    for (const id of ['clusters', 'pins']) {
      map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''));
    }

    map.on('click', async (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: ['clusters', 'pins'] })[0];
      if (!hit) {
        onSelectRef.current(null); // click on empty map clears the selection
        return;
      }
      if (hit.properties && 'cluster_id' in hit.properties) {
        // Click a cluster: zoom in until it breaks apart.
        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(hit.properties.cluster_id as number);
        map.easeTo({ center: (hit.geometry as GeoPoint).coordinates as [number, number], zoom });
        return;
      }
      clickedId.current = String(hit.properties?.id);
      onSelectRef.current(clickedId.current);
    });

    map.on('moveend', syncUrl);

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      onMapReadyRef.current?.(null);
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [syncUrl]);

  // ---- Task 7: send only the switched-on layers to the clustered source ----
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const source = mapRef.current.getSource(SOURCE_ID) as GeoJSONSource;
    source.setData({
      type: 'FeatureCollection',
      features: items.map(toFeature).filter((f) => active.includes(f.properties.kind)),
    });
  }, [ready, active, items]);

  // The ward outline is switched on and off like any other layer.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const v = active.includes('ward') ? 'visible' : 'none';
    for (const id of ['ward-fill', 'ward-line', 'ward-label']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v);
    }
    const sv = active.includes('school') ? 'visible' : 'none';
    for (const id of ['school-zone-fill', 'school-zone-line', 'school-route-casing', 'school-route-clear', 'school-route-affected', 'school-crossings', 'school-labels']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', sv);
    }
  }, [ready, active]);

  // The school's shapes follow the roadwork alert (a route turns dashed when roadwork is near it).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource(SCHOOL_SOURCE) as GeoJSONSource | undefined)?.setData(schoolGeo ?? { type: 'FeatureCollection', features: [] });
  }, [ready, schoolGeo]);

  // A pin that is filtered out can no longer be selected. A newly chosen pin
  // (from a search result or card) switches its own layer on and flies there.
  const pendingFly = useRef<string | null>(null); // a freshly chosen pin we still need to fly to
  const prevSelected = useRef<string | null>(selectedId); // starts equal, so a link with ?pin= keeps its saved view
  const clickedId = useRef<string | null>(null); // a pin the person clicked on the map (no need to fly)
  useEffect(() => {
    if (prevSelected.current !== selectedId) {
      prevSelected.current = selectedId;
      if (selectedId === null) clickedId.current = null;
      pendingFly.current = selectedId !== null && selectedId !== clickedId.current ? selectedId : null;
    }
    if (!selectedId) return;
    const item = items.find((x) => x.id === selectedId);
    if (!item) {
      onSelect(null);
      return;
    }
    const layer = layerOf(item);
    if (!active.includes(layer)) {
      if (pendingFly.current === selectedId) {
        // chosen from a card or search result: switch its layer on, then fly
        setActive(ALL_LAYER_KEYS.filter((k) => k === layer || active.includes(k)));
      } else {
        onSelect(null); // the layer was switched off by the user
      }
      return;
    }
    if (pendingFly.current === selectedId && mapRef.current) {
      pendingFly.current = null;
      mapRef.current.easeTo({ center: [item.lng, item.lat], zoom: Math.max(mapRef.current.getZoom(), 17), padding: paddingRef.current });
    }
  }, [active, selectedId, items, onSelect]);

  // ---- Task 8: selected pin = highlight ring + small popup + URL ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setFilter('selected-ring', ['==', ['get', 'id'], selectedId ?? '']);
    popupRef.current?.remove();
    popupRef.current = null;
    const f = selectedId ? items.find((x) => x.id === selectedId) : undefined;
    if (f) {
      const layer = LAYERS.find((l) => l.key === layerOf(f))!;
      const node = document.createElement('div');
      node.className = 'cm-popup';
      const type = document.createElement('span');
      type.className = 'cm-popup__type';
      type.style.color = layer.color;
      type.textContent = layer.label; // textContent, never innerHTML
      const name = document.createElement('strong');
      name.className = 'cm-popup__name';
      name.textContent = f.name;
      const meta = document.createElement('span');
      meta.className = 'cm-popup__meta';
      meta.textContent = `${f.category}, ${f.status}`;
      const demo = document.createElement('span');
      demo.className = 'cm-popup__demo';
      demo.textContent = 'Demo data';
      node.append(type, name, meta);
      if (f.kind === 'post' || f.kind === 'offer' || f.kind === 'poll' || f.kind === 'school') {
        // Business posts, offers and polls: where they are, and what they say.
        const at = allItemsRef.current.find((x) => x.id === f.placeId);
        if (at) {
          const where = document.createElement('span');
          where.className = 'cm-popup__meta';
          where.textContent = `At ${at.name}`;
          node.append(where);
        }
        if (typeof f.description === 'string' && f.description) {
          const text = document.createElement('span');
          text.className = 'cm-popup__text';
          text.textContent = f.description;
          node.append(text);
        }
        if (f.kind === 'post') {
          // KAN-52 (Mounika): a way to report a business post. It opens the Updates page with the report form ready.
          const report = document.createElement('a');
          report.className = 'cm-popup__link';
          report.href = `#/updates?post=${encodeURIComponent(f.id)}`;
          report.textContent = 'Report this post';
          node.append(report);
        }
        if (f.kind === 'poll') {
          if (typeof f.closesOn === 'string') {
            const closes = document.createElement('span');
            closes.className = 'cm-popup__meta';
            closes.textContent = (f.status.startsWith('open') ? 'Closes ' : 'Closed ') + shortDate(f.closesOn);
            node.append(closes);
          }
          node.append(buildPollSection(f, pollVotes.current));
        }
      }
      if (f.kind === 'listing') {
        // KAN-53 (Devu): a Marketplace listing. The pin is at a public meeting spot, never a home;
        // the seller is shown as a first name and initial. The link goes back to the listing.
        if (typeof f.area === 'string' && f.area) {
          const where = document.createElement('span');
          where.className = 'cm-popup__meta';
          where.textContent = f.area;
          node.append(where);
        }
        if (typeof f.description === 'string' && f.description) {
          const text = document.createElement('span');
          text.className = 'cm-popup__text';
          text.textContent = f.description;
          node.append(text);
        }
        const by = document.createElement('span');
        by.className = 'cm-popup__meta';
        by.textContent = `Posted by ${String(f.sellerName ?? 'a neighbour')}${typeof f.endsOn === 'string' ? ` \u00b7 Ends ${shortDate(f.endsOn)}` : ''}`;
        node.append(by);
        const link = document.createElement('a');
        link.className = 'cm-popup__link';
        link.href = `#/marketplace?l=${encodeURIComponent(f.id)}`;
        link.textContent = 'View listing';
        node.append(link);
      }
      if (f.kind === 'issue') {
        // KAN-33: Reported -> Acknowledged -> Resolved. Done steps show a tick, the current one is bold,
        // so the state never depends on colour alone.
        const list = document.createElement('ol');
        list.className = 'cm-steps';
        list.setAttribute('aria-label', issueStepsLabel(f.status));
        for (const st of issueSteps(f.status)) {
          const li = document.createElement('li');
          li.className = `cm-step cm-step--${st.state}`;
          if (st.state === 'current') li.setAttribute('aria-current', 'step');
          if (st.state === 'current' && st.label === 'Resolved') li.classList.add('cm-step--final'); // green when finished
          li.textContent = (st.state === 'done' ? '\u2713 ' : '') + st.label;
          list.append(li);
        }
        node.append(list);
        const phase = phaseOf(f);
        if (phase) {
          // The request's own state in words ("Being handled", "Needs more info"), which the 3 steps can't show.
          const where = document.createElement('span');
          where.className = 'cm-popup__meta';
          where.textContent = `Status: ${phase.label}`;
          node.append(where);
        }
        if (typeof f.outcome === 'string' && f.outcome) {
          // "You said, we did": the published outcome. Only the public title and the outcome, never who sent it.
          const did = document.createElement('span');
          did.className = 'cm-popup__text';
          did.textContent = `We did: ${f.outcome}`;
          node.append(did);
          if (typeof f.handledBy === 'string' && f.handledBy) {
            const by = document.createElement('span');
            by.className = 'cm-popup__meta';
            by.textContent = `By ${f.handledBy}`;
            node.append(by);
          }
        }
        if (typeof f.routedTo === 'string' && f.routedTo) {
          // A resident's report goes to the city or ward councillor, not the BIA.
          const routed = document.createElement('span');
          routed.className = 'cm-popup__meta';
          routed.textContent = `Goes to: ${f.routedTo}`;
          node.append(routed);
        }
      }
      node.append(demo);
      popupRef.current = new Popup({ closeButton: false, offset: 22, maxWidth: '280px', className: 'cm-popup-wrap' })
        .setLngLat([f.lng, f.lat])
        .setDOMContent(node)
        .addTo(map);
    }
    syncUrl();
  }, [ready, selectedId, active, items, syncUrl]);

  const toggle = (key: LayerKey) =>
    setActive((prev) => ALL_LAYER_KEYS.filter((k) => (k === key ? !prev.includes(k) : prev.includes(k))));

  return (
    <div className="cm-root">
      <div ref={container} className="cm-map" />
      <div className="cm-layers-wrap">
        <button
          type="button"
          className="cm-layers-toggle"
          aria-expanded={layersOpen}
          aria-controls="cm-layers-panel"
          onClick={() => setLayersOpen((o) => !o)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />
          </svg>
          Layers
          <span className="cm-layers-on">
            {active.length}/{LAYERS.length} on
          </span>
        </button>
        {layersOpen && (
          <fieldset id="cm-layers-panel" className="cm-layers">
            <legend className="cm-visually-hidden">Map layers</legend>
            {LAYERS.map((l) => (
              <label key={l.key} className="cm-layer-row">
                <input type="checkbox" checked={active.includes(l.key)} onChange={() => toggle(l.key)} />
                <span className="cm-swatch" style={{ background: l.color }} aria-hidden="true">
                  {l.glyph}
                </span>
                {l.label}
                <span className="cm-count">{l.area ? (areas.length > 0 ? 'area' : '0') : items.filter((i) => layerOf(i) === l.key).length}</span>
              </label>
            ))}
            <p className="cm-layers-note">Dashed outline: resident reports like potholes go to the city or ward councillor, not the BIA.</p>
            <p className="cm-layers-note">Request pins say where the request is, in words, under the pin. A green ring means resolved; a grey, faded pin means declined or withdrawn.</p>
          </fieldset>
        )}
      </div>
    </div>
  );
}
