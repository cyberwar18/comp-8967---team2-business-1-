// KAN-43: the school workspace on screen (Devu).
// Sprint 6: the view follows "Viewing as" (Public, Parent, School staff), and school staff can send a request to the City.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CommunityPage from '../community/CommunityPage';
import { personaById } from '../requests/personas';
import type { Persona } from '../requests/requests';
import { actOnRequest, clearSubmittedReports, getMapData, getNotifications, getRequests, resetDemo, setClockForTests } from '../../data/api';

afterEach(() => {
  cleanup();
  clearSubmittedReports();
  resetDemo();
  setClockForTests(null);
});

const TODAY = new Date('2026-11-01T12:00:00');
// The adapter's clock is the same fixed day, so "notices from the last two weeks" doesn't depend on today's date.
beforeEach(() => setClockForTests(() => TODAY));
const SCHOOL = 'Getting to school safely, and school news';

const openSchool = async (persona: Persona = personaById('resident')) => {
  const ui = render(<CommunityPage today={TODAY} persona={persona} />);
  // a school person opens straight on the school; anyone else picks it from the list
  if (persona.schoolRole !== 'parent' && persona.schoolRole !== 'staff') {
    await screen.findByRole('heading', { level: 2, name: 'Riverside Neighbours Network (demo)' });
    fireEvent.click(screen.getByRole('button', { name: /Riverside Public School/ }));
  }
  await screen.findByRole('heading', { level: 2, name: 'Riverside Public School (demo)' });
  await screen.findByRole('heading', { name: SCHOOL });
  return ui;
};
const viewAs = (ui: ReturnType<typeof render>, persona: Persona) =>
  ui.rerender(<CommunityPage today={TODAY} persona={persona} />);
const notices = () => screen.getByRole('region', { name: 'Notices and events' });
const titles = () => within(notices()).queryAllByRole('listitem').map((li) => li.querySelector('.cw-event-name')?.firstChild?.textContent?.trim());

