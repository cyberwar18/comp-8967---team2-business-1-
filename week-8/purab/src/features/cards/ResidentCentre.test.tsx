// KAN-37 (Bhavana): the resident at the centre, and the owner kept separate from the business.
// Follows Nigel's feedback (Oct 19) and Mounika's profile data (KAN-36).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import raw from '../../data/mock-data.json';
import {
  DEMO_BUSINESS_ID,
  DEMO_USER_ID,
  areaResponders,
  businessesOwnedBy,
  comingUpFor,
  isSamePerson,
  ownerOf,
  profileById,
  recipientsOf,
  reportsSentTo,
  type CardData,
} from './cardData';
import { ProfileCard } from './ProfileCard';
import { PlaceCard } from './PlaceCard';
import { UserPresence } from './UserPresence';

const data = raw as unknown as CardData;
const resident = profileById(data, DEMO_USER_ID)!;
const business = profileById(data, DEMO_BUSINESS_ID)!;
const OWNER_ID = 'profile-owner-rosa';
const owner = profileById(data, OWNER_ID)!;
const issue = (id: string) => data.updates.find((u) => u.id === id)!;

afterEach(cleanup);

describe('data helpers', () => {
  it('links the business to its owner, and the owner back to the business', () => {
    expect(ownerOf(data, business)?.id).toBe(OWNER_ID);
    expect(businessesOwnedBy(data, OWNER_ID).map((b) => b.id)).toEqual([DEMO_BUSINESS_ID]);
  });

  it('treats the business and its owner as the same person for "only you" sections', () => {
    expect(isSamePerson(data, owner, DEMO_BUSINESS_ID)).toBe(true);
    expect(isSamePerson(data, business, OWNER_ID)).toBe(true);
    expect(isSamePerson(data, owner, DEMO_USER_ID)).toBe(false);
    expect(isSamePerson(data, business, DEMO_USER_ID)).toBe(false);
  });

  it('sends a resident report to the city with a copy to the councillor, and a business report to the BIA', () => {
    const resReport = recipientsOf(data, issue('issue-05'));
    expect(resReport.to?.id).toBe('profile-city');
    expect(resReport.cc?.id).toBe('profile-councillor');
    expect(recipientsOf(data, issue('issue-04')).to?.id).toBe('profile-bia');
  });

  it('lists the ward responders first, then the MP, and never the BIA', () => {
    const ids = areaResponders(data).map((p) => p.id);
    expect(ids.slice(0, 2)).toEqual(['profile-councillor', 'profile-city']);
    expect(ids).toContain('profile-mp');
    expect(ids).not.toContain('profile-bia');
  });

  it('only shows a responder the reports this viewer may see', () => {
    // the resident's own private report, plus the City's published outcomes (public for everyone)
    expect(reportsSentTo(data, 'profile-city', DEMO_USER_ID).map((i) => i.id)).toEqual(['issue-05', 'issue-07', 'issue-08']);
    // the business sees no private report of the resident's, only the published outcomes
    expect(reportsSentTo(data, 'profile-city', DEMO_BUSINESS_ID).map((i) => i.id)).toEqual(['issue-07', 'issue-08']);
  });

  it('picks upcoming events and offers from the resident’s interests, never past ones', () => {
    const list = comingUpFor(data, resident);
    expect(list.length).toBeGreaterThan(0);
    expect(list.length).toBeLessThanOrEqual(3);
    expect(list.every((i) => (i.kind === 'event' || i.kind === 'offer') && i.status !== 'past')).toBe(true);
  });
});

