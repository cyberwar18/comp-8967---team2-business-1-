// KAN-51 (Bhavana): chats between people and organizations: the rules, and the data layer.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import raw from '../../data/mock-data.json';
import {
  blockInChat,
  clearSubmittedReports,
  getChat,
  getChatContacts,
  getChats,
  getMessageReports,
  getNotifications,
  getUnreadChatCount,
  markChatRead,
  openRequestChat,
  reportMessage,
  resetDemo,
  sendMessage,
  setClockForTests,
  setMessageSetting,
  startChat,
  unblockInChat,
} from '../../data/api';
import { personaById } from '../requests/personas';
import type { Persona } from '../requests/requests';
import {
  canBlock,
  canReport,
  canSend,
  canStart,
  contactsFor,
  unreadCount,
  validateMessage,
  viewFor,
  type ChatContext,
  type Conversation,
} from './chats';

const resident = personaById('resident');
const maya = personaById('parent');
const rosa = personaById('business');
const priya = personaById('community-organizer');
const laurent = personaById('school-staff');
const jordan = personaById('city-lead');
const sam = personaById('city-crew');
const alex = personaById('bia-lead');
const councillor = personaById('councillor');
/** Not in Viewing as: the sender of the sample scam message. */
const jamie: Persona = { id: 'jamie', label: 'Jamie K. (demo)', title: 'Resident', kind: 'requester', profileId: 'profile-resident-jamie' };

const seed = (raw as unknown as { chats: Conversation[] }).chats;
const chat = (id: string) => JSON.parse(JSON.stringify(seed.find((c) => c.id === id))) as Conversation;
const ctx = (over: Partial<ChatContext> = {}): ChatContext => ({
  names: Object.fromEntries((raw as unknown as { profiles: { id: string; name: string }[] }).profiles.map((p) => [p.id, p.name])),
  orgMembers: (raw as unknown as { orgChatMembers: Record<string, string[]> }).orgChatMembers,
  blocks: {},
  settings: {},
  ...over,
});

beforeEach(() => setClockForTests(() => new Date('2026-11-13T15:00:00Z')));
afterEach(() => {
  clearSubmittedReports();
  setClockForTests(null);
});

describe('who can start a chat', () => {
  it('an organization can message its members, a person can message their organizations', () => {
    expect(canStart(priya, 'profile-resident', ctx()).ok).toBe(true);
    expect(canStart(alex, 'profile-business', ctx()).ok).toBe(true);
    expect(canStart(resident, 'profile-ngo', ctx()).ok).toBe(true);
  });

  it('nobody can message themselves; the councillor and City staff use the request instead', () => {
    expect(canStart(resident, 'profile-resident', ctx()).reason).toBe('You cannot message yourself.');
    expect(canStart(councillor, 'profile-resident', ctx()).reason).toMatch(/comments on requests/);
    expect(canStart(jordan, 'profile-resident', ctx()).reason).toMatch(/about their requests only/);
  });

  it('respects "Who can message me"', () => {
    const nobody = ctx({ settings: { 'profile-resident-maya': 'nobody' } });
    expect(canStart(jamie, 'profile-resident-maya', nobody).reason).toBe("Maya R. isn't accepting new messages.");
    const orgsOnly = ctx({ settings: { 'profile-resident-maya': 'organizations' } });
    expect(canStart(jamie, 'profile-resident-maya', orgsOnly).reason).toBe('Maya R. only accepts messages from organizations they belong to.');
    expect(canStart(laurent, 'profile-resident-maya', orgsOnly).ok).toBe(true); // her child's school
  });

  it('blocking works both ways, and never tells the blocked person they were blocked', () => {
    const blocked = ctx({ blocks: { 'profile-resident': ['profile-resident-jamie'] } });
    blocked.names['profile-resident-jamie'] = 'Jamie K. (demo)';
    expect(canStart(resident, 'profile-resident-jamie', blocked).reason).toBe('You blocked Jamie K. Unblock them to send a message.');
    const r = canStart(jamie, 'profile-resident', blocked).reason!;
    expect(r).toBe("Team 2 Group 10 isn't accepting messages from you.");
    expect(r).not.toMatch(/block/i);
  });
});

