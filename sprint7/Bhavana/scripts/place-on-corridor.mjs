// Puts every mock-data pin along Wyandotte St E between two intersections.
//
//   npm run place-pins -- <lat,lng of Wyandotte & Thompson> <lat,lng of Wyandotte & Glidden>
//   e.g. npm run place-pins -- 42.3301,-82.9622 42.3352,-82.9478
//
// Get each point in Google Maps: right-click the intersection and click the numbers.
// The script rewrites lat/lng in src/data/mock-data.json and nothing else. Running it
// again with the same points gives the same result.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../src/data/mock-data.json', import.meta.url));

// How far along the street each place sits: 0 = Thompson, 1 = Glidden.
// Order matches the original mock data (Thompson Parkette first, vacant storefront near Glidden).
const PLACE_T = {
  'place-13': 0.05, 'place-01': 0.09, 'place-02': 0.15, 'place-03': 0.22, 'place-04': 0.29,
  'place-05': 0.36, 'place-06': 0.42, 'place-07': 0.49, 'place-08': 0.55, 'place-09': 0.62,
  'place-10': 0.69, 'place-11': 0.75, 'place-12': 0.82, 'place-15': 0.89, 'place-14': 0.95,
};
// Items not tied to a place.
const FREE_T = { 'update-02': 0.80, 'update-03': 0.52 };

const SIDE_M = 18; // places sit this far from the centre of the street (metres)

function parsePoint(arg, label) {
  const m = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/.exec(arg ?? '');
  if (!m) {
    console.error(`Missing or bad ${label}. Expected "lat,lng", for example 42.3301,-82.9622`);
    process.exit(1);
  }
  const lat = Number(m[1]);
  const lng = Number(m[3]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    console.error(`${label} is out of range: ${arg}`);
    process.exit(1);
  }
  return { lat, lng };
}

const [, , a, b] = process.argv;
const start = parsePoint(a, 'Thompson point');
const end = parsePoint(b, 'Glidden point');

// Local flat coordinates in metres around the start point (fine over 1-2 km).
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = 111_320 * Math.cos((start.lat * Math.PI) / 180);
const toM = (p) => ({ x: (p.lng - start.lng) * M_PER_DEG_LNG, y: (p.lat - start.lat) * M_PER_DEG_LAT });
const toLL = (x, y) => ({ lat: +(start.lat + y / M_PER_DEG_LAT).toFixed(6), lng: +(start.lng + x / M_PER_DEG_LNG).toFixed(6) });

const E = toM(end);
const len = Math.hypot(E.x, E.y);
if (len < 50) {
  console.error('The two points are less than 50 m apart. Check them.');
  process.exit(1);
}
const ux = E.x / len, uy = E.y / len; // along the street
const nx = -uy, ny = ux; // across the street

/** Point at fraction t along the street, `across` metres to one side, `along` metres further on. */
const at = (t, across = 0, along = 0) => toLL(ux * (t * len + along) + nx * across, uy * (t * len + along) + ny * across);

const data = JSON.parse(readFileSync(FILE, 'utf8'));

// Places: alternate sides of the street.
const placePos = {};
data.places.forEach((p) => {
  const t = PLACE_T[p.id];
  if (t === undefined) throw new Error(`No position set for ${p.id} in PLACE_T`);
  const side = Object.keys(PLACE_T).indexOf(p.id) % 2 === 0 ? 1 : -1;
  placePos[p.id] = { t, side };
  Object.assign(p, at(t, side * SIDE_M));
});

// Events at a place: same side, a few metres along so the pins don't sit on top of each other.
data.events.forEach((e) => {
  const pp = placePos[e.placeId];
  if (!pp) throw new Error(`Event ${e.id} has no known placeId`);
  Object.assign(e, at(pp.t, pp.side * (SIDE_M + 6), 12));
});

// Updates and issues: on the street or sidewalk next to their place, or at a fixed spot.
data.updates.forEach((u) => {
  const pp = u.placeId ? placePos[u.placeId] : null;
  if (pp) {
    const onStreet = /roadwork/i.test(u.category) && u.kind === 'update';
    Object.assign(u, onStreet ? at(pp.t, pp.side * 4, -14) : at(pp.t, pp.side * (SIDE_M - 8), -10));
  } else {
    const t = FREE_T[u.id];
    if (t === undefined) throw new Error(`No position set for ${u.id} in FREE_T`);
    Object.assign(u, at(t, 0));
  }
});

data.meta.coordinatesNote = `Pins placed along Wyandotte St E between ${a} (Thompson) and ${b} (Glidden). Positions of individual businesses are illustrative.`;
data.meta.updated = new Date().toISOString().slice(0, 10);

writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`Placed ${data.places.length} places, ${data.events.length} events and ${data.updates.length} updates/issues along ${Math.round(len)} m of Wyandotte St E.`);
