// KAN-52 (Mounika): event permits and the reported content queue, through the data layer (api.ts).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { personaById } from '../requests/personas';
import { PermissionError } from '../requests/requests';
import { buildEvent, type EventDraft } from '../community/communityData';
import { newPermit } from './permits';
import { REMOVED_TEXT } from '../chats/chats';
import {
  answerPermit,
  approveOrgEvent,
  clearSubmittedReports,
  decidePermit,
  getChat,
  getListingPins,
  getListings,
  getMapData,
  getNotifications,
  getOpenReportCount,
  getOrgEvents,
  getOrgMembers,
  getPermitQueue,
  getPosts,
  getReportQueue,
  postOpenNotice,
  reportListing,
  reportMessage,
  reportPost,
  resetDemo,
  resolveReport,
  setClockForTests,
  startChat,
  submitOrgEvent,
} from '../../data/api';

const staff = personaById('neighbr-staff');
const resident = personaById('resident');
const maya = personaById('parent');
const rosa = personaById('business');
const priya = personaById('community-organizer');
const city = personaById('city-lead');

const NOW = new Date('2026-11-15T12:00:00');
const draft = (patch: Partial<EventDraft> = {}): EventDraft => ({ name: 'Bulb planting', date: '2026-11-21', start: '10:00', end: '12:00', placeId: 'place-13', description: '', ...patch });
const file = { name: 'permit.pdf', size: 90_000, type: 'application/pdf' };

const member = async (id: string) => (await getOrgMembers()).find((m) => m.id === id)!;
const pinNames = async () => (await getMapData()).events.map((e) => e.name);
const notes = async (p: typeof resident) => (await getNotifications(p)).map((n) => `${n.title}: ${n.text}`);

beforeEach(() => {
  resetDemo();
  setClockForTests(() => NOW);
});
afterEach(() => {
  resetDemo();
  clearSubmittedReports();
  setClockForTests(null);
});

describe('only Neighbr staff', () => {
  it('open the queues and decide', async () => {
    for (const p of [resident, city, priya, rosa, personaById('councillor')]) {
      await expect(getPermitQueue(p)).rejects.toBeInstanceOf(PermissionError);
      await expect(getReportQueue(p)).rejects.toBeInstanceOf(PermissionError);
      await expect(decidePermit(p, 'oe-06', 'approve')).rejects.toBeInstanceOf(PermissionError);
      await expect(resolveReport(p, 'listing', 'x', 'hidden')).rejects.toBeInstanceOf(PermissionError);
      expect(await getOpenReportCount(p)).toBe(0);
    }
    expect(await getPermitQueue(staff)).toBeTruthy();
  });
});

describe('the sample permit', () => {
  it('waits with Neighbr staff, and its event is private and not on the map', async () => {
    const [item] = await getPermitQueue(staff);
    expect(item).toMatchObject({ orgName: 'Riverside Neighbours Network', placeName: 'Thompson Parkette' });
    expect(item.event).toMatchObject({ id: 'oe-06', visibility: 'private until approved' });
    expect(item.permit.status).toBe('with-staff');
    expect(await pinNames()).not.toContain('Parkette bench painting day');
  });
});

