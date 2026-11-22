// Profile cards (resident, business, BIA) and how they connect to the map and other cards.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import raw from '../../data/mock-data.json';
import {
  DEMO_BUSINESS_ID,
  DEMO_USER_ID,
  canSeeReporter,
  corridorLine,
  interestMatches,
  interestWords,
  profileActivity,
  profileById,
  publicPostsBy,
  visibleToViewer,
  type CardData,
} from './cardData';
import { ProfileCard } from './ProfileCard';
import { PlaceCard } from './PlaceCard';
import { UserPresence } from './UserPresence';

const data = raw as unknown as CardData;
const resident = profileById(data, DEMO_USER_ID)!;
const business = profileById(data, DEMO_BUSINESS_ID)!;

afterEach(cleanup);

describe('profile data', () => {
  it('lists the BIA public notices, never private reports', () => {
    const posts = publicPostsBy(data, 'profile-bia');
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.visibility === 'public')).toBe(true);
  });

  it("collects what's on for a business: offers and events, not its reports to the BIA", () => {
    const ids = profileActivity(data, business).map((i) => i.id);
    expect(ids).toContain('offer-01');
    expect(ids).not.toContain('issue-06'); // a report, not something on at the bakery
    expect(ids).not.toContain('issue-04'); // private until approved
  });

  it('hides who raised a private report from other people', () => {
    const privateIssue = data.updates.find((i) => i.id === 'issue-05')!;
    expect(canSeeReporter(privateIssue, DEMO_USER_ID)).toBe(true); // they raised it
    expect(canSeeReporter(privateIssue, DEMO_BUSINESS_ID)).toBe(false);
  });

  it('draws the corridor between Thompson and Glidden', () => {
    const line = corridorLine(data);
    expect(line).toHaveLength(2);
    expect(line[0][0]).toBeLessThan(line[1][0]); // west to east
  });
});

describe('private reports on the map and in search', () => {
  it('only the person who raised a private report sees it', () => {
    const forResident = visibleToViewer(data, DEMO_USER_ID).updates.map((u) => u.id);
    const forBusiness = visibleToViewer(data, DEMO_BUSINESS_ID).updates.map((u) => u.id);
    expect(forResident).toContain('issue-05'); // the streetlight they reported
    expect(forResident).not.toContain('issue-04'); // the bakery's private request
    expect(forBusiness).toContain('issue-04');
    expect(forBusiness).not.toContain('issue-05');
    expect(forResident).toContain('update-01'); // public notices for everyone
  });
});

describe('interests', () => {
  it('turns interests into search words', () => {
    expect(interestWords('Gardening')).toEqual(['garden']);
    expect(interestWords('Local markets')).toEqual(['market']);
    expect(interestWords('Walkable cities')).toEqual(['walk', 'city']);
  });

  it('finds things on the corridor for an interest', () => {
    expect(interestMatches(data, 'Gardening').map((i) => i.id)).toContain('event-02'); // Fall Garden Clean-up
    expect(interestMatches(data, 'Local markets').map((i) => i.id)).toContain('event-01'); // Friday Market
    expect(interestMatches(data, 'Visual design')).toEqual([]);
    const walk = interestMatches(data, 'Walkable cities').map((i) => i.name);
    expect(walk).toContain('Corridor Lights Walk');
    expect(walk.some((n) => /sidewalk/i.test(n))).toBe(false); // whole words only
  });

  it('never matches private reports', () => {
    const all = ['Gardening', 'Local markets', 'Walkable cities', 'Sidewalk', 'Streetlight'].flatMap((t) => interestMatches(data, t));
    expect(all.every((i) => !i.visibility || i.visibility === 'public')).toBe(true);
  });
});

