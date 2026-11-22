import { describe, expect, it } from 'vitest';
import data from '../../data/mock-data.json';
import { getSchoolNotices, getSchools } from '../../data/api';
import { layerOf } from '../map/itemLayer';
import {
  EMPTY_NOTICE,
  ROUTE_ALERT_M,
  SCHOOL_ALERT_M,
  alertText,
  audienceLabel,
  buildNotice,
  canPost,
  canSeeNotice,
  distanceToRouteM,
  metresBetween,
  noticesFor,
  publicRoadwork,
  routeStatuses,
  schoolAlert,
  schoolGeoJson,
  schoolPin,
  validateNotice,
  zonePolygon,
  type Notice,
  type School,
  type Viewer,
} from './schoolData';

const TODAY = new Date('2026-11-01T12:00:00');
const PUBLIC: Viewer = { role: 'public', grades: [] };
const PARENT_G2: Viewer = { role: 'parent', grades: ['2'] };
const STAFF: Viewer = { role: 'staff', grades: [] };

async function load() {
  const [schools, notices] = await Promise.all([getSchools(), getSchoolNotices()]);
  const updates = (data as unknown as { updates: Parameters<typeof publicRoadwork>[0] }).updates;
  return { school: schools[0] as School, notices, roadworks: publicRoadwork(updates), updates };
}

describe('who sees which notice', () => {
  it('shows the public only the public notices', async () => {
    const { school, notices } = await load();
    const ids = noticesFor(notices, school.id, PUBLIC).map((n) => n.id);
    expect(ids.sort()).toEqual(['sn-01', 'sn-02']);
    expect(noticesFor(notices, school.id, PUBLIC).every((n) => n.audience === 'public')).toBe(true);
  });
  it("shows a Grade 2 parent public, all-parent and Grade 2 notices, and not Grade 5's", async () => {
    const { school, notices } = await load();
    const ids = noticesFor(notices, school.id, PARENT_G2).map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['sn-01', 'sn-02', 'sn-03', 'sn-04', 'sn-05']));
    expect(ids).not.toContain('sn-06'); // Grade 5 field trip
  });
  it('shows staff every notice', async () => {
    const { school, notices } = await load();
    expect(noticesFor(notices, school.id, STAFF)).toHaveLength(notices.length);
  });
  it('puts events first by date, then notices newest first', async () => {
    const { school, notices } = await load();
    const list = noticesFor(notices, school.id, STAFF);
    const firstNotice = list.findIndex((n) => n.type === 'notice');
    expect(list.slice(0, firstNotice).every((n) => n.type === 'event')).toBe(true);
    expect(list.slice(0, firstNotice).map((n) => n.date)).toEqual([...list.slice(0, firstNotice).map((n) => n.date)].sort());
  });
  it('does not let a parent with no matching grade see a grade notice', () => {
    const n = { audience: 'grade-5', schoolId: 's' } as unknown as Notice;
    expect(canSeeNotice(n, { role: 'parent', grades: ['2'] })).toBe(false);
    expect(canSeeNotice(n, { role: 'parent', grades: ['2', '5'] })).toBe(true);
    expect(canSeeNotice(n, PUBLIC)).toBe(false);
  });
  it('labels audiences in plain words', () => {
    expect(audienceLabel('public')).toBe('Public');
    expect(audienceLabel('parents')).toBe('All parents');
    expect(audienceLabel('grade-2')).toBe('Grade 2 parents');
  });
});

