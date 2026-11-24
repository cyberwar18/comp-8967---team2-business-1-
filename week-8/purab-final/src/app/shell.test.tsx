// Tests for the shell (navigation) and the mock-data adapter.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppShell, ComingSoon } from './AppShell';
import { ROUTES, parseRoute } from './routes';
import { getCurrentUser, getEvents, getMapData, getPlaces, getProfiles, getUpdates, type Profile } from '../data/api';

afterEach(cleanup);

const user: Profile = {
  id: 'u',
  kind: 'profile',
  role: 'resident',
  name: 'Morgan Ellis (demo)',
  badge: 'Resident',
  bio: '',
  public: [],
  private: [],
  illustrative: true,
};

describe('routes', () => {
  it('reads the section from the URL hash', () => {
    expect(parseRoute('#/chats')).toBe('chats');
    expect(parseRoute('#/marketplace')).toBe('marketplace');
  });
  it('falls back to the map for empty or unknown hashes', () => {
    expect(parseRoute('')).toBe('map');
    expect(parseRoute('#/nope')).toBe('map');
  });
});

describe('AppShell', () => {
  it('shows the six sections in the top bar and the bottom bar (and Review only for Neighbr staff, KAN-52)', () => {
    render(
      <AppShell current="map" user={user}>
        <p>page</p>
      </AppShell>,
    );
    const navs = screen.getAllByRole('navigation', { name: 'Main' });
    expect(navs).toHaveLength(2);
    for (const r of ROUTES.filter((x) => !x.staffOnly)) expect(screen.getAllByRole('link', { name: r.label })).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Review' })).toBeNull();
  });

  it('shows the Review page to Neighbr staff (KAN-52)', () => {
    render(
      <AppShell current="map" user={user} showStaffPages>
        <p>page</p>
      </AppShell>,
    );
    expect(screen.getAllByRole('link', { name: 'Review' })).toHaveLength(2);
  });

  it('marks the current section for screen readers', () => {
    render(
      <AppShell current="updates" user={user}>
        <p>page</p>
      </AppShell>,
    );
    const current = screen.getAllByRole('link', { name: 'Updates' });
    expect(current.every((a) => a.getAttribute('aria-current') === 'page')).toBe(true);
    expect(screen.getAllByRole('link', { name: 'Map' })[0].getAttribute('aria-current')).toBeNull();
  });

  it('shows the signed-in demo user with their badge', () => {
    render(
      <AppShell current="map" user={user}>
        <p>page</p>
      </AppShell>,
    );
    expect(screen.getByLabelText('Signed in as Morgan Ellis (demo)')).toBeTruthy();
    expect(screen.getByText('Resident')).toBeTruthy();
    expect(screen.getByText('ME')).toBeTruthy(); // initials, "(demo)" left out
  });

  it('placeholder pages link back to the map', () => {
    render(<ComingSoon title="Chats" />);
    expect(screen.getByRole('heading', { name: 'Chats' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to the map' }).getAttribute('href')).toBe('#/map');
  });
});

describe('mock-data adapter', () => {
  it('returns the same amounts as the data file', async () => {
    expect(await getPlaces()).toHaveLength(15);
    expect(await getEvents()).toHaveLength(5);
    expect((await getUpdates()).length).toBeGreaterThanOrEqual(5);
    expect(await getProfiles()).toHaveLength(11); // Sprint 6: + parent, school, library // 4 community profiles + owner + councillor, city, MP (KAN-36)
  });

  it('gives the map and search everything they need in one call', async () => {
    const d = await getMapData();
    expect(d.chips.map((c) => c.id)).toContain('vacant');
    expect(d.meta.label).toMatch(/^Illustrative sample data/);
  });

  it('signs in the demo resident', async () => {
    const me = await getCurrentUser();
    expect(me.role).toBe('resident');
    expect(me.badge).toBe('Resident');
  });
});