describe('an event in a park, from the form to the map', () => {
  const create = async () => {
    const creator = await member('mem-01'); // the demo resident
    const ev = buildEvent(draft(), 'org-rnn', creator, 'oe-test', newPermit(file, NOW.toISOString()));
    await submitOrgEvent(ev);
    return ev;
  };

  it('needs a permit: without one it is not accepted', async () => {
    const creator = await member('mem-01');
    await expect(submitOrgEvent(buildEvent(draft(), 'org-rnn', creator, 'oe-test'))).rejects.toThrow(/needs a permit/);
  });
  it('turns down a permit file that is not allowed', async () => {
    const creator = await member('mem-01');
    const ev = buildEvent(draft(), 'org-rnn', creator, 'oe-test', { ...newPermit(file, NOW.toISOString()), file: { name: 'permit.exe', size: 10, type: '' } });
    await expect(submitOrgEvent(ev)).rejects.toThrow(/PDF, JPG or PNG/);
  });
  it('an event in the hall needs no permit', async () => {
    const creator = await member('mem-01');
    await submitOrgEvent(buildEvent(draft({ placeId: 'place-12' }), 'org-rnn', creator, 'oe-hall'));
    expect((await getOrgEvents()).find((e) => e.id === 'oe-hall')?.permit).toBeUndefined();
  });

  it('goes organizer, then Neighbr staff, then the map; every step notifies', async () => {
    await create();
    expect(await pinNames()).not.toContain('Bulb planting');
    expect((await getPermitQueue(staff)).map((i) => i.event.id)).not.toContain('oe-test'); // not with staff yet

    // an organizer approves: it goes to staff, not to the map
    const sent = await approveOrgEvent('oe-test', await member('mem-02'));
    expect(sent.permit?.status).toBe('with-staff');
    expect(await pinNames()).not.toContain('Bulb planting');
    expect(await notes(resident)).toContain('Bulb planting: An organizer approved your event. Its permit is now with Neighbr staff.');
    await expect(approveOrgEvent('oe-test', await member('mem-02'))).rejects.toThrow(/Only an organizer/); // staff decide now
    expect((await getPermitQueue(staff)).map((i) => i.event.id)).toContain('oe-test');

    // staff approve: it is public and on the map until it ends
    await decidePermit(staff, 'oe-test', 'approve');
    expect(await pinNames()).toContain('Bulb planting');
    expect((await getOrgEvents()).find((e) => e.id === 'oe-test')).toMatchObject({ visibility: 'public', status: 'upcoming' });
    for (const p of [resident, priya]) expect((await notes(p)).some((n) => /^Bulb planting: Neighbr staff approved the permit/.test(n))).toBe(true);
    setClockForTests(() => new Date('2026-11-22T09:00:00'));
    expect(await pinNames()).not.toContain('Bulb planting'); // over: it leaves the map
  });

  it('an organizer who made the event is not told about their own approval', async () => {
    const creator = await member('mem-02');
    await submitOrgEvent(buildEvent(draft(), 'org-rnn', creator, 'oe-own', newPermit(file, NOW.toISOString())));
    await approveOrgEvent('oe-own', creator);
    expect((await notes(priya)).some((n) => /An organizer approved your event/.test(n))).toBe(false);
  });

  it('a member who is not an organizer cannot send it on', async () => {
    await create();
    await expect(approveOrgEvent('oe-test', await member('mem-01'))).rejects.toThrow(/Only an organizer/);
    await expect(approveOrgEvent('oe-test', await member('mem-07'))).rejects.toThrow(/Only an organizer/); // another group
  });
});

describe('Neighbr staff decide on the sample permit', () => {
  it('approve: public, on the map, and the group is told', async () => {
    await decidePermit(staff, 'oe-06', 'approve');
    expect(await pinNames()).toContain('Parkette bench painting day');
    expect(await notes(priya)).toContain('Parkette bench painting day: Neighbr staff approved the permit. The event is public and on the map until it ends.');
    expect((await getPermitQueue(staff))[0].permit.status).toBe('approved');
  });
  it('decline needs a reason; with one, the event stays off the map and the group reads the reason', async () => {
    await expect(decidePermit(staff, 'oe-06', 'decline', '')).rejects.toThrow('Give a reason, so the group knows what to fix.');
    expect((await getPermitQueue(staff))[0].permit.status).toBe('with-staff'); // nothing changed
    await decidePermit(staff, 'oe-06', 'decline', 'The permit covers Saturday only.');
    expect(await pinNames()).not.toContain('Parkette bench painting day');
    const text = (await notes(priya)).join(' | ');
    expect(text).toContain('Neighbr staff declined the permit: The permit covers Saturday only.');
    expect(text).not.toMatch(/Taylor|Brooks/); // the group never sees a staff name
  });
  it('ask: the organizers answer, and it comes back to staff', async () => {
    await decidePermit(staff, 'oe-06', 'ask', 'Which days is the park booked for?');
    expect((await getPermitQueue(staff))[0].permit.status).toBe('more-info');
    await expect(decidePermit(staff, 'oe-06', 'approve')).rejects.toThrow(/not waiting/);
    expect(await notes(priya)).toContain('Parkette bench painting day: Neighbr staff need more information about the permit: Which days is the park booked for?');

    await expect(answerPermit(await member('mem-05'), 'oe-06', { note: 'Saturday only.' })).rejects.toBeInstanceOf(PermissionError); // a volunteer
    await expect(answerPermit(await member('mem-07'), 'oe-06', { note: 'Saturday only.' })).rejects.toBeInstanceOf(PermissionError); // another group
    await expect(answerPermit(await member('mem-02'), 'oe-06', { note: '' })).rejects.toThrow('Write your answer to the question.');
    await answerPermit(await member('mem-02'), 'oe-06', { note: 'Saturday only.' });
    const [item] = await getPermitQueue(staff);
    expect(item.permit.status).toBe('with-staff');
    expect(item.permit.steps.map((s) => s.action)).toEqual(['uploaded', 'sent-to-staff', 'asked', 'answered']);
  });
  it('declined: the group sends it again with a new permit, then staff approve', async () => {
    await decidePermit(staff, 'oe-06', 'decline', 'The permit has expired.');
    await expect(answerPermit(await member('mem-02'), 'oe-06', { note: 'Sorry' })).rejects.toThrow(/Upload your permit/);
    await answerPermit(await member('mem-02'), 'oe-06', { file: { name: 'new-permit.pdf', size: 1000, type: 'application/pdf' } });
    expect((await getPermitQueue(staff))[0].permit.file.name).toBe('new-permit.pdf');
    await decidePermit(staff, 'oe-06', 'approve');
    expect(await pinNames()).toContain('Parkette bench painting day');
  });
  it('a decision cannot be made twice', async () => {
    await decidePermit(staff, 'oe-06', 'approve');
    await expect(decidePermit(staff, 'oe-06', 'decline', 'Changed my mind about it.')).rejects.toThrow(/not waiting/);
    await expect(decidePermit(staff, 'oe-999', 'approve')).rejects.toThrow(/not found/);
  });
});