describe('ProfileCard', () => {
  it('shows a resident profile with interests and the public / private split', () => {
    render(<ProfileCard data={data} profileId={DEMO_USER_ID} viewerId="someone-else" onClose={() => {}} onSelect={() => {}} />);
    expect(screen.getByRole('heading', { name: resident.name })).toBeTruthy();
    expect(screen.getByText('Resident')).toBeTruthy();
    expect(screen.getByText('Gardening')).toBeTruthy();
    const privacy = screen.getByRole('region', { name: /public and what’s private/ });
    expect(within(privacy).getByText('Home address')).toBeTruthy();
    expect(screen.queryByText(/This is your profile/)).toBeNull();
  });

  it('tapping an interest shows matches, and tapping a match selects its pin', () => {
    const onSelect = vi.fn();
    render(<ProfileCard data={data} profileId={DEMO_USER_ID} viewerId={DEMO_USER_ID} onClose={() => {}} onSelect={onSelect} />);
    const tag = screen.getByRole('button', { name: 'Gardening' });
    fireEvent.click(tag);
    expect(tag.getAttribute('aria-pressed')).toBe('true');
    // The same event can also be in "Coming up for you", so click it inside the interest results.
    const results = document.getElementById('pf-interest-results')!;
    fireEvent.click(within(results).getByRole('button', { name: /Fall Garden Clean-up/ }));
    expect(onSelect).toHaveBeenCalledWith('event-02');
    fireEvent.click(screen.getByRole('button', { name: 'Visual design' }));
    expect(screen.getByText(/Nothing on Wyandotte St E for “Visual design” yet/)).toBeTruthy();
  });

  it('tells you when you are looking at your own profile', () => {
    render(<ProfileCard data={data} profileId={DEMO_USER_ID} viewerId={DEMO_USER_ID} onClose={() => {}} onSelect={() => {}} />);
    expect(screen.getByText(/This is your profile/)).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
  });

  it('a business profile shows hours, its offer and a link to its pin', () => {
    const onSelect = vi.fn();
    render(<ProfileCard data={data} profileId={DEMO_BUSINESS_ID} viewerId={DEMO_USER_ID} onClose={() => {}} onSelect={onSelect} />);
    expect(screen.getByText('Tue–Sun 7:00–16:00')).toBeTruthy();
    expect(screen.getByText('Sidewalk-work special: 2 coffees for $5')).toBeTruthy();
    expect(screen.queryByText('Rosa (demo owner)')).toBeNull(); // owner identity is private
    fireEvent.click(screen.getByRole('button', { name: 'Show on map →' }));
    expect(onSelect).toHaveBeenCalledWith('place-01');
  });

  it('a BIA profile lists public notices and can show its corridor', () => {
    const onToggle = vi.fn();
    render(
      <ProfileCard data={data} profileId="profile-bia" viewerId={DEMO_USER_ID} onClose={() => {}} onSelect={() => {}} corridorShown onToggleCorridor={onToggle} />,
    );
    expect(screen.getByRole('region', { name: 'Public notices' })).toBeTruthy();
    const btn = screen.getByRole('button', { name: 'Hide corridor on map' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalled();
  });

  it('Back and × both close the profile', () => {
    const onClose = vi.fn();
    render(<ProfileCard data={data} profileId="profile-bia" viewerId={DEMO_USER_ID} onClose={onClose} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Close profile' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('connecting profiles to the map and cards', () => {
  it('a place card opens the full profile of whoever runs it', () => {
    const onOpenProfile = vi.fn();
    render(<PlaceCard data={data} selectedId="place-15" viewerId={DEMO_USER_ID} mode="me" onSelect={() => {}} onOpenProfile={onOpenProfile} />);
    fireEvent.click(screen.getByRole('button', { name: 'View full profile →' }));
    expect(onOpenProfile).toHaveBeenCalledWith('profile-bia');
  });

  it('"Raised by" on a public report opens the reporter profile', () => {
    const onOpenProfile = vi.fn();
    render(<PlaceCard data={data} selectedId="update-01" viewerId={DEMO_USER_ID} mode="me" onSelect={() => {}} onOpenProfile={onOpenProfile} />);
    fireEvent.click(screen.getByRole('button', { name: 'Olde Riverside BIA (demo)' }));
    expect(onOpenProfile).toHaveBeenCalledWith('profile-bia');
  });

  it('"Raised by" on someone else\'s private report is hidden', () => {
    render(<PlaceCard data={data} selectedId="issue-05" viewerId={DEMO_BUSINESS_ID} mode="business" onSelect={() => {}} onOpenProfile={() => {}} />);
    // KAN-37: a resident's street-light report goes to the city, so the city approves it, not the BIA.
    expect(screen.getByText('Hidden until City of Windsor 311 approves it')).toBeTruthy();
    expect(screen.queryByText(resident.name)).toBeNull();
  });

  it('the avatar in the top bar opens your own profile', () => {
    const onOpenProfile = vi.fn();
    render(
      <UserPresence
        user={resident}
        business={business}
        mode="me"
        onModeChange={() => {}}
        showMe={false}
        onShowMeChange={() => {}}
        onOpenProfile={onOpenProfile}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${resident.name}.*open profile`, 'i') }));
    expect(onOpenProfile).toHaveBeenCalledWith(DEMO_USER_ID);
  });
});