describe('your own resident profile is your home base', () => {
  it('shows coming up, my reports with where they went, and who to contact', () => {
    const onOpenProfile = vi.fn();
    render(<ProfileCard data={data} profileId={DEMO_USER_ID} viewerId={DEMO_USER_ID} onClose={() => {}} onSelect={() => {}} onOpenProfile={onOpenProfile} />);
    expect(screen.getByRole('region', { name: 'Coming up for you' })).toBeTruthy();

    const reports = screen.getByRole('region', { name: 'My reports' });
    expect(within(reports).getByText('Only you see this')).toBeTruthy();
    expect(within(reports).getByText(/Streetlight out near the pharmacy/)).toBeTruthy();
    fireEvent.click(within(reports).getByRole('button', { name: 'City of Windsor 311 (demo)' }));
    expect(onOpenProfile).toHaveBeenCalledWith('profile-city');

    const contact = screen.getByRole('region', { name: 'Who to contact about a problem' });
    expect(within(contact).getByText(/not the BIA/)).toBeTruthy();
    fireEvent.click(within(contact).getByRole('button', { name: 'Ward Councillor (demo)' }));
    expect(onOpenProfile).toHaveBeenCalledWith('profile-councillor');
  });

  it('other people never see your reports or the home-base sections', () => {
    render(<ProfileCard data={data} profileId={DEMO_USER_ID} viewerId={DEMO_BUSINESS_ID} onClose={() => {}} onSelect={() => {}} />);
    expect(screen.queryByRole('region', { name: 'My reports' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Coming up for you' })).toBeNull();
    expect(screen.queryByText(/Streetlight out/)).toBeNull();
  });
});

describe('owner and business are separate', () => {
  it('other people see the business without its owner', () => {
    render(<ProfileCard data={data} profileId={DEMO_BUSINESS_ID} viewerId={DEMO_USER_ID} onClose={() => {}} onSelect={() => {}} onOpenProfile={() => {}} />);
    expect(screen.queryByText(owner.name)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Run by you' })).toBeNull();
    // The business belongs to the BIA corridor.
    expect(screen.getByRole('button', { name: 'Olde Riverside BIA (demo)' })).toBeTruthy();
  });

  it('the owner (in My business mode) sees a private link to their personal profile', () => {
    const onOpenProfile = vi.fn();
    render(<ProfileCard data={data} profileId={DEMO_BUSINESS_ID} viewerId={DEMO_BUSINESS_ID} onClose={() => {}} onSelect={() => {}} onOpenProfile={onOpenProfile} />);
    const runBy = screen.getByRole('region', { name: 'Run by you' });
    expect(within(runBy).getByText('Only you see this')).toBeTruthy();
    fireEvent.click(within(runBy).getByRole('button', { name: owner.name }));
    expect(onOpenProfile).toHaveBeenCalledWith(OWNER_ID);
  });

  it('the owner’s personal profile lives in the city and hides the business from others', () => {
    render(<ProfileCard data={data} profileId={OWNER_ID} viewerId={DEMO_USER_ID} onClose={() => {}} onSelect={() => {}} onOpenProfile={() => {}} />);
    expect(screen.getByText('City of Windsor')).toBeTruthy();
    expect(screen.queryByText("Rosa's Bakery")).toBeNull();
    expect(screen.queryByRole('region', { name: 'Your business' })).toBeNull();
  });

  it('the owner sees "Your business" on their own personal profile', () => {
    render(<ProfileCard data={data} profileId={OWNER_ID} viewerId={DEMO_BUSINESS_ID} onClose={() => {}} onSelect={() => {}} onOpenProfile={() => {}} />);
    const yours = screen.getByRole('region', { name: 'Your business' });
    expect(within(yours).getByRole('button', { name: "Rosa's Bakery" })).toBeTruthy();
  });

  it('the top bar names the owner in My business mode', () => {
    render(
      <UserPresence user={resident} business={business} owner={owner} mode="business" onModeChange={() => {}} showMe={false} onShowMeChange={() => {}} />,
    );
    expect(screen.getByText('run by Rosa Alvarez')).toBeTruthy();
  });
});

describe('responder profiles and report cards', () => {
  it('a councillor profile shows what they handle', () => {
    render(<ProfileCard data={data} profileId="profile-councillor" viewerId={DEMO_USER_ID} onClose={() => {}} onSelect={() => {}} />);
    const handles = screen.getByRole('region', { name: 'Handles' });
    expect(within(handles).getByText('Potholes')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Your reports sent here' })).toBeTruthy(); // the copy of issue-05
  });

  it('the MP profile says local repairs go elsewhere', () => {
    render(<ProfileCard data={data} profileId="profile-mp" viewerId={DEMO_USER_ID} onClose={() => {}} onSelect={() => {}} />);
    expect(screen.getByText(/Federal matters only/)).toBeTruthy();
  });

  it('the report card says who it was sent to, and who can see it', () => {
    render(<PlaceCard data={data} selectedId="issue-05" viewerId={DEMO_USER_ID} mode="me" onSelect={() => {}} onOpenProfile={() => {}} />);
    expect(screen.getByText('Sent to')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'City of Windsor 311 (demo)' })).toBeTruthy();
    expect(screen.getByText('Only you and City of Windsor 311, until approved')).toBeTruthy();
  });

  it('a business request still goes to the BIA', () => {
    render(<PlaceCard data={data} selectedId="issue-04" viewerId={DEMO_BUSINESS_ID} mode="business" onSelect={() => {}} onOpenProfile={() => {}} />);
    expect(screen.getByText('Only you and the BIA, until approved')).toBeTruthy();
  });
});