describe('reported content', () => {
  const reportEverything = async () => {
    await reportListing(resident, 'mk-03', 'Scam or fake', 'Asked me to pay by gift card.');
    const chatId = await startChat(maya, 'profile-resident', 'Buy my snow blower, pay me in gift cards now!', 'Team 2 Group 10');
    const msgId = (await getChat(resident, chatId))!.messages[0].id;
    await reportMessage(resident, chatId, msgId, 'Spam or scam', '');
    const post = (await postOpenNotice(rosa, 'place-01', 'We are open as usual. Use the side door.')) as { id: string };
    await reportPost(resident, post.id, 'Misleading or false', 'It was closed.');
    return { chatId, msgId, postId: post.id };
  };

  it('puts chats, listings and posts in one queue that shows who reported (staff only)', async () => {
    await reportEverything();
    const q = await getReportQueue(staff);
    expect(q.map((i) => i.kind).sort()).toEqual(['chat', 'listing', 'post']);
    expect(q.every((i) => i.status === 'open')).toBe(true);
    expect(q.find((i) => i.kind === 'listing')).toMatchObject({ title: 'Snow blower, barely used', aboutName: 'Marcus T.', reportedByName: 'Team 2 Group 10', note: 'Asked me to pay by gift card.' });
    expect(q.find((i) => i.kind === 'chat')).toMatchObject({ aboutName: 'Maya R.', reportedByName: 'Team 2 Group 10' });
    expect(q.find((i) => i.kind === 'post')).toMatchObject({ aboutName: "Rosa's Bakery", reason: 'Misleading or false' });
    expect(await getOpenReportCount(staff)).toBe(3);
  });

  it('Hide a listing: off the Marketplace and the map; the seller and the reporter are told, and the reporter stays unnamed', async () => {
    await reportListing(resident, 'mk-03', 'Scam or fake', '');
    const [r] = await getReportQueue(staff);
    await resolveReport(staff, 'listing', r.id, 'hidden');
    expect((await getListings(resident)).some((l) => l.id === 'mk-03')).toBe(false);
    expect((await getListingPins()).some((l) => l.id === 'mk-03')).toBe(false);
    expect((await getReportQueue(staff))[0].status).toBe('hidden');
    expect((await notes(resident)).join('|')).toMatch(/Thank you\. Neighbr staff reviewed the listing you reported and removed it/);
  });
  it('the seller of a hidden listing hears about it, without the reporter', async () => {
    // mk-01 is Maya's: the resident reports it
    await reportListing(resident, 'mk-01', 'Scam or fake', 'Suspicious');
    const [r] = await getReportQueue(staff);
    await resolveReport(staff, 'listing', r.id, 'hidden');
    const mayaNotes = (await notes(maya)).join('|');
    expect(mayaNotes).toMatch(/Neighbr staff removed your listing because it broke the community rules/);
    expect(mayaNotes).not.toMatch(/Team 2 Group 10|Suspicious/);
  });
  it('Hide a message: it is replaced for both people in the chat', async () => {
    const { chatId, msgId } = await reportEverything();
    const r = (await getReportQueue(staff)).find((i) => i.kind === 'chat')!;
    await resolveReport(staff, 'chat', r.id, 'hidden');
    for (const p of [resident, maya]) {
      const m = (await getChat(p, chatId))!.messages.find((x) => x.id === msgId)!;
      expect(m.text).toBe(REMOVED_TEXT);
      expect(m.removed).toBe(true);
    }
    expect((await notes(maya)).join('|')).toMatch(/Neighbr staff removed this message/);
  });
  it('Hide a post: it leaves the map and the poster is told', async () => {
    const { postId } = await reportEverything();
    expect((await getPosts()).some((p) => p.id === postId)).toBe(true);
    const r = (await getReportQueue(staff)).find((i) => i.kind === 'post')!;
    await resolveReport(staff, 'post', r.id, 'hidden');
    expect((await getPosts()).some((p) => p.id === postId)).toBe(false);
    expect((await notes(rosa)).join('|')).toMatch(/Neighbr staff removed your post/);
  });
  it('Keep: nothing is taken down and the reporter is told', async () => {
    const { chatId, msgId, postId } = await reportEverything();
    for (const r of await getReportQueue(staff)) await resolveReport(staff, r.kind, r.id, 'kept');
    expect((await getListings(resident)).some((l) => l.id === 'mk-03')).toBe(true);
    expect((await getChat(maya, chatId))!.messages.find((m) => m.id === msgId)!.removed).toBeUndefined();
    expect((await getPosts()).some((p) => p.id === postId)).toBe(true);
    const text = (await notes(resident)).join('|');
    expect(text).toMatch(/reviewed the message you reported and decided to keep it up/);
    expect(text).toMatch(/reviewed the listing you reported and decided to keep it up/);
    expect(text).toMatch(/reviewed the post you reported and decided to keep it up/);
    expect((await notes(maya)).join('|')).not.toMatch(/removed/);
    expect(await getOpenReportCount(staff)).toBe(0);
  });
  it('a report is decided once', async () => {
    await reportListing(resident, 'mk-03', 'Scam or fake', '');
    const [r] = await getReportQueue(staff);
    await resolveReport(staff, 'listing', r.id, 'kept');
    await expect(resolveReport(staff, 'listing', r.id, 'hidden')).rejects.toThrow(/already been decided/);
    await expect(resolveReport(staff, 'listing', 'nope', 'hidden')).rejects.toThrow(/not found/);
  });
  it('two reports about the same listing get one decision, and both reporters hear it', async () => {
    await reportListing(resident, 'mk-03', 'Scam or fake', '');
    await reportListing(rosa, 'mk-03', 'Scam or fake', '');
    const q = await getReportQueue(staff);
    expect(q).toHaveLength(2);
    await resolveReport(staff, 'listing', q[0].id, 'hidden');
    expect((await getReportQueue(staff)).every((i) => i.status === 'hidden')).toBe(true);
    expect((await notes(resident)).join('|')).toMatch(/removed it/);
    expect((await notes(rosa)).join('|')).toMatch(/removed it/);
  });
});

