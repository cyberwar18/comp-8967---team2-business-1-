// KAN-53 (Devu): the Marketplace page on screen.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import MarketplacePage from './MarketplacePage';
import { NotificationBell } from '../../app/Notifications';
import { clearSubmittedReports, getListingPins, getListingReports, setClockForTests } from '../../data/api';
import { personaById } from '../requests/personas';

const resident = personaById('resident');
const maya = personaById('parent');
const rosa = personaById('business');
const jordan = personaById('city-lead');
const NOW = new Date('2026-11-14T12:00:00');

beforeEach(() => {
  setClockForTests(() => NOW);
  window.history.replaceState(null, '', '/#/marketplace');
});
afterEach(() => {
  cleanup();
  clearSubmittedReports();
  setClockForTests(null);
});

const show = (p = resident) => render(<MarketplacePage persona={p} now={NOW} />);
const cards = async () => {
  await screen.findByRole('heading', { level: 1, name: 'Marketplace' });
  return screen.getAllByRole('article');
};
const open = async (title: RegExp) => {
  await cards();
  fireEvent.click(screen.getByRole('button', { name: title }));
  return screen.findByRole('heading', { level: 2, name: title });
};

describe('Browse', () => {
  it('shows live listings with a picture, kind, price, meeting spot and distance, and not the ended one', async () => {
    show();
    const list = await cards();
    expect(list).toHaveLength(14);
    const bike = list.find((c) => /Kids' bike/.test(c.textContent ?? ''))!;
    expect(within(bike).getByRole('img', { name: 'Drawing of a bicycle' })).toBeTruthy();
    expect(bike.textContent).toMatch(/For sale/);
    expect(bike.textContent).toMatch(/\$45/);
    expect(bike.textContent).toMatch(/Near Thompson Parkette · \d+ m away|under 100 m away/);
    expect(bike.textContent).toMatch(/Maya R\./);
    expect(bike.textContent).toMatch(/Ends Jan 10/);
    expect(bike.textContent).toMatch(/On the map/);
    expect(screen.queryByText(/Display shelves for a shop/)).toBeNull(); // ended
  });

  it('search narrows the list and says how many; no match gives a way out', async () => {
    show();
    await cards();
    fireEvent.change(screen.getByLabelText('Search listings'), { target: { value: 'bike' } });
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('2 listings')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search listings'), { target: { value: 'zzzz' } });
    expect(screen.getByText('No listings match.')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /Clear filters/ })[0]);
    expect(screen.getAllByRole('article')).toHaveLength(14);
  });

  it('filters by kind, Free only and price, and warns that listings with no price are hidden', async () => {
    show();
    await cards();
    const kind = screen.getByRole('group', { name: 'Kind' });
    fireEvent.click(within(kind).getByRole('button', { name: 'Free' }));
    expect(within(kind).getByRole('button', { name: 'Free' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('article')).toHaveLength(3);
    fireEvent.click(within(kind).getByRole('button', { name: 'All' }));
    fireEvent.click(screen.getByLabelText('Free only'));
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByText(/Listings with no price are hidden/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Free only'));
    fireEvent.change(screen.getByLabelText('Highest price ($)'), { target: { value: '30' } });
    const prices = screen.getAllByRole('article').map((a) => a.textContent ?? '');
    expect(prices.length).toBeGreaterThan(3);
    expect(prices.some((t) => /\$220/.test(t))).toBe(false);
  });

  it('filters by distance and sorts', async () => {
    show(rosa);
    await cards();
    fireEvent.change(screen.getByLabelText('Distance'), { target: { value: '150' } });
    const near = screen.getAllByRole('article');
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThan(14);
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'nearest' } });
    expect(screen.getByText(/Distances are from your home area/)).toBeTruthy();
  });

  it('says where distances are measured from when the person has no home spot', async () => {
    show(jordan);
    await cards();
    expect(screen.getByText(/middle of the corridor/)).toBeTruthy();
  });
});

