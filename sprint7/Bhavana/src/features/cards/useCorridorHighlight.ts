// Highlights the BIA's corridor (Wyandotte St E, Thompson to Glidden) on the map
// while the BIA profile asks for it. Drawn under the pins so it never hides them.
import { useEffect } from 'react';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';

const SOURCE = 'bia-corridor';
const CASING = 'bia-corridor-casing';
const LINE = 'bia-corridor-line';

type Padding = { top: number; bottom: number; left: number; right: number };

export function useCorridorHighlight(map: MlMap | null, show: boolean, line: [number, number][], padding: Padding) {
  useEffect(() => {
    if (!map || !show || line.length < 2) return;

    const data = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: line },
    };

    const add = () => {
      if (map.getSource(SOURCE)) {
        (map.getSource(SOURCE) as GeoJSONSource).setData(data);
      } else {
        map.addSource(SOURCE, { type: 'geojson', data });
      }
      // Put the highlight below the first pin layer, so pins stay on top.
      const before = map.getLayer('cluster-halo') ? 'cluster-halo' : undefined;
      if (!map.getLayer(CASING)) {
        map.addLayer(
          { id: CASING, type: 'line', source: SOURCE, layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 14, 'line-opacity': 0.9 } },
          before,
        );
      }
      if (!map.getLayer(LINE)) {
        map.addLayer(
          {
            id: LINE,
            type: 'line',
            source: SOURCE,
            layout: { 'line-cap': 'round' },
            paint: { 'line-color': '#b45309', 'line-width': 8, 'line-opacity': 0.75, 'line-dasharray': [2, 1] },
          },
          before,
        );
      }
      const lngs = line.map((p) => p[0]);
      const lats = line.map((p) => p[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding, duration: 700, maxZoom: 17 },
      );
    };

    if (map.isStyleLoaded()) add();
    else map.once('idle', add);

    return () => {
      try {
        map.off('idle', add);
        if (map.getLayer(LINE)) map.removeLayer(LINE);
        if (map.getLayer(CASING)) map.removeLayer(CASING);
        if (map.getSource(SOURCE)) map.removeSource(SOURCE);
      } catch {
        // the map was already removed (page left); nothing to clean up
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- padding changes shape every render; only re-run on these
  }, [map, show, line]);
}
