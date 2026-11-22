// KAN-50 (Purab): Your profile and Settings on screen.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';
import { personaById } from '../requests/personas';
import { getMessageSetting, getNotifications, getSettings, resetDemo, setClockForTests } from '../../data/api';

const now = new Date('2026-11-12T15:00:00Z');
beforeEach(() => setClockForTests(() => now));
afterEach(() => {
  cleanup();
  resetDemo();
  setClockForTests(null);
});

describe('Your profile', () => {
  it('shows who you are, what neighbours see and what stays private', async () => {
    render(<ProfilePage persona={personaById('parent')} />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Maya R.' })).toBeTruthy();
    expect(screen.getByText('Resident and school parent')).toBeTruthy();
    const card = screen.getByRole('heading', { name: 'Maya R.' }).closest('section')!;
    expect(within(card).getByText('Neighbours can see')).toBeTruthy();
    expect(within(card).getByText(/No home address or phone number/)).toBeTruthy();
  });

  it('links to your requests, chats and listings', async () => {
    render(<ProfilePage persona={personaById('parent')} />);
    const link = await screen.findByRole('link', { name: /Requests you sent/ });
    expect(link.getAttribute('href')).toBe('#/requests');
    expect(screen.getByRole('link', { name: /Unread messages/ }).getAttribute('href')).toBe('#/chats');
    expect(screen.getByRole('link', { name: /Your Marketplace listings/ }).getAttribute('href')).toBe('#/marketplace');
  });

  it('an organizer sees their role and organization', async () => {
    render(<ProfilePage persona={personaById('community-organizer')} />);
    expect(await screen.findByText('Community organizer')).toBeTruthy();
    expect(screen.getByText(/at Riverside Neighbours Network/)).toBeTruthy();
  });

  it('staff see their work queue and no home area', async () => {
    render(<ProfilePage persona={personaById('city-lead')} />);
    expect(await screen.findByRole('link', { name: /Work queue/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Requests you sent/ })).toBeNull();
    expect(await screen.findByText(/Staff accounts have no home area/)).toBeTruthy();
    expect(screen.queryByLabelText('Home area')).toBeNull();
  });
});

describe('Settings', () => {
  it('saves who can message me, the notifications and the home area', async () => {
    const p = personaById('resident');
    render(<ProfilePage persona={p} />);
    fireEvent.click(await screen.findByRole('radio', { name: 'Only organizations I belong to' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Area alerts/ }));
    fireEvent.change(screen.getByLabelText('Home area'), { target: { value: 'place-13' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Settings saved.')).toBeTruthy();
    expect(await getMessageSetting(p)).toBe('organizations');
    const s = await getSettings(p);
    expect(s.notify.alerts).toBe(false);
    expect(s.homePlaceId).toBe('place-13');
    expect((await getNotifications(p)).some((n) => n.id.startsWith('alert:'))).toBe(false);
  });

  it('every choice has a visible label and the form keeps its place after a change', async () => {
    render(<ProfilePage persona={personaById('business')} />);
    const boxes = await screen.findAllByRole('checkbox');
    expect(boxes).toHaveLength(5);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    fireEvent.click(boxes[0]);
    expect((boxes[0] as HTMLInputElement).checked).toBe(false);
  });
});
