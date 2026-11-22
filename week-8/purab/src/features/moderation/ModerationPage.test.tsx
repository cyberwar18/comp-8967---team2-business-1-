// KAN-52 (Mounika): the Review page for Neighbr staff, on screen.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ModerationPage from './ModerationPage';
import { clearSubmittedReports, getMapData, getNotifications, postOpenNotice, reportListing, reportMessage, reportPost, resetDemo, setClockForTests, startChat, getChat } from '../../data/api';
import { personaById } from '../requests/personas';

const NOW = new Date('2026-11-15T12:00:00');
const staff = personaById('neighbr-staff');
const resident = personaById('resident');

beforeEach(() => {
  resetDemo();
  setClockForTests(() => NOW);
});
afterEach(() => {
  cleanup();
  resetDemo();
  clearSubmittedReports();
  setClockForTests(null);
});

const open = async () => {
  render(<ModerationPage persona={staff} />);
  await screen.findByRole('heading', { level: 1, name: 'Review' });
};
const card = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li')!;

describe('who can open it', () => {
  it('everyone else is told it is for Neighbr staff, and sees no queue', () => {
    for (const id of ['resident', 'city-lead', 'community-organizer']) {
      const { unmount } = render(<ModerationPage persona={personaById(id)} />);
      expect(screen.getByText(/This page is for Neighbr staff/)).toBeTruthy();
      expect(screen.queryByRole('tab')).toBeNull();
      unmount();
    }
  });
});

describe('event permits', () => {
  it('shows the permit waiting, with the file, the group and the place', async () => {
    await open();
    expect(screen.getByRole('tab', { name: /Event permits/ }).getAttribute('aria-selected')).toBe('true');
    const c = card('Parkette bench painting day');
    expect(within(c).getByText(/Riverside Neighbours Network · .* · Thompson Parkette/)).toBeTruthy();
    expect(within(c).getByText(/city-park-permit-sample\.pdf/)).toBeTruthy();
    expect(within(c).getByText('Permit with Neighbr staff')).toBeTruthy();
  });

  it('Approve puts the event on the map and tells the group', async () => {
    await open();
    fireEvent.click(within(card('Parkette bench painting day')).getByRole('button', { name: /Approve the permit/ }));
    expect(await screen.findByText(/is approved\. It is public now and on the map/)).toBeTruthy();
    expect((await getMapData()).events.some((e) => e.name === 'Parkette bench painting day')).toBe(true);
    expect((await getNotifications(personaById('community-organizer'))).some((n) => /approved the permit/.test(n.text))).toBe(true);
    expect(screen.getByText('No permits are waiting for you. Nice and quiet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Decided/ }));
    expect(within(card('Parkette bench painting day')).getByText('Permit approved by Neighbr staff')).toBeTruthy();
  });

  it('Decline asks for a reason first, then tells the group the reason', async () => {
    await open();
    const c = card('Parkette bench painting day');
    fireEvent.click(within(c).getByRole('button', { name: /Decline the permit/ }));
    const form = screen.getByRole('form', { name: /Decline Parkette bench painting day/ });
    fireEvent.click(within(form).getByRole('button', { name: 'Decline the permit' }));
    expect(within(form).getByRole('alert').textContent).toBe('Give a reason, so the group knows what to fix.');
    expect(document.activeElement).toBe(within(form).getByRole('textbox'));
    fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'The permit covers Saturday only.' } });
    expect(within(form).queryByRole('alert')).toBeNull(); // typing clears the old message
    fireEvent.click(within(form).getByRole('button', { name: 'Decline the permit' }));
    expect(await screen.findByText(/was declined\. The group has been notified, with your reason/)).toBeTruthy();
    expect((await getMapData()).events.some((e) => e.name === 'Parkette bench painting day')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /^Decided/ }));
    expect(within(card('Parkette bench painting day')).getByText('Permit declined by Neighbr staff')).toBeTruthy();
  });

  it('Ask for more information moves it to "Waiting for the group"', async () => {
    await open();
    fireEvent.click(within(card('Parkette bench painting day')).getByRole('button', { name: /Ask for more information/ }));
    const form = screen.getByRole('form', { name: /Ask about Parkette bench painting day/ });
    fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'Which days is the park booked for?' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Send the question' }));
    expect(await screen.findByText(/You asked the group/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Waiting for the group/ }));
    const c = card('Parkette bench painting day');
    expect(within(c).getByText('Neighbr staff asked for more information', { selector: '.mo-pill' })).toBeTruthy();
    expect(within(c).queryByRole('button', { name: /Approve/ })).toBeNull(); // nothing to approve until they answer
  });

  it('Cancel closes the form without sending', async () => {
    await open();
    const c = card('Parkette bench painting day');
    fireEvent.click(within(c).getByRole('button', { name: /Decline the permit/ }));
    fireEvent.click(within(c).getByRole('button', { name: 'Cancel' }));
    expect(within(c).getByRole('button', { name: /Approve the permit/ })).toBeTruthy();
  });

  it('shows the history of the permit', async () => {
    await open();
    const c = card('Parkette bench painting day');
    expect(within(c).getByText('History (2)')).toBeTruthy();
    expect(within(c).getByText('Permit uploaded')).toBeTruthy();
    expect(within(c).getByText('Approved by an organizer, sent to Neighbr staff')).toBeTruthy();
  });
});