describe('only staff can post', () => {
  it('allows only the staff role', () => {
    expect(canPost('staff')).toBe(true);
    expect(canPost('parent')).toBe(false);
    expect(canPost('public')).toBe(false);
  });
  it('refuses to build a post for a parent or the public', async () => {
    const { school } = await load();
    const draft = { ...EMPTY_NOTICE, title: 'Hello', body: 'Hi' };
    expect(() => buildNotice(draft, 'parent', school, 'x', TODAY)).toThrow(/staff/);
    expect(() => buildNotice(draft, 'public', school, 'x', TODAY)).toThrow(/staff/);
  });
  it('builds a post for staff with the chosen audience', async () => {
    const { school } = await load();
    const n = buildNotice({ ...EMPTY_NOTICE, title: '  Bake sale ', body: 'Friday', audience: 'parents' }, 'staff', school, 'sn-x', TODAY);
    expect(n).toMatchObject({ id: 'sn-x', title: 'Bake sale', audience: 'parents', type: 'notice', posted: '2026-11-01', postedBy: school.demo.staffName });
    expect(n.date).toBeUndefined();
  });
  it('builds an event with its date and time', async () => {
    const { school } = await load();
    const n = buildNotice({ ...EMPTY_NOTICE, type: 'event', title: 'Fair', body: 'Games', date: '2026-11-20', time: '17:00' }, 'staff', school, 'e', TODAY);
    expect(n.date).toBe('2026-11-20T17:00');
  });
  it('checks the form', () => {
    expect(validateNotice(EMPTY_NOTICE, TODAY)).toEqual({ title: 'Give the notice a title.', body: 'Write the message.' });
    expect(validateNotice({ ...EMPTY_NOTICE, title: 'x'.repeat(81), body: 'ok' }, TODAY).title).toMatch(/under 80/);
    expect(validateNotice({ ...EMPTY_NOTICE, title: 'a', body: 'b'.repeat(301) }, TODAY).body).toMatch(/under 300/);
    const ev = validateNotice({ ...EMPTY_NOTICE, type: 'event', title: 'a', body: 'b', date: '2026-10-01', time: '' }, TODAY);
    expect(ev.date).toMatch(/passed/);
    expect(ev.time).toMatch(/start time/);
    expect(validateNotice({ ...EMPTY_NOTICE, title: 'a', body: 'b' }, TODAY)).toEqual({});
  });
});

describe('no student information', () => {
  it('has no student fields in the school data, and no names in public notices', async () => {
    const { school, notices } = await load();
    const text = JSON.stringify({ school, notices }).toLowerCase();
    for (const bad of ['studentname', 'student_name', 'childname', 'photo', 'phone', 'email', 'address']) expect(text).not.toContain(bad);
  });
  it("never gives the public or a parent another family's grade", async () => {
    const { school, notices } = await load();
    for (const viewer of [PUBLIC, PARENT_G2]) {
      const seen = JSON.stringify(noticesFor(notices, school.id, viewer));
      expect(seen).not.toContain('parentGrades');
    }
    // the demo parent's grade lives only on the school's demo record, never on a notice
    expect(notices.every((n) => !('grades' in n))).toBe(true);
  });
  it('the community workspace still lists student names and parent contacts as private', () => {
    const org = (data as unknown as { organizations: { id: string; private: string[] }[] }).organizations.find((o) => o.id === 'org-school')!;
    expect(org.private).toEqual(expect.arrayContaining(['student names', 'parent contact details']));
  });
});

describe('distances', () => {
  it('measures metres between two points', () => {
    expect(metresBetween([-82.97, 42.33], [-82.97, 42.331])).toBeCloseTo(110.6, 0);
    expect(metresBetween([-82.97, 42.33], [-82.97, 42.33])).toBe(0);
  });
  it('measures the distance to the closest part of a route', () => {
    const route: [number, number][] = [[-82.97, 42.33], [-82.969, 42.33]];
    expect(distanceToRouteM([-82.9695, 42.3301], route)).toBeCloseTo(11.06, 0); // 0.0001 deg north of the middle
    expect(distanceToRouteM([-82.971, 42.33], route)).toBeCloseTo(metresBetween([-82.971, 42.33], [-82.97, 42.33]), 0); // past the end: distance to the end point
    expect(distanceToRouteM([-82.9695, 42.33], route)).toBeCloseTo(0, 5);
    expect(distanceToRouteM([0, 0], [])).toBe(Infinity);
  });
});