describe('reporting a business post', () => {
  it('not your own, not twice, not by staff, and a reason is needed', async () => {
    const post = (await postOpenNotice(rosa, 'place-01', 'We are open as usual. Use the side door.')) as { id: string };
    await expect(reportPost(rosa, post.id, 'Offensive')).rejects.toThrow('You cannot report your own post.');
    await expect(reportPost(staff, post.id, 'Offensive')).rejects.toBeInstanceOf(PermissionError);
    await expect(reportPost(resident, post.id, 'Because' as never)).rejects.toThrow('Choose a reason.');
    await expect(reportPost(resident, 'post-nope', 'Offensive')).rejects.toThrow('Post not found.');
    await reportPost(resident, post.id, 'Offensive');
    await expect(reportPost(resident, post.id, 'Offensive')).rejects.toThrow('You already reported this post.');
  });
});

describe('Reset demo', () => {
  it('forgets decisions, reports and hidden posts', async () => {
    await decidePermit(staff, 'oe-06', 'approve');
    await reportListing(resident, 'mk-03', 'Scam or fake', '');
    resetDemo();
    expect((await getPermitQueue(staff))[0].permit.status).toBe('with-staff');
    expect(await getReportQueue(staff)).toEqual([]);
    expect((await notes(priya)).filter((n) => /Neighbr staff/.test(n))).toEqual([]);
  });
});