describe('School workspace', () => {
  it('only appears for the school, not the other organizations', async () => {
    render(<CommunityPage today={TODAY} persona={personaById('resident')} />);
    await screen.findByRole('heading', { level: 2, name: 'Riverside Neighbours Network (demo)' });
    expect(screen.queryByRole('heading', { name: SCHOOL })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Riverside Branch Library/ }));
    await screen.findByRole('heading', { level: 2, name: 'Riverside Branch Library (demo)' });
    expect(screen.queryByRole('heading', { name: SCHOOL })).toBeNull();
  });

  it('shows the roadwork alert and tells people to use the clear route', async () => {
    await openSchool();
    const alert = screen.getByRole('region', { name: 'Roadwork alert' });
    expect(within(alert).getByText('Roadwork alert')).toBeTruthy();
    expect(alert.textContent).toMatch(/Roadwork near the school: Sidewalk work on Wyandotte St E, about \d+ m away\./);
    expect(alert.textContent).toMatch(/Route A passes within \d+ m of Sidewalk work on Wyandotte St E\./);
    expect(within(alert).getByText('Use Route B instead.')).toBeTruthy();
  });

  it('lists the safe routes with their status in words and a link to the map', async () => {
    await openSchool();
    const routes = screen.getByRole('region', { name: 'Safe walking routes' });
    const items = within(routes).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toMatch(/Route A: Thompson Parkette to school/);
    expect(items[0].textContent).toMatch(/Crosswalk A1/);
    expect(within(items[0]).getByText('Roadwork near')).toBeTruthy();
    expect(within(items[1]).getByText('Clear')).toBeTruthy();
    const link = within(routes).getByRole('link', { name: 'Show the routes on the map' });
    expect(link.getAttribute('href')).toMatch(/^\?c=-82\.9697,42\.3295&z=17&l=school,roadwork&pin=school-01#\/map$/);
  });

  it('shows the public only public notices, and says only staff can post', async () => {
    await openSchool();
    expect(titles()).toEqual(['Fall concert', 'Winter clothing drive']);
    expect(within(notices()).getByText('Only school staff can post.')).toBeTruthy();
    expect(within(notices()).queryByRole('button', { name: 'Post a notice' })).toBeNull();
    expect(within(notices()).getByText(/Some notices are only for parents/)).toBeTruthy();
  });

  it("shows a Grade 2 parent their own notices and not Grade 5's, and no posting", async () => {
    await openSchool(personaById('parent'));
    const seen = titles();
    expect(seen).toEqual(expect.arrayContaining(['Fall concert', 'Parent-teacher interviews', 'Early dismissal on Nov 13', 'Library visit forms due Nov 6']));
    expect(seen).not.toContain('Museum field trip on Nov 18');
    expect(within(notices()).queryByRole('button', { name: 'Post a notice' })).toBeNull();
    expect(within(notices()).getByText(/Showing public notices, notices for all parents and notices for Grade 2\./)).toBeTruthy();
  });

  it('lets only staff post, and the post shows to the audience chosen', async () => {
    const ui = await openSchool(personaById('school-staff'));
    expect(titles()).toHaveLength(6);
    fireEvent.click(within(notices()).getByRole('button', { name: 'Post a notice' }));

    // empty form: errors, nothing posted
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    expect(screen.getByText('Give the notice a title.')).toBeTruthy();
    expect(screen.getByText('Write the message.')).toBeTruthy();
    expect(titles()).toHaveLength(6);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Picture day moved' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Picture day is now Nov 10.' } });
    fireEvent.change(screen.getByLabelText('Who can see it'), { target: { value: 'parents' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    expect(screen.getByText(/“Picture day moved” is posted\./).parentElement!.textContent).toMatch(/visible to: All parents/);
    expect(titles()).toContain('Picture day moved');

    // a parent sees it; the public does not (switching "Viewing as" keeps the page, so the post is still there)
    viewAs(ui, personaById('parent'));
    await waitFor(() => expect(titles()).toContain('Picture day moved'));
    // the parent also gets a notification (Sprint 6)
    expect((await getNotifications(personaById('parent'))).map((n) => n.title)).toContain('Picture day moved');
    viewAs(ui, personaById('resident'));
    await screen.findByRole('heading', { name: SCHOOL });
    await waitFor(() => expect(titles().length).toBeGreaterThan(0));
    expect(titles()).not.toContain('Picture day moved');
  });

  it('asks for a date and time when staff post an event', async () => {
    await openSchool(personaById('school-staff'));
    fireEvent.click(within(notices()).getByRole('button', { name: 'Post a notice' }));
    fireEvent.change(screen.getByLabelText('What are you posting?'), { target: { value: 'event' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Bake sale' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Cookies for all.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    expect(screen.getByText('Pick a date.')).toBeTruthy();
    expect(screen.getByText('Pick a start time.')).toBeTruthy();
  });

  it('closes the post form when "Viewing as" changes to someone who cannot post', async () => {
    const ui = await openSchool(personaById('school-staff'));
    fireEvent.click(within(notices()).getByRole('button', { name: 'Post a notice' }));
    expect(screen.getByRole('form', { name: 'Post a notice' })).toBeTruthy();
    viewAs(ui, personaById('parent'));
    expect(screen.queryByRole('form', { name: 'Post a notice' })).toBeNull();
  });

  it('explains what is public and what is never shown', async () => {
    await openSchool();
    const box = screen.getByText("What's public and what's private", { selector: 'h4' }).parentElement!;
    expect(box.textContent).toMatch(/Never shown:\s*student names, student photos, parent contact details/);
    expect(box.textContent).toMatch(/Only staff can post/);
  });
});

describe('School follows "Viewing as" (Sprint 6)', () => {
  it('has no switch of its own: it says who you are viewing as and where to change it', async () => {
    await openSchool(personaById('parent'));
    expect(screen.queryByRole('group', { name: 'View this section as' })).toBeNull();
    const note = screen.getByRole('status', { name: '' });
    expect(note.textContent).toMatch(/Viewing as Maya R., Resident and school parent/);
    expect(note.textContent).toMatch(/change Viewing as in the top bar/);
  });

  it('opens straight on the school when a school person is chosen', async () => {
    render(<CommunityPage today={TODAY} persona={personaById('school-staff')} />);
    await screen.findByRole('heading', { level: 2, name: 'Riverside Public School (demo)' });
    expect(await screen.findByRole('heading', { name: SCHOOL })).toBeTruthy();
  });

  it('shows the City-request card to school staff only', async () => {
    const ui = await openSchool(personaById('school-staff'));
    expect(screen.getByRole('region', { name: 'Requests to the City' })).toBeTruthy();
    viewAs(ui, personaById('parent'));
    expect(screen.queryByRole('region', { name: 'Requests to the City' })).toBeNull();
    viewAs(ui, personaById('resident'));
    expect(screen.queryByRole('region', { name: 'Requests to the City' })).toBeNull();
  });
});

describe('School sends a request to the City (Sprint 6)', () => {
  const staff = () => personaById('school-staff');

  it('checks the form, then sends it to City 311 with a copy to the councillor, private until published', async () => {
    await openSchool(staff());
    const card = () => screen.getByRole('region', { name: 'Requests to the City' });
    fireEvent.click(within(card()).getByRole('button', { name: 'Send a request to the City' }));

    // empty form: errors, nothing sent
    fireEvent.click(screen.getByRole('button', { name: 'Send to the City' }));
    expect(screen.getByText('Choose what the problem is.')).toBeTruthy();
    expect(screen.getByText('Choose where it is.')).toBeTruthy();
    expect((await getRequests(staff())).length).toBe(0);

    fireEvent.change(screen.getByLabelText('What is the problem?'), { target: { value: 'crosswalk' } });
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'cross-a1' } });
    fireEvent.change(screen.getByLabelText('Details (optional)'), { target: { value: 'The lines are almost gone.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send to the City' }));

    await waitFor(() => expect(within(card()).getByText(/was sent to City of Windsor 311/)).toBeTruthy());
    expect(within(card()).getByText(/“Crosswalk problem near Crosswalk A1” was sent/)).toBeTruthy();

    const mine = await getRequests(staff());
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ requesterId: 'profile-school', requesterKind: 'organization', toProfile: 'profile-city', ccProfile: 'profile-councillor', state: 'new', public: false });

    // it shows in the card with where it is now, and the public map does not have it yet
    await waitFor(() => expect(within(card()).getByRole('list', { name: 'Requests your school sent' })).toBeTruthy());
    expect(within(card()).getByText('Reported')).toBeTruthy();
    const pin = (await getMapData()).updates.find((u) => u.id === mine[0].issueId)!;
    expect(pin.visibility).toBe('private until approved');
    expect(pin.reportedBy).toBe('profile-school');
  });

  it('shows the City handling it, and only the outcome becomes public', async () => {
    await openSchool(staff());
    fireEvent.click(screen.getByRole('button', { name: 'Send a request to the City' }));
    fireEvent.change(screen.getByLabelText('What is the problem?'), { target: { value: 'sidewalk' } });
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'cross-b1' } });
    fireEvent.click(screen.getByRole('radio', { name: /Post to the map/ })); // the sender chooses (Nigel, Nov 2)
    fireEvent.click(screen.getByRole('button', { name: 'Send to the City' }));
    await screen.findByText(/was sent to City of Windsor 311/);

    const lead = personaById('city-lead');
    const crew = personaById('city-crew');
    const id = (await getRequests(staff()))[0].id;
    await actOnRequest(id, lead, 'acknowledge');
    await actOnRequest(id, lead, 'assign', { assigneeId: 'staff-311-roads' });
    await waitFor(() => expect(screen.getByText('Being handled')).toBeTruthy()); // the school sees where it is
    await actOnRequest(id, crew, 'resolve', { text: 'Sidewalk patched near the crossing.' });
    await actOnRequest(id, lead, 'publish', { text: 'Sidewalk patched near the crossing.' });

    const pin = (await getMapData()).updates.find((u) => u.requestId === id)!;
    expect(pin).toMatchObject({ status: 'resolved', visibility: 'public', outcome: 'Sidewalk patched near the crossing.', handledBy: 'City of Windsor 311' });
    // the sender's name and original message never reach the public pin
    expect(JSON.stringify(pin)).not.toMatch(/Laurent/);
  });
});
