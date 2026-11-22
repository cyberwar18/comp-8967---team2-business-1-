// Checks tasks 9–12 on screen (no real map needed).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import raw from '../../data/mock-data.json';
import { DEMO_BUSINESS_ID, DEMO_USER_ID, youAreHere, profileById, type CardData } from './cardData';
import { UserPresence } from './UserPresence';
import { PlaceCard } from './PlaceCard';
import { AroundYou } from './AroundYou';
import { ActivityCard } from './ActivityCard';

const data = raw as unknown as CardData;
const user = profileById(data, DEMO_USER_ID)!;
const business = profileById(data, DEMO_BUSINESS_ID)!;

afterEach(cleanup);

describe('task 9: UserPresence', () => {
  it('shows the demo user with a Resident badge and switches to My business', () => {
    const onModeChange = vi.fn();
    render(<UserPresence user={user} business={business} mode="me" onModeChange={onModeChange} showMe={false} onShowMeChange={() => {}} />);
    expect(screen.getByText(user.name)).toBeTruthy();
    expect(screen.getByText('Resident')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Me' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'My business' }));
    expect(onModeChange).toHaveBeenCalledWith('business');
  });

  it('in My business mode shows the business and who is acting for it', () => {
    render(<UserPresence user={user} business={business} mode="business" onModeChange={() => {}} showMe={false} onShowMeChange={() => {}} />);
    expect(screen.getByText("Rosa's Bakery")).toBeTruthy();
    expect(screen.getByText('Business', { selector: '.up-badge' })).toBeTruthy();
    // No owner passed: falls back to the signed-in person. With an owner, see ResidentCentre.test.tsx.
    expect(screen.getByText(`run by ${user.name.replace(/\s*\(demo\)/, '')}`)).toBeTruthy();
  });

  it('toggles the "you are here" marker', () => {
    const onShowMeChange = vi.fn();
    render(<UserPresence user={user} business={business} mode="me" onModeChange={() => {}} showMe={false} onShowMeChange={onShowMeChange} />);
    fireEvent.click(screen.getByLabelText('Show me on the map'));
    expect(onShowMeChange).toHaveBeenCalledWith(true);
  });
});

describe('task 10: PlaceCard', () => {
  it("shows Rosa's Bakery with photo placeholder, hours, profile and what is happening there", () => {
    render(<PlaceCard data={data} selectedId="place-01" viewerId={DEMO_USER_ID} mode="me" onSelect={() => {}} />);
    expect(screen.getByRole('heading', { name: "Rosa's Bakery" })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Photo placeholder/ })).toBeTruthy();
    expect(screen.getByText('Tue–Sun 7:00–16:00')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Profile' })).toBeTruthy();
    const here = screen.getByRole('region', { name: 'Happening here' });
    expect(within(here).getByText('Sidewalk-work special: 2 coffees for $5')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'My requests' })).toBeNull(); // owner-only
  });

  it('shows the owner their private requests in My business mode', () => {
    render(<PlaceCard data={data} selectedId="place-01" viewerId={DEMO_BUSINESS_ID} mode="business" onSelect={() => {}} />);
    const mine = screen.getByRole('region', { name: 'My requests' });
    expect(within(mine).getByText('Sidewalk closed in front of the bakery')).toBeTruthy();
    expect(within(mine).getByRole('img', { name: /step 2 of 3, Acknowledged/ })).toBeTruthy();
  });

  it('an event card links back to its place, and × closes the card', () => {
    const onSelect = vi.fn();
    render(<PlaceCard data={data} selectedId="event-01" viewerId={DEMO_USER_ID} mode="me" onSelect={onSelect} />);
    expect(screen.getByText(/Fri, Nov 27/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /At Corridor Community Hall/ }));
    expect(onSelect).toHaveBeenCalledWith('place-12');
    fireEvent.click(screen.getByRole('button', { name: 'Close card' }));
    expect(onSelect).toHaveBeenLastCalledWith(null); // × clears the selection
  });

  it('Back to list keeps the pin selected (only closes the card)', () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    render(<PlaceCard data={data} selectedId="place-02" viewerId={DEMO_USER_ID} mode="me" onSelect={onSelect} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Back to list/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('task 11: activity cards', () => {
  it('an issue card has a progress ring', () => {
    const issue = data.updates.find((i) => i.id === 'issue-05')!;
    render(<ActivityCard item={issue} onSelect={() => {}} />);
    expect(screen.getByRole('img', { name: 'Progress: step 1 of 3, Reported' })).toBeTruthy();
  });

  it('Around you lists nearby activity and filters to offers', () => {
    render(<AroundYou data={data} viewerId={DEMO_USER_ID} from={youAreHere(data)} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/nearby, nearest first/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Offers' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});

describe('task 12: linking cards and pins', () => {
  it('clicking an offer selects its shop pin', () => {
    const onSelect = vi.fn();
    render(<AroundYou data={data} viewerId={DEMO_USER_ID} from={youAreHere(data)} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /2 coffees for \$5/ }));
    expect(onSelect).toHaveBeenCalledWith('place-01');
  });

  it('the card for the selected pin is highlighted', () => {
    render(<AroundYou data={data} viewerId={DEMO_USER_ID} from={youAreHere(data)} selectedId="event-01" onSelect={() => {}} />);
    const card = screen.getByRole('button', { name: /Friday Market/ });
    expect(card.getAttribute('aria-current')).toBe('true');
  });
});
