// Task 9: optional "You are here" marker on the map.
// Uses an approximate demo point on the corridor, never a home address.
import { useEffect } from 'react';
import { Marker, Popup, type Map as MlMap } from 'maplibre-gl';

export function useYouAreHere(map: MlMap | null, show: boolean, point: [number, number]) {
  useEffect(() => {
    if (!map || !show) return;
    const el = document.createElement('div');
    el.className = 'yah';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'You are here (approximate)');
    const popup = new Popup({ offset: 14, closeButton: false }).setText('You are here (approximate, demo)');
    const marker = new Marker({ element: el }).setLngLat(point).setPopup(popup).addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, show, point]);
}