describe('reported content', () => {
  const report = async () => {
    await reportListing(resident, 'mk-03', 'Scam or fake', 'Asked me to pay by gift card.');
    const maya = personaById('parent');
    const chatId = await startChat(maya, 'profile-resident', 'Buy my snow blower, pay in gift cards!', 'Team 2 Group 10');
    await reportMessage(resident, chatId, (await getChat(resident, chatId))!.messages[0].id, 'Spam or scam', '');
    const rosa = personaById('business');
    const post = (await postOpenNotice(rosa, 'place-01', 'We are open as usual. Use the side door.')) as { id: string };
    await reportPost(resident, post.id, 'Offensive', '');
    return chatId;
  };
  const goToReports = async () => {
    await open();
    fireEvent.click(screen.getByRole('tab', { name: /Reported content/ }));
  };

  it('says so when nothing is waiting', async () => {
    await goToReports();
    expect(screen.getByText('Nothing is waiting for a decision.')).toBeTruthy();
  });

  it('lists chats, listings and posts, with counts, who reported, and a copy of the content', async () => {
    await report();
    await goToReports();
    expect(screen.getByRole('tab', { name: /Reported content/ }).textContent).toMatch(/3/);
    expect(screen.getByRole('button', { name: 'All (3)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chats (1)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Listings (1)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Posts (1)' })).toBeTruthy();
    const items = screen.getAllByRole('listitem').filter((li) => li.classList.contains('mo-card'));
    expect(items).toHaveLength(3);
    expect(screen.getByText('Buy my snow blower, pay in gift cards!')).toBeTruthy();
    expect(screen.getByText(/Asked me to pay by gift card\./)).toBeTruthy();
    expect(screen.getAllByText(/Reported by Team 2 Group 10/).length).toBe(3);
  });

  it('filters by kind', async () => {
    await report();
    await goToReports();
    fireEvent.click(screen.getByRole('button', { name: 'Listings (1)' }));
    expect(screen.getAllByRole('listitem').filter((li) => li.classList.contains('mo-card'))).toHaveLength(1);
    expect(screen.getByText('Snow blower, barely used')).toBeTruthy();
    expect(screen.queryByText('Buy my snow blower, pay in gift cards!')).toBeNull();
  });

  it('Hide takes a chat message down for both people, and the report moves to Decided', async () => {
    const chatId = await report();
    await goToReports();
    fireEvent.click(screen.getByRole('button', { name: 'Chats (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide this chat message' }));
    expect(await screen.findByText(/Hidden\. The message is replaced for both people in the chat\./)).toBeTruthy();
    expect((await getChat(resident, chatId))!.messages[0].removed).toBe(true);
    await waitFor(() => expect(screen.getByText('Nothing is waiting for a decision.')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Decided' }));
    expect(screen.getByText('Hidden', { selector: '.mo-pill' })).toBeTruthy();
  });

  it('Keep leaves a listing up', async () => {
    await report();
    await goToReports();
    fireEvent.click(screen.getByRole('button', { name: 'Listings (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep this marketplace listing up' }));
    expect(await screen.findByText(/Kept up\. The person who reported it has been notified\./)).toBeTruthy();
  });

  it('a decided report has no Hide or Keep buttons', async () => {
    await report();
    await goToReports();
    fireEvent.click(screen.getByRole('button', { name: 'Posts (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep this business post up' }));
    await screen.findByText(/Kept up/);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.queryByRole('button', { name: /Keep this business post/ })).toBeNull();
  });

  it('tells staff the person it is about is never told who reported', async () => {
    await goToReports();
    expect(screen.getByText(/Only staff see who reported something/)).toBeTruthy();
  });
});