describe('sending, blocking and reporting in a chat', () => {
  it('only the two sides can send', () => {
    expect(canSend(resident, chat('chat-req-07'), ctx()).reason).toBe('You are not part of this chat.');
    expect(canSend(maya, chat('chat-req-07'), ctx()).ok).toBe(true);
    expect(canSend(sam, chat('chat-req-07'), ctx()).ok).toBe(true);
  });

  it('a chat about a request stays open and cannot be blocked', () => {
    const blocked = ctx({ blocks: { 'profile-resident-maya': ['profile-city'] } });
    expect(canSend(sam, chat('chat-req-07'), blocked).ok).toBe(true);
    expect(canBlock(maya, chat('chat-req-07')).reason).toMatch(/can't be blocked. Report a message/);
    expect(canBlock(resident, chat('chat-direct-jamie')).ok).toBe(true);
  });

  it('after a block, neither side can send in that chat', () => {
    const blocked = ctx({ blocks: { 'profile-resident': ['profile-resident-jamie'] } });
    expect(canSend(resident, chat('chat-direct-jamie'), blocked).reason).toBe('You blocked Jamie K. Unblock them to send a message.');
    expect(canSend(jamie, chat('chat-direct-jamie'), blocked).reason).toBe("Team 2 Group 10 isn't accepting messages from you.");
  });

  it('you can report a message from the other side, once, but not your own', () => {
    const c = chat('chat-org-rnn-resident');
    expect(canReport(resident, c, 'm-rnn-1', []).ok).toBe(true);
    expect(canReport(resident, c, 'm-rnn-2', []).reason).toBe('You cannot report your own message.');
    const done = [{ id: 'r1', chatId: c.id, messageId: 'm-rnn-1', reportedBy: 'profile-resident', reportedProfile: 'profile-ngo', reason: 'Spam or scam' as const, note: '', text: '', at: '', status: 'open' as const }];
    expect(canReport(resident, c, 'm-rnn-1', done).reason).toBe('You already reported this message.');
  });

  it('checks the message', () => {
    expect(validateMessage('   ')).toBe('Write a message first.');
    expect(validateMessage('x'.repeat(1001))).toMatch(/under 1000/);
    expect(validateMessage('Hello')).toBeNull();
  });
});

describe('what each person sees', () => {
  it('the sender sees the organization, never the staff member', () => {
    const v = viewFor(maya, chat('chat-req-07'), ctx(), []);
    expect(v.messages.map((m) => m.who)).toEqual(['City of Windsor 311', 'You', 'City of Windsor 311']);
    const json = JSON.stringify(v);
    expect(json).not.toMatch(/Sam Patel|staff-311/);
  });

  it('staff see which colleague wrote it; the writer sees "You"', () => {
    expect(viewFor(jordan, chat('chat-req-07'), ctx(), []).messages[0].who).toBe('Sam Patel');
    expect(viewFor(sam, chat('chat-req-07'), ctx(), []).messages[0].who).toBe('You');
  });

  it('counts unread messages from the other side only', () => {
    expect(unreadCount(maya, chat('chat-req-07'))).toBe(1);
    expect(unreadCount(resident, chat('chat-direct-jamie'))).toBe(1);
    expect(unreadCount(jamie, chat('chat-direct-jamie'))).toBe(0);
  });

  it('lists who you can start a chat with', () => {
    expect(contactsFor(priya, ctx()).map((c) => c.name)).toEqual(['Rosa Alvarez', 'Team 2 Group 10']);
    expect(contactsFor(resident, ctx()).map((c) => c.name)).toEqual(['Riverside Neighbours Network']);
    expect(contactsFor(jordan, ctx())).toEqual([]);
    expect(contactsFor(councillor, ctx())).toEqual([]);
  });
});

describe('the data layer', () => {
  it('each person gets only their own chats', async () => {
    const ids = async (p: Persona) => (await getChats(p)).map((c) => c.id).sort();
    expect(await ids(resident)).toEqual(['chat-direct-jamie', 'chat-org-rnn-resident']);
    expect(await ids(maya)).toEqual(['chat-org-school-maya', 'chat-req-07']);
    expect(await ids(rosa)).toEqual(['chat-req-issue-04']);
    expect(await ids(jordan)).toEqual(['chat-req-07']);
    expect(await ids(alex)).toEqual(['chat-req-issue-04']);
    expect(await ids(councillor)).toEqual([]);
    expect(await getChat(resident, 'chat-req-07')).toBeNull();
  });

  it("never sends staff names or ids to the sender's browser", async () => {
    const json = JSON.stringify(await getChats(maya));
    expect(json).not.toMatch(/Sam Patel|staff-311|byStaffId|byName/);
  });

  it('opens one chat per request, for the sender and the organization only', async () => {
    const id = await openRequestChat(resident, 'req-issue-05');
    expect(await openRequestChat(jordan, 'req-issue-05')).toBe(id);
    await expect(openRequestChat(maya, 'req-issue-05')).rejects.toThrow(/Only the sender and the organization/);
    await expect(openRequestChat(alex, 'req-issue-05')).rejects.toThrow(/Only the sender and the organization/);
    const v = await getChat(resident, id);
    expect(v).toMatchObject({ title: 'Streetlight out near the pharmacy', label: 'About your request', otherName: 'City of Windsor 311' });
  });

  it('a new message reaches the other side as a notification, and opening the chat clears it', async () => {
    const id = await openRequestChat(resident, 'req-issue-05');
    await sendMessage(resident, id, 'The light flickers on and off at night.');
    const staffNotes = (await getNotifications(jordan)).filter((n) => n.id.startsWith('chat:'));
    expect(staffNotes).toEqual([expect.objectContaining({ text: 'New message from Team 2 Group 10', href: `#/chats?c=${id}` })]);
    await sendMessage(sam, id, 'Thanks, the crew will check it tonight.');
    const mine = (await getNotifications(resident)).filter((n) => n.id === `chat:${id}:profile-resident`);
    expect(mine[0].text).toBe('New message from City of Windsor 311');
    markChatRead(resident, id);
    expect((await getNotifications(resident)).some((n) => n.id === `chat:${id}:profile-resident`)).toBe(false);
  });

  it('refuses empty messages and messages from outsiders', async () => {
    await expect(sendMessage(maya, 'chat-req-07', '  ')).rejects.toThrow('Write a message first.');
    await expect(sendMessage(resident, 'chat-req-07', 'Hi')).rejects.toThrow('You are not part of this chat.');
  });

  it('an organization can start a chat with a member', async () => {
    const id = await startChat(priya, 'profile-owner-rosa', 'Could you help at the market on Friday?');
    const v = (await getChat(priya, id))!;
    expect(v).toMatchObject({ kind: 'organization', otherName: 'Rosa Alvarez', label: 'Member' });
    expect(v.messages[0]).toMatchObject({ who: 'You', text: 'Could you help at the market on Friday?' });
    expect(await getChatContacts(priya)).toHaveLength(2);
  });

  it('blocking stops the other side; unblocking lets them write again', async () => {
    await blockInChat(resident, 'chat-direct-jamie');
    await expect(sendMessage(jamie, 'chat-direct-jamie', 'Hello?')).rejects.toThrow("Team 2 Group 10 isn't accepting messages from you.");
    await expect(startChat(jamie, 'profile-resident', 'Hi')).rejects.toThrow("isn't accepting messages from you");
    expect((await getChat(resident, 'chat-direct-jamie'))!.blocked).toBe(true);
    await unblockInChat(resident, 'chat-direct-jamie');
    await sendMessage(jamie, 'chat-direct-jamie', 'Sorry to bother you.');
    expect(await getUnreadChatCount(resident)).toBe(2);
    await expect(blockInChat(maya, 'chat-req-07')).rejects.toThrow(/can't be blocked/);
  });

  it('"Who can message me" applies to new chats', async () => {
    await setMessageSetting(maya, 'organizations');
    await expect(startChat(jamie, 'profile-resident-maya', 'Hi')).rejects.toThrow('only accepts messages from organizations');
    await expect(startChat(laurent, 'profile-resident-maya', 'Pickup moves to 3:15 on Friday.')).resolves.toBe('chat-org-school-maya');
  });

  it('a report goes to Neighbr staff, and the person reported is not told', async () => {
    await reportMessage(resident, 'chat-direct-jamie', 'm-jam-1', 'Spam or scam', 'Asks for my home address');
    const [r] = await getMessageReports();
    expect(r).toMatchObject({ reportedBy: 'profile-resident', reportedProfile: 'profile-resident-jamie', reason: 'Spam or scam', status: 'open', text: expect.stringMatching(/concert tickets/) });
    expect((await getChat(resident, 'chat-direct-jamie'))!.messages[0].reported).toBe(true);
    expect(JSON.stringify(await getChat(jamie, 'chat-direct-jamie'))).not.toMatch(/"reported":true/);
    await expect(reportMessage(resident, 'chat-direct-jamie', 'm-jam-1', 'Spam or scam')).rejects.toThrow('already reported');
  });

  it('Reset demo brings back the sample chats', async () => {
    await sendMessage(maya, 'chat-req-07', 'Still there this morning.');
    resetDemo();
    expect((await getChat(maya, 'chat-req-07'))!.messages).toHaveLength(3);
  });
});
