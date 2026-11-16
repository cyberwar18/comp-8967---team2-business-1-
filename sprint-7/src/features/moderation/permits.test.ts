// KAN-52 (Mounika): the event permit rules. Nigel (Nov 2): events in a public space need a permit,
// approved by Neighbr staff, before they go on the map.
import { describe, expect, it } from 'vitest';
import {
  PERMIT_MAX_BYTES,
  STAGE_LABEL,
  answer,
  canAnswer,
  decide,
  decisionNotice,
  fileSizeLabel,
  isNeighbrStaff,
  isPublicSpace,
  latestMessage,
  needsPermit,
  newPermit,
  permitBlocksMap,
  sendToStaff,
  validateDecision,
  validatePermitFile,
  type Permit,
  type PermitFile,
} from './permits';
import { personaById } from '../requests/personas';

const pdf: PermitFile = { name: 'park-permit.pdf', size: 120_000, type: 'application/pdf' };
const png: PermitFile = { name: 'scan.png', size: 50_000, type: 'image/png' };
const places = [
  { id: 'place-12', category: 'Community space' },
  { id: 'place-13', category: 'Park' },
  { id: 'place-99', category: 'Bakery', publicSpace: true },
];
const T = (n: number) => `2026-11-1${n}T10:00:00.000Z`;

const withStaff = (): Permit => sendToStaff(newPermit(pdf, T(0), ['profile-resident']), T(1), 'profile-ngo');

describe('which events need a permit', () => {
  it('a park or a street is public space; a hall or a shop is not', () => {
    expect(isPublicSpace(places[1])).toBe(true);
    expect(isPublicSpace(places[0])).toBe(false);
    expect(isPublicSpace({ id: 'x', category: 'Street' })).toBe(true);
    expect(isPublicSpace(undefined)).toBe(false);
  });
  it('a place can be marked as public space', () => expect(isPublicSpace(places[2])).toBe(true));
  it('an event with no place (online) never needs one', () => {
    expect(needsPermit(null, places)).toBe(false);
    expect(needsPermit('', places)).toBe(false);
    expect(needsPermit('place-unknown', places)).toBe(false);
  });
  it('needs one in a park, not in the hall', () => {
    expect(needsPermit('place-13', places)).toBe(true);
    expect(needsPermit('place-12', places)).toBe(false);
  });
});