describe('roadwork alert', () => {
  it('uses only public roadwork, never the business\'s private request to the BIA', async () => {
    const { roadworks, updates } = await load();
    const privateRoad = updates.find((u) => u.id === 'issue-04')!;
    expect(privateRoad.visibility).not.toBe('public'); // it really is private in the data
    expect(roadworks.map((r) => r.id)).toEqual(['update-01']);
  });
  it('warns about the sidewalk work near the school and the route that passes it', async () => {
    const { school, roadworks } = await load();
    const a = schoolAlert(school, roadworks);
    expect(a.active).toBe(true);
    expect(a.nearSchool[0].roadwork.id).toBe('update-01');
    expect(a.nearSchool[0].metres).toBeLessThan(SCHOOL_ALERT_M);
    expect(a.headline).toMatch(/^Roadwork near the school: Sidewalk work on Wyandotte St E, about \d+ m away\.$/);
    const byId = Object.fromEntries(a.statuses.map((s) => [s.route.id, s]));
    expect(byId['route-a'].affected).toBe(true);
    expect(byId['route-a'].nearest!.metres).toBeLessThanOrEqual(ROUTE_ALERT_M);
    expect(byId['route-b'].affected).toBe(false);
    expect(a.lines).toHaveLength(1);
    expect(a.lines[0]).toMatch(/^Route A passes within \d+ m of Sidewalk work/);
    expect(a.advice).toBe('Use Route B instead.');
    expect(alertText(a)).toContain('Use Route B instead.');
  });
  it('says all clear when there is no roadwork', async () => {
    const { school } = await load();
    const a = schoolAlert(school, []);
    expect(a.active).toBe(false);
    expect(a.headline).toBe('No roadwork near the school or its walking routes.');
    expect(a.advice).toBe('');
    expect(routeStatuses(school, []).every((s) => !s.affected)).toBe(true);
  });
  it('warns on every route when each one is affected', async () => {
    const { school } = await load();
    const onBoth = school.routes.map((r, i) => ({ id: `w${i}`, name: `Work ${i}`, lng: r.coords[1][0], lat: r.coords[1][1] }));
    const a = schoolAlert(school, onBoth);
    expect(a.statuses.every((s) => s.affected)).toBe(true);
    expect(a.advice).toMatch(/Every walking route is affected/);
  });
  it('ignores roadwork far away', async () => {
    const { school } = await load();
    const far = [{ id: 'far', name: 'Far work', lng: school.lng + 0.01, lat: school.lat + 0.01 }];
    expect(schoolAlert(school, far).active).toBe(false);
  });
});

describe('the school on the map', () => {
  it('draws a closed zone around the school', async () => {
    const { school } = await load();
    const ring = zonePolygon(school);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const p of ring.slice(0, -1)) expect(metresBetween([school.lng, school.lat], p)).toBeCloseTo(school.zoneRadiusM, 0);
  });
  it('makes a zone, two routes and two crosswalks, marking the route with roadwork', async () => {
    const { school, roadworks } = await load();
    const fc = schoolGeoJson([school], roadworks);
    const part = (p: string) => fc.features.filter((f) => f.properties?.part === p);
    expect(part('zone')).toHaveLength(1);
    expect(part('route').map((f) => [f.properties?.label, f.properties?.affected])).toEqual([
      ['Route A (roadwork near)', true],
      ['Route B (clear)', false],
    ]);
    expect(part('crossing').map((f) => f.properties?.label)).toEqual(['Crosswalk A1', 'Crosswalk B1']);
  });
  it('puts the school in its own layer, with the alert in its popup', async () => {
    const { school, roadworks } = await load();
    const pin = schoolPin(school, roadworks);
    expect(layerOf(pin as never)).toBe('school');
    expect(pin.status).toBe('roadwork near');
    expect(pin.description).toContain('Use Route B instead.');
    expect(schoolPin(school, []).status).toBe('routes clear');
  });
  it('keeps the school and its routes inside the ward area outline', async () => {
    const { school } = await load();
    const w = (data as unknown as { wards: { polygon: [number, number][] }[] }).wards[0];
    const xs = w.polygon.map((p) => p[0]);
    const ys = w.polygon.map((p) => p[1]);
    const inside = ([lng, lat]: [number, number]) => lng > Math.min(...xs) && lng < Math.max(...xs) && lat > Math.min(...ys) && lat < Math.max(...ys);
    expect(inside([school.lng, school.lat])).toBe(true);
    for (const r of school.routes) for (const c of r.coords) expect(inside(c)).toBe(true);
    for (const p of zonePolygon(school)) expect(inside(p)).toBe(true);
  });
  it('ends every route at the school', async () => {
    const { school } = await load();
    for (const r of school.routes) expect(r.coords[r.coords.length - 1]).toEqual([school.lng, school.lat]);
  });
});
