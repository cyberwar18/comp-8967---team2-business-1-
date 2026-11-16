// Connects the shared mock data (KAN-9) to the map's layers (KAN-7).
// The data has several kinds (place, event, update, issue, offer, post, poll). Roadworks are stored
// as updates or issues with "Roadworks" in the category, so they get their own layer.
import type { MapItem } from './types';
import type { LayerKey } from './layers';

export function layerOf(item: MapItem): LayerKey {
  if ((item.kind === 'update' || item.kind === 'issue') && /roadwork/i.test(item.category)) return 'roadwork';
  switch (item.kind) {
    case 'place':
      return 'places';
    case 'event':
      return 'events';
    case 'update':
      return 'updates';
    case 'offer':
    case 'post':
      return 'posts';
    case 'poll':
      return 'polls';
    case 'school':
      return 'school';
    default:
      return 'issues';
  }
}