describe('the permit file', () => {
  it('takes a PDF, JPG or PNG', () => {
    expect(validatePermitFile(pdf)).toBeNull();
    expect(validatePermitFile(png)).toBeNull();
    expect(validatePermitFile({ name: 'a.JPG', size: 10, type: 'image/jpeg' })).toBeNull();
  });
  it('asks for a file when there is none', () => {
    expect(validatePermitFile(null)).toBe('Upload your permit (a PDF, JPG or PNG).');
    expect(validatePermitFile({ name: ' ', size: 1, type: 'application/pdf' })).toMatch(/Upload your permit/);
  });
  it('turns down other kinds of file, even with a pdf extension on the wrong type', () => {
    expect(validatePermitFile({ name: 'permit.docx', size: 10, type: 'application/msword' })).toMatch(/PDF, JPG or PNG/);
    expect(validatePermitFile({ name: 'permit.exe', size: 10, type: '' })).toMatch(/PDF, JPG or PNG/);
    expect(validatePermitFile({ name: 'permit.pdf', size: 10, type: 'text/html' })).toMatch(/PDF, JPG or PNG/);
  });
  it('turns down an empty file and a file over 5 MB', () => {
    expect(validatePermitFile({ ...pdf, size: 0 })).toMatch(/empty/);
    expect(validatePermitFile({ ...pdf, size: PERMIT_MAX_BYTES })).toBeNull();
    expect(validatePermitFile({ ...pdf, size: PERMIT_MAX_BYTES + 1 })).toMatch(/under 5 MB/);
  });
  it('shows the size in words', () => {
    expect(fileSizeLabel(500)).toBe('500 B');
    expect(fileSizeLabel(184320)).toBe('180 KB');
    expect(fileSizeLabel(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});

describe('the journey of a permit', () => {
  it('starts with the organizer, then goes to Neighbr staff', () => {
    const p = newPermit(pdf, T(0), ['profile-resident', null, 'profile-resident']);
    expect(p.status).toBe('with-organizer');
    expect(p.notify).toEqual(['profile-resident']);
    expect(permitBlocksMap(p)).toBe(true);
    const s = sendToStaff(p, T(1), 'profile-ngo');
    expect(s.status).toBe('with-staff');
    expect(s.notify).toEqual(['profile-resident', 'profile-ngo']);
    expect(s.steps.map((x) => x.action)).toEqual(['uploaded', 'sent-to-staff']);
    expect(p.status).toBe('with-organizer'); // nothing changed in place
  });
  it('cannot be sent to staff twice, and a bad file never makes a permit', () => {
    expect(() => sendToStaff(withStaff(), T(2))).toThrow(/already been sent/);
    expect(() => newPermit({ ...pdf, size: 0 }, T(0))).toThrow(/empty/);
  });
  it('approve: the event can go on the map', () => {
    const p = decide(withStaff(), 'approve', '', T(2));
    expect(p.status).toBe('approved');
    expect(permitBlocksMap(p)).toBe(false);
  });
  it('decline needs a reason the group can read', () => {
    expect(() => decide(withStaff(), 'decline', '', T(2))).toThrow('Give a reason, so the group knows what to fix.');
    expect(() => decide(withStaff(), 'decline', 'too short', T(2))).toThrow(/reason/);
    const p = decide(withStaff(), 'decline', '  The permit has expired.  ', T(2));
    expect(p.status).toBe('declined');
    expect(latestMessage(p)).toEqual({ kind: 'reason', text: 'The permit has expired.' });
    expect(permitBlocksMap(p)).toBe(true);
  });
  it('ask needs a question, and the group is asked', () => {
    expect(() => decide(withStaff(), 'ask', '', T(2))).toThrow('Write what you need to know.');
    expect(() => decide(withStaff(), 'ask', 'x'.repeat(301), T(2))).toThrow(/under 300/);
    const p = decide(withStaff(), 'ask', 'Which days is the park booked for?', T(2));
    expect(p.status).toBe('more-info');
    expect(latestMessage(p)).toEqual({ kind: 'question', text: 'Which days is the park booked for?' });
  });
  it('staff can only decide on a permit that is waiting for them', () => {
    expect(() => decide(newPermit(pdf, T(0)), 'approve', '', T(1))).toThrow(/not waiting/);
    const done = decide(withStaff(), 'approve', '', T(2));
    expect(() => decide(done, 'decline', 'Changed my mind about it.', T(3))).toThrow(/not waiting/);
  });
  it('the group answers a question (a new file is optional) and it goes back to staff', () => {
    const asked = decide(withStaff(), 'ask', 'Which days is the park booked for?', T(2));
    expect(() => answer(asked, { note: '' }, T(3))).toThrow('Write your answer to the question.');
    expect(() => answer(asked, { note: 'Saturday only.', file: { ...pdf, size: 0 } }, T(3))).toThrow(/empty/);
    const a = answer(asked, { note: 'Saturday only.' }, T(3));
    expect(a.status).toBe('with-staff');
    expect(a.file).toEqual(pdf);
    const b = answer(asked, { note: 'Saturday only.', file: png }, T(3));
    expect(b.file).toEqual(png);
    expect(b.steps.at(-1)).toMatchObject({ action: 'answered', text: 'Saturday only.' });
  });
  it('after a decline, the group sends it again with a new permit', () => {
    const declined = decide(withStaff(), 'decline', 'The permit has expired.', T(2));
    expect(() => answer(declined, { note: 'Sorry!' }, T(3))).toThrow(/Upload your permit/);
    const again = answer(declined, { file: png }, T(3));
    expect(again.status).toBe('with-staff');
    expect(again.file).toEqual(png);
    expect(again.steps.at(-1)?.action).toBe('sent-again');
  });
  it('there is nothing to answer on a permit that is waiting or approved', () => {
    expect(() => answer(withStaff(), { note: 'Hello there' }, T(3))).toThrow(/nothing to answer/);
  });
  it('only an organizer of the same group can answer', () => {
    const asked = decide(withStaff(), 'ask', 'Which days is the park booked for?', T(2));
    expect(canAnswer(asked, { orgId: 'org-rnn', role: 'organizer' }, 'org-rnn')).toBe(true);
    expect(canAnswer(asked, { orgId: 'org-rnn', role: 'volunteer' }, 'org-rnn')).toBe(false);
    expect(canAnswer(asked, { orgId: 'org-school', role: 'organizer' }, 'org-rnn')).toBe(false);
    expect(canAnswer(withStaff(), { orgId: 'org-rnn', role: 'organizer' }, 'org-rnn')).toBe(false);
    expect(canAnswer(undefined, { orgId: 'org-rnn', role: 'organizer' }, 'org-rnn')).toBe(false);
  });
  it('words for the group never contain a staff name', () => {
    const all = Object.values(STAGE_LABEL).join(' ') + JSON.stringify(decisionNotice('decline', 'Bench day', 'The permit has expired.', false));
    expect(all).not.toMatch(/Taylor|Brooks/);
    expect(all).toMatch(/Neighbr staff/);
  });
  it('the notification says what happened', () => {
    expect(decisionNotice('approve', 'Bench day', '', true).text).toMatch(/on the map until it ends/);
    expect(decisionNotice('decline', 'Bench day', ' Expired. ', false).text).toBe('Neighbr staff declined the permit: Expired.');
    expect(decisionNotice('ask', 'Bench day', 'Which days?', false).text).toMatch(/need more information .* Which days\?/);
  });
  it('validateDecision', () => {
    expect(validateDecision('approve', '')).toBeNull();
    expect(validateDecision('decline', 'Please bring the right form.')).toBeNull();
  });
});

describe('who is Neighbr staff', () => {
  it('only the Neighbr staff person in Viewing as', () => {
    expect(isNeighbrStaff(personaById('neighbr-staff'))).toBe(true);
    for (const id of ['resident', 'city-lead', 'bia-lead', 'councillor', 'community-organizer', 'library-staff', 'business']) expect(isNeighbrStaff(personaById(id))).toBe(false);
  });
  it('lands on the Review page and does not send or receive requests', () => {
    const p = personaById('neighbr-staff');
    expect(p.landing).toBe('review');
    expect(p.group).toBe('staff');
    expect(p.canReport).toBe(false);
  });
});
