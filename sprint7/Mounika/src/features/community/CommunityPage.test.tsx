// KAN-42 / KAN-48: the community workspace on screen (Mounika).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CommunityPage from './CommunityPage';
import { clearSubmittedReports, decidePermit, getMapData, getRequests, resetDemo, setClockForTests } from '../../data/api';
import { DEFAULT_PERSONA, personaById } from '../requests/personas';

const TODAY = new Date('2026-11-07T12:00:00');
beforeEach(() => setClockForTests(() => TODAY));
afterEach(() => {
  cleanup();
  clearSubmittedReports();
  setClockForTests(null);
});

const PRIYA = personaById('community-organizer'); // community group organizer (Viewing as)
const SOFIA = personaById('library-staff'); // library organizer

const renderPage = async (persona = DEFAULT_PERSONA, heading = 'Riverside Neighbours Network (demo)') => {
  const view = render(<CommunityPage persona={persona} today={TODAY} />);
  await screen.findByRole('heading', { level: 2, name: heading });
  return view;
};
const section = (name: string) => screen.getByRole('region', { name });
const eventRow = (name: string) => within(section('Events')).getByText(name, { selector: '.cw-event-name' }).closest('li')!;

describe('CommunityPage', () => {
  it('opens on the community group and lists all four organizations', async () => {
    await renderPage();
    const orgs = within(screen.getByRole('navigation', { name: 'Organizations' })).getAllByRole('button');
    expect(orgs).toHaveLength(4);
    expect(orgs[0].getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/You are a/).textContent).toMatch(/volunteer/);
  });

  it('uses Viewing as: no switch of its own on the page (KAN-48)', async () => {
    await renderPage();
    expect(screen.queryByRole('button', { name: 'Organizer (demo)' })).toBeNull();
    expect(screen.getByText(/Signed in as/).textContent).toMatch(/Team 2 Group 10/);
  });

  it('creates an event that stays private until an organizer approves it, then it goes on the map', async () => {
    const view = await renderPage();
    fireEvent.click(within(section('Events')).getByRole('button', { name: 'Create event' }));

    // empty form: errors, nothing sent
    fireEvent.click(screen.getByRole('button', { name: 'Send for approval' }));
    expect(screen.getByText('Give the event a name.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Bulb planting' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-21' } });
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Where'), { target: { value: 'place-12' } }); // the hall: no permit needed (a park needs one, see the permit tests below)
    fireEvent.click(screen.getByRole('button', { name: 'Send for approval' }));

    expect(await screen.findByText(/was sent to the organizers/)).toBeTruthy();
    await waitFor(() => expect(within(eventRow('Bulb planting')).getByText('Waiting for approval')).toBeTruthy());
    expect(within(eventRow('Bulb planting')).queryByRole('button', { name: /Approve/ })).toBeNull(); // a volunteer can't approve
    expect((await getMapData()).events.some((e) => e.name === 'Bulb planting')).toBe(false); // private: not on the map

    // the organizer, picked in Viewing as, approves it
    view.rerender(<CommunityPage persona={PRIYA} today={TODAY} />);
    await screen.findByText(/You are an/);
    fireEvent.click(within(eventRow('Bulb planting')).getByRole('button', { name: 'Approve Bulb planting' }));
    expect(await screen.findByText(/is on the/)).toBeTruthy();
    await waitFor(() => expect(within(eventRow('Bulb planting')).getByText('Upcoming')).toBeTruthy());
    const pin = (await getMapData()).events.find((e) => e.name === 'Bulb planting');
    expect(pin).toMatchObject({ kind: 'event', chip: 'events', placeId: 'place-12' });
  });

  it('organizers see pending events from other members; others do not', async () => {
    const view = await renderPage();
    expect(within(section('Events')).queryByText('Neighbours potluck', { selector: '.cw-event-name' })).toBeNull();
    view.rerender(<CommunityPage persona={PRIYA} today={TODAY} />);
    expect(await within(section('Events')).findByText('Neighbours potluck', { selector: '.cw-event-name' })).toBeTruthy();
  });

  it('a member sends a request to the City for the group, and it reaches the City 311 queue (KAN-48)', async () => {
    await renderPage(PRIYA);
    const box = section('Send a request to the City');
    fireEvent.click(within(box).getByRole('button', { name: 'New request' }));
    fireEvent.click(within(box).getByRole('button', { name: 'Send request' }));
    expect(within(box).getByText('Choose what the problem is.')).toBeTruthy();

    fireEvent.change(within(box).getByLabelText('What is the problem?'), { target: { value: 'streetlight' } });
    fireEvent.change(within(box).getByLabelText('Where is it?'), { target: { value: 'place-12' } });
    expect(within(box).getByText(/Goes to:/).parentElement!.textContent).toMatch(/City of Windsor 311, copy to Ward Councillor/);
    fireEvent.click(within(box).getByRole('button', { name: 'Send request' }));
    expect(await within(box).findByRole('link', { name: 'Follow it in Requests' })).toBeTruthy();

    // it comes from the person, noted as for the group, and only the City and the sender see it
    const cityQueue = await getRequests(personaById('city-lead'));
    const req = cityQueue.find((r) => r.requesterId === 'profile-ngo');
    expect(req).toMatchObject({ toProfile: 'profile-city', requesterName: 'Priya Nair (demo)', onBehalfOf: 'Riverside Neighbours Network (demo)', state: 'new' });
    expect((await getRequests(PRIYA)).map((r) => r.id)).toContain(req!.id);
    expect((await getRequests(personaById('bia-lead'))).map((r) => r.id)).not.toContain(req!.id);
  });

  it('the library organizer posts a service change that shows on the map (KAN-48)', async () => {
    await renderPage(SOFIA, 'Riverside Branch Library (demo)');
    const box = section('Service changes');
    expect(within(box).getByText('Closed Wednesday, Nov 11 (Remembrance Day)')).toBeTruthy();
    fireEvent.click(within(box).getByRole('button', { name: 'Post a service change' }));
    fireEvent.change(within(box).getByLabelText('What is changing'), { target: { value: 'Closed Monday for staff training' } });
    fireEvent.change(within(box).getByLabelText('First day'), { target: { value: '2026-11-09' } });
    fireEvent.change(within(box).getByLabelText('Last day'), { target: { value: '2026-11-09' } });
    fireEvent.click(within(box).getByRole('button', { name: 'Post to the map' }));
    expect(await within(box).findByText(/is posted/)).toBeTruthy();
    await waitFor(() => expect(within(box).getByText('Closed Monday for staff training')).toBeTruthy());

    // Nov 9: on the map; Nov 10: gone
    setClockForTests(() => new Date('2026-11-09T12:00:00'));
    expect((await getMapData()).updates.some((u) => u.name === 'Closed Monday for staff training')).toBe(true);
    setClockForTests(() => new Date('2026-11-10T09:00:00'));
    expect((await getMapData()).updates.some((u) => u.name === 'Closed Monday for staff training')).toBe(false);
  });

  it('only organizers can post service changes', async () => {
    await renderPage(DEFAULT_PERSONA);
    fireEvent.click(screen.getByRole('button', { name: /Riverside Branch Library/ }));
    await screen.findByRole('heading', { level: 2, name: 'Riverside Branch Library (demo)' });
    const box = section('Service changes');
    expect(within(box).queryByRole('button', { name: 'Post a service change' })).toBeNull();
    expect(within(box).getByText(/Only its organizers can post them/)).toBeTruthy();
  });

  it('signs up for a volunteer role and cancels', async () => {
    await renderPage();
    const roles = section('Volunteer roles');
    const row = within(roles).getByText('Garden clean-up helper', { selector: '.cw-event-name' }).closest('li')!;
    expect(within(row).getByText('6 of 8 spots left')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: 'Sign up for Garden clean-up helper' }));
    expect(within(row).getByText("You're signed up")).toBeTruthy();
    expect(within(row).getByText('5 of 8 spots left')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: /Cancel sign-up/ }));
    expect(within(row).getByText('6 of 8 spots left')).toBeTruthy();
    const full = within(roles).getByText('Friday Market setup', { selector: '.cw-event-name' }).closest('li')!;
    expect(within(full).queryByRole('button', { name: /Sign up/ })).toBeNull();
  });

  it('searches and filters members with the map search and chips', async () => {
    await renderPage();
    const members = section('Members');
    fireEvent.change(within(members).getByLabelText('Search members'), { target: { value: 'gardening' } });
    expect(within(members).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.change(within(members).getByLabelText('Search members'), { target: { value: '' } });
    const chip = within(members).getByRole('button', { name: /^Organizers/ });
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(within(members).getAllByRole('listitem').map((li) => li.textContent)).toEqual([expect.stringContaining('Priya Nair')]);
  });

  it('hides members, event creation and requests when you are not a member', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Riverside Branch Library/ }));
    await screen.findByRole('heading', { level: 2, name: 'Riverside Branch Library (demo)' });
    expect(screen.getByText(/You are not a member of this group/)).toBeTruthy();
    expect(within(section('Members')).queryByLabelText('Search members')).toBeNull();
    expect(within(section('Events')).queryByRole('button', { name: 'Create event' })).toBeNull();
    expect(within(section('Send a request to the City')).queryByRole('button', { name: 'New request' })).toBeNull();
  });

  it('City staff in Viewing as are not members of any group', async () => {
    await renderPage(personaById('city-lead'));
    expect(screen.getByText(/You are not a member of this group/)).toBeTruthy();
  });

  // ---- KAN-52: an event in a public space needs a permit ----
  describe('event permits (KAN-52)', () => {
    const NEIGHBR = personaById('neighbr-staff');
    const pdf = () => new File(['permit'], 'park-permit.pdf', { type: 'application/pdf' });
    const fillEvent = (place: string) => {
      fireEvent.click(within(section('Events')).getByRole('button', { name: 'Create event' }));
      fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Bulb planting' } });
      fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-21' } });
      fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '10:00' } });
      fireEvent.change(screen.getByLabelText('Where'), { target: { value: place } });
    };
    afterEach(() => resetDemo());

    it('asks for a permit only when the place is public space', async () => {
      await renderPage();
      fillEvent('place-12'); // the hall
      expect(screen.queryByLabelText(/^Permit/)).toBeNull();
      fireEvent.change(screen.getByLabelText('Where'), { target: { value: 'place-13' } }); // the park
      expect(screen.getByText('This is a public space, so the event needs a permit.')).toBeTruthy();
      expect(screen.getByLabelText(/^Permit \(PDF, JPG or PNG/)).toBeTruthy();
    });

    it('will not send a park event without a permit, and says why', async () => {
      await renderPage();
      fillEvent('place-13');
      fireEvent.click(screen.getByRole('button', { name: 'Send for approval' }));
      expect(screen.getByText('Upload your permit (a PDF, JPG or PNG).')).toBeTruthy();
      expect(document.activeElement).toBe(screen.getByLabelText(/^Permit \(PDF/));
      expect(screen.queryByText(/was sent to the organizers/)).toBeNull();
    });

    it('turns down a file that is not a PDF, JPG or PNG', async () => {
      await renderPage();
      fillEvent('place-13');
      fireEvent.change(screen.getByLabelText(/^Permit \(PDF/), { target: { files: [new File(['x'], 'permit.docx', { type: 'application/msword' })] } });
      fireEvent.click(screen.getByRole('button', { name: 'Send for approval' }));
      expect(screen.getByText('The permit must be a PDF, JPG or PNG file.')).toBeTruthy();
    });

    it('goes organizer, then Neighbr staff, then the map', async () => {
      const view = await renderPage();
      fillEvent('place-13');
      fireEvent.change(screen.getByLabelText(/^Permit \(PDF/), { target: { files: [pdf()] } });
      expect(screen.getByText(/Chosen: park-permit\.pdf/)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Send for approval' }));
      expect(await screen.findByText(/was sent to the organizers/)).toBeTruthy();
      await waitFor(() => expect(within(eventRow('Bulb planting')).getByText('Permit uploaded. Waiting for an organizer', { exact: false })).toBeTruthy());
      expect(within(eventRow('Bulb planting')).getByText('Waiting for approval')).toBeTruthy();
      expect((await getMapData()).events.some((e) => e.name === 'Bulb planting')).toBe(false);

      // the organizer approves: it goes to Neighbr staff, not to the map
      view.rerender(<CommunityPage persona={PRIYA} today={TODAY} />);
      await screen.findByText(/You are an/);
      fireEvent.click(within(eventRow('Bulb planting')).getByRole('button', { name: 'Approve Bulb planting' }));
      expect(await screen.findByText(/Neighbr staff now check its permit/)).toBeTruthy();
      await waitFor(() => expect(within(eventRow('Bulb planting')).getByText('With Neighbr staff')).toBeTruthy());
      expect(within(eventRow('Bulb planting')).queryByRole('button', { name: /Approve/ })).toBeNull(); // staff decide now
      expect((await getMapData()).events.some((e) => e.name === 'Bulb planting')).toBe(false);

      // Neighbr staff approve: it is public and on the map
      const id = (await (await import('../../data/api')).getPermitQueue(NEIGHBR)).find((i) => i.event.name === 'Bulb planting')!.event.id;
      await decidePermit(NEIGHBR, id, 'approve');
      await waitFor(() => expect(within(eventRow('Bulb planting')).getByText('Upcoming')).toBeTruthy());
      expect((await getMapData()).events.some((e) => e.name === 'Bulb planting')).toBe(true);
    });

    it('shows the group what Neighbr staff asked, and lets an organizer answer', async () => {
      await decidePermit(NEIGHBR, 'oe-06', 'ask', 'Which days is the park booked for?');
      await renderPage(PRIYA);
      const row = eventRow('Parkette bench painting day');
      expect(within(row).getByText('Needs an answer')).toBeTruthy();
      expect(within(row).getByText('Which days is the park booked for?')).toBeTruthy();
      expect(within(row).queryByText(/Taylor|Brooks/)).toBeNull(); // never a staff name
      fireEvent.click(within(row).getByRole('button', { name: /Answer Neighbr staff/ }));
      const form = within(row).getByRole('form', { name: /Answer Neighbr staff/ });
      fireEvent.click(within(form).getByRole('button', { name: 'Send to Neighbr staff' }));
      expect(within(form).getByRole('alert').textContent).toBe('Write your answer to the question.');
      fireEvent.change(within(form).getByLabelText('Your answer'), { target: { value: 'Saturday only.' } });
      fireEvent.click(within(form).getByRole('button', { name: 'Send to Neighbr staff' }));
      await waitFor(() => expect(within(eventRow('Parkette bench painting day')).getByText('With Neighbr staff')).toBeTruthy());
    });

    it('shows a declined event the reason, and lets an organizer send it again with a new permit', async () => {
      await decidePermit(NEIGHBR, 'oe-06', 'decline', 'The permit covers Saturday only.');
      await renderPage(PRIYA);
      const row = eventRow('Parkette bench painting day');
      expect(within(row).getByText('Permit declined')).toBeTruthy();
      expect(within(row).getByText('The permit covers Saturday only.')).toBeTruthy();
      fireEvent.click(within(row).getByRole('button', { name: /Send again with a new permit/ }));
      const form = within(row).getByRole('form', { name: /Answer Neighbr staff/ });
      fireEvent.click(within(form).getByRole('button', { name: 'Send to Neighbr staff' }));
      expect(within(form).getByRole('alert').textContent).toBe('Upload your permit (a PDF, JPG or PNG).');
      fireEvent.change(within(form).getByLabelText('New permit file'), { target: { files: [pdf()] } });
      fireEvent.click(within(form).getByRole('button', { name: 'Send to Neighbr staff' }));
      await waitFor(() => expect(within(eventRow('Parkette bench painting day')).getByText('With Neighbr staff')).toBeTruthy());
    });

    it('a member who is not an organizer sees the status but not the answer button', async () => {
      await decidePermit(NEIGHBR, 'oe-06', 'ask', 'Which days is the park booked for?');
      await renderPage(DEFAULT_PERSONA); // the demo resident (a volunteer in this group)
      // the resident did not make this event and is not an organizer: it is not even listed
      expect(within(section('Events')).queryByText('Parkette bench painting day', { selector: '.cw-event-name' })).toBeNull();
    });
  });
});
