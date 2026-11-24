// KAN-51 (Bhavana): the Chats page on screen.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChatsPage from './ChatsPage';
import RequestsPage from '../requests/RequestsPage';
import { NotificationBell } from '../../app/Notifications';
import { clearSubmittedReports, getMessageReports, setClockForTests } from '../../data/api';
import { personaById } from '../requests/personas';

const resident = personaById('resident');
const maya = personaById('parent');
const priya = personaById('community-organizer');
const jordan = personaById('city-lead');
const councillor = personaById('councillor');

beforeEach(() => {
  setClockForTests(() => new Date('2026-11-13T15:00:00Z'));
  window.location.hash = '#/chats';
});
afterEach(() => {
  cleanup();
  clearSubmittedReports();
  setClockForTests(null);
});

const chatList = () => screen.getByRole('list', { name: 'Your chats' });
const openChat = async (name: RegExp) => {
  const list = await screen.findByRole('list', { name: 'Your chats' });
  fireEvent.click(within(list).getByRole('button', { name }));
};

describe('Chats page', () => {
  it('lists your chats with what is new', async () => {
    render(<ChatsPage persona={resident} />);
    await openChat(/Jamie K\./);
    const items = within(chatList()).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toMatch(/Jamie K\..*Direct message/);
    expect(items[1].textContent).toMatch(/Riverside Neighbours Network.*Your group/);
  });

  it('report a message, then block the sender, then unblock', async () => {
    render(<ChatsPage persona={resident} />);
    await openChat(/Jamie K\./);
    await screen.findByRole('heading', { level: 2, name: 'Jamie K.' });
    fireEvent.click(screen.getByRole('button', { name: 'Report this message from Jamie K.' }));
    fireEvent.change(screen.getByLabelText('Why are you reporting it?'), { target: { value: 'Spam or scam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    expect(await screen.findByText('You reported this. Neighbr staff will review it.')).toBeTruthy();
    expect((await getMessageReports())[0].reportedProfile).toBe('profile-resident-jamie');

    fireEvent.click(screen.getByRole('button', { name: 'Block Jamie K.' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Block Jamie K.?' })).getByRole('button', { name: 'Yes, block' }));
    expect(await screen.findByText("You blocked Jamie K. They can't message you, and they aren't told.")).toBeTruthy();
    expect(screen.getByText('You blocked Jamie K. Unblock them to send a message.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Unblock Jamie K.' }));
    expect(await screen.findByRole('button', { name: 'Send' })).toBeTruthy();
  });

  it('in a chat about a request, the sender sees the organization and cannot block it', async () => {
    render(<ChatsPage persona={maya} />);
    await openChat(/Pothole on Wyandotte/);
    await screen.findByRole('heading', { level: 2, name: 'Pothole on Wyandotte at Pierre Ave' });
    const msgs = within(screen.getByRole('list', { name: 'Messages' })).getAllByRole('listitem');
    expect(msgs[0].textContent).toMatch(/^City of Windsor 311/);
    expect(document.body.textContent).not.toMatch(/Sam Patel/);
    expect(screen.getByText(/Chats about a request can't be blocked/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open the request' }).getAttribute('href')).toBe('#/requests?id=req-07');

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Write a message first.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Message to City of Windsor 311'), { target: { value: 'The cone was knocked over last night.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Messages' })).getAllByRole('listitem')).toHaveLength(4));
    expect(within(screen.getByRole('list', { name: 'Messages' })).getAllByRole('listitem')[3].textContent).toMatch(/^You.*The cone was knocked over/);
  });

  it('staff at the organization see the colleague who wrote, and the new message', async () => {
    render(<ChatsPage persona={jordan} />);
    await openChat(/Pothole on Wyandotte/);
    const msgs = within(await screen.findByRole('list', { name: 'Messages' })).getAllByRole('listitem');
    expect(msgs[0].textContent).toMatch(/^Sam Patel/);
    expect(msgs[1].textContent).toMatch(/^Maya R\./);
  });

  it('a request page links to its chat, which opens for the sender', async () => {
    window.location.hash = '#/requests?id=req-07';
    render(<RequestsPage persona={maya} />);
    const link = await screen.findByRole('link', { name: 'Message City of Windsor 311 about this request' });
    expect(link.getAttribute('href')).toBe('#/chats?request=req-07');
    cleanup();

    window.location.hash = '#/chats?request=req-issue-05';
    render(<ChatsPage persona={resident} />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Streetlight out near the pharmacy' })).toBeTruthy();
    expect(screen.getByText('No messages yet. Say hello.')).toBeTruthy();
  });

  it('an organization starts a chat with a member', async () => {
    render(<ChatsPage persona={priya} />);
    fireEvent.click(await screen.findByRole('button', { name: 'New message' }));
    const to = await screen.findByLabelText('To');
    expect(within(to).getAllByRole('option').map((o) => o.textContent)).toEqual(['Rosa Alvarez', 'Team 2 Group 10']);
    fireEvent.change(to, { target: { value: 'profile-owner-rosa' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Can you help at the market on Friday?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Rosa Alvarez' })).toBeTruthy();
    expect(screen.getByText('Can you help at the market on Friday?')).toBeTruthy();
  });

  it('the councillor has no chats and is told how to reach people', async () => {
    render(<ChatsPage persona={councillor} />);
    expect(await screen.findByText(/No chats yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'New message' }));
    expect(await screen.findByText(/You message people about their requests/)).toBeTruthy();
    expect(screen.queryByLabelText('Who can message me')).toBeNull();
  });

  it('"Who can message me" can be changed', async () => {
    render(<ChatsPage persona={maya} />);
    const setting = await screen.findByLabelText('Who can message me');
    fireEvent.change(setting, { target: { value: 'nobody' } });
    expect(await screen.findByText(/Saved\. Chats about your requests always work\./)).toBeTruthy();
  });

  it('new messages show in the bell, and opening the chat clears them', async () => {
    render(<NotificationBell persona={maya} />);
    fireEvent.click(await screen.findByRole('button', { name: /Notifications, .+ new/ }));
    expect(await screen.findByText('New message from City of Windsor 311')).toBeTruthy();
    expect(screen.getByText('New message from Riverside Public School')).toBeTruthy();
    cleanup();
    window.location.hash = '#/chats?c=chat-req-07';
    render(<ChatsPage persona={maya} />);
    await screen.findByRole('heading', { level: 2, name: 'Pothole on Wyandotte at Pierre Ave' });
    cleanup();
    render(<NotificationBell persona={maya} />);
    fireEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    await waitFor(() => expect(screen.queryByText('New message from City of Windsor 311')).toBeNull());
    expect(screen.getByText('New message from Riverside Public School')).toBeTruthy();
  });
});