describe('One listing', () => {
  it('opens a listing with its details, and a link from the map opens it directly', async () => {
    window.history.replaceState(null, '', '/#/marketplace?l=mk-03');
    show();
    expect(await screen.findByRole('heading', { level: 2, name: 'Snow blower, barely used' })).toBeTruthy();
    expect(screen.getByText('$220', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText(/Near Corridor Community Hall/)).toBeTruthy();
    expect(screen.getByText('Marcus T.')).toBeTruthy();
    const mapLink = screen.getByRole('link', { name: 'See it on the map' });
    expect(mapLink.getAttribute('href')).toMatch(/pin=mk-03#\/map$/);
    fireEvent.click(screen.getByRole('button', { name: /Back to listings/ }));
    expect((await cards()).length).toBe(14);
  });

  it('Message the seller opens a chat in Chats', async () => {
    show();
    await open(/Kids' bike/);
    fireEvent.click(screen.getByRole('button', { name: 'Message the seller' }));
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/chats\?c=chat-/));
  });

  it('says why when it cannot message the seller', async () => {
    show(jordan);
    await open(/Kids' bike/);
    fireEvent.click(screen.getByRole('button', { name: 'Message the seller' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/City staff message people about their requests only/);
    expect(window.location.hash).not.toMatch(/chats/);
  });

  it('reports a listing, which reaches the staff queue, and then says it was reported', async () => {
    show();
    await open(/Snow blower/);
    fireEvent.click(screen.getByRole('button', { name: 'Report this listing' }));
    fireEvent.change(screen.getByLabelText('Why are you reporting it?'), { target: { value: 'Scam or fake' } });
    fireEvent.change(screen.getByLabelText('More detail (optional)'), { target: { value: 'Wants a gift card.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    expect((await screen.findByRole('status')).textContent).toMatch(/Neighbr staff will look at this listing/);
    expect(screen.getByText('You reported this listing.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Report this listing' })).toBeNull();
    const [r] = await getListingReports();
    expect(r).toMatchObject({ listingId: 'mk-03', reason: 'Scam or fake', note: 'Wants a gift card.', reportedBy: 'profile-resident' });
  });

  it('shows the seller their own buttons, not Message or Report', async () => {
    show(maya);
    await open(/Kids' bike/);
    expect(screen.getByRole('button', { name: 'Mark as sold or done' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Take it down' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Message the seller' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Report this listing' })).toBeNull();
  });

  it('marks a listing sold: it ends, leaves the map, and the seller gets "This post has ended"', async () => {
    render(
      <>
        <NotificationBell persona={maya} />
        <MarketplacePage persona={maya} now={NOW} />
      </>,
    );
    await open(/Kids' bike/);
    fireEvent.click(screen.getByRole('button', { name: 'Mark as sold or done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, end it' }));
    await waitFor(() => expect(screen.getByText(/This post has ended\. It is no longer in the Marketplace or on the map\./)).toBeTruthy());
    expect((await getListingPins()).some((p) => p.id === 'mk-01')).toBe(false);
    expect(screen.getByRole('button', { name: 'Post again' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect((await screen.findByText('This post has ended')).closest('a')?.getAttribute('href')).toBe('#/marketplace?l=mk-01');
  });

  it('posts an ended listing again', async () => {
    show(rosa);
    fireEvent.click(await screen.findByRole('tab', { name: /My listings/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Display shelves/ }));
    expect(screen.getByText(/This post has ended/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Post it again for'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post again' }));
    await waitFor(() => expect(screen.getByText('Your listing is up again.')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Post again' })).toBeNull();
    expect(screen.getByText('Ends Dec 14')).toBeTruthy();
  });
});

describe('Create a listing', () => {
  const fill = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

  it('asks for what is missing and focuses the first problem', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Create a listing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Post listing' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Please fix the 4 items/);
    expect(screen.getByText('Choose what kind of listing this is.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('What kind of listing is it?'));
  });

  it('posts a listing: it opens, shows in My listings and has a pin on the map', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Create a listing' }));
    fill('What kind of listing is it?', 'sale');
    fill('Title', 'Desk lamp');
    fill('Description', 'Works well, with a new bulb.');
    fill('Price ($)', '12');
    fill('Public meeting spot', 'place-02');
    fill('Keep it up for', '7');
    fireEvent.click(screen.getByRole('button', { name: 'Post listing' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Desk lamp' })).toBeTruthy();
    expect(screen.getByText('Your listing is up, and on the map.')).toBeTruthy();
    expect(screen.getByText('Ends Nov 21')).toBeTruthy();
    expect((await getListingPins()).some((p) => p.name === 'Desk lamp')).toBe(true);
  });

  it('does not offer Business offers to a resident, and offers them to a business', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Create a listing' }));
    const kinds = within(screen.getByLabelText('What kind of listing is it?')).getAllByRole('option').map((o) => o.textContent);
    expect(kinds).not.toContain('Business offers');
    cleanup();
    show(rosa);
    fireEvent.click(await screen.findByRole('button', { name: 'Create a listing' }));
    expect(within(screen.getByLabelText('What kind of listing is it?')).getAllByRole('option').map((o) => o.textContent)).toContain('Business offers');
  });

  it('hides the price for Free and leaves a listing off the map when asked', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Create a listing' }));
    fill('What kind of listing is it?', 'free');
    expect(screen.queryByLabelText(/Price/)).toBeNull();
    fill('Title', 'Old magazines');
    fill('Description', 'A stack of garden magazines.');
    fill('Public meeting spot', 'place-13');
    fireEvent.click(screen.getByLabelText('Show it on the map, at the meeting spot'));
    fireEvent.click(screen.getByRole('button', { name: 'Post listing' }));
    expect(await screen.findByText('Your listing is up. It is not on the map.')).toBeTruthy();
    expect((await getListingPins()).some((p) => p.name === 'Old magazines')).toBe(false);
  });

  it('explains instead of offering to post for City staff', async () => {
    show(jordan);
    await cards();
    expect(screen.queryByRole('button', { name: 'Create a listing' })).toBeNull();
    expect(screen.getByRole('note').textContent).toMatch(/do not post in the Marketplace/);
  });
});
