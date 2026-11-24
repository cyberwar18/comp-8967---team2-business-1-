// KAN-36 checks on the profiles in the mock data (Mounika).
// Owner and business are separate, resident reports go to the city, not the BIA,
// and every profile says what is public and what stays private.

import { describe, expect, it } from 'vitest';
import raw from './mock-data.json';

type Profile = { id: string; role: string; public?: string[]; private?: string[]; [k: string]: unknown };
const data = raw as unknown as {
  profiles: Profile[];
  updates: { id: string; reportedBy?: string; routedToProfile?: string; [k: string]: unknown }[];
  wards?: { id: string; responsibleProfiles?: string[] }[];
};
const byId = (id: string) => data.profiles.find((p) => p.id === id);

describe('owner and business profiles', () => {
  it('keeps the business and its owner as two different profiles', () => {
    const business = byId('profile-business');
    const owner = byId('profile-owner-rosa');
    expect(business?.role).toBe('business');
    expect(owner?.role).toBe('resident');
    expect(business?.ownerProfileId).toBe('profile-owner-rosa');
  });

  it('puts the owner in the city, not the BIA corridor', () => {
    expect(byId('profile-owner-rosa')?.area).toBe('City of Windsor');
  });

  it('keeps which business the owner runs private', () => {
    expect(byId('profile-owner-rosa')?.private).toContain('which business they own');
  });
});

describe('responder profiles', () => {
  it('has a ward councillor, the city and an MP', () => {
    for (const id of ['profile-councillor', 'profile-city', 'profile-mp']) {
      expect(byId(id), id).toBeTruthy();
    }
  });

  it('sends the resident street-light report to the city, not the BIA', () => {
    const issue = data.updates.find((u) => u.id === 'issue-05');
    expect(issue?.reportedBy).toBe('profile-resident');
    expect(issue?.routedToProfile).toBe('profile-city');
    expect(issue?.routedToProfile).not.toBe('profile-bia');
  });

  it('links the ward area to the councillor and the city', () => {
    const ward = data.wards?.find((w) => w.id === 'ward-demo');
    expect(ward?.responsibleProfiles).toEqual(['profile-councillor', 'profile-city']);
  });
});

describe('public and private fields', () => {
  it('every profile lists what is public and what stays private', () => {
    for (const p of data.profiles) {
      expect(p.public?.length, p.id).toBeGreaterThan(0);
      expect(p.private?.length, p.id).toBeGreaterThan(0);
    }
  });

  it('no home address is ever public', () => {
    for (const p of data.profiles) {
      expect(p.public ?? [], p.id).not.toContain('home address');
    }
  });
});
