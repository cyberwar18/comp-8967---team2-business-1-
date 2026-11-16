// KAN-52 (Mounika): the reported content queue (chats, listings, business posts).
import { describe, expect, it } from 'vitest';
import {
  KIND_LABEL,
  canDecide,
  canReportPost,
  countByKind,
  filterQueue,
  fromListings,
  fromMessages,
  fromPosts,
  hiddenNotice,
  reporterNotice,
  sortQueue,
  validatePostReport,
  type PostReport,
} from './reports';
import type { MessageReport } from '../chats/chats';
import type { ListingReport } from '../marketplace/marketplace';

const names: Record<string, string> = { 'profile-resident': 'Team 2 Group 10', 'profile-business': "Rosa's Bakery", 'profile-resident-maya': 'Maya R.', 'profile-ngo': 'Priya Nair' };
const nameOf = (id: string) => names[id] ?? 'A neighbour';

const msg: MessageReport = { id: 'r1', chatId: 'c1', messageId: 'm1', reportedBy: 'profile-resident', reportedProfile: 'profile-resident-maya', reason: 'Spam or scam', note: '', text: 'Buy my thing now!', at: '2026-11-14T10:00:00.000Z', status: 'open' };
const listing: ListingReport = { id: 'lr1', listingId: 'mk-03', title: 'Snow blower', description: 'Barely used.', category: 'sale', sellerId: 'profile-resident-maya', sellerName: 'Maya R.', reportedBy: 'profile-business', reason: 'Scam or fake', note: 'Wanted a gift card.', at: '2026-11-14T12:00:00.000Z', status: 'open' };
const post: PostReport = { id: 'pr1', postId: 'post-09', title: 'Cheap everything', description: 'Click here.', posterId: 'profile-business', reportedBy: 'profile-ngo', reason: 'Spam or scam', note: '', at: '2026-11-14T11:00:00.000Z', status: 'kept' };

const all = () => [...fromMessages([msg], nameOf), ...fromListings([listing], nameOf), ...fromPosts([post], nameOf)];

describe('one queue for chats, listings and posts', () => {
  it('has the same shape for all three, with a copy of what was reported', () => {
    const [m, l, p] = all();
    expect(m).toMatchObject({ key: 'chat:r1', kind: 'chat', text: 'Buy my thing now!', aboutName: 'Maya R.', reportedByName: 'Team 2 Group 10' });
    expect(l).toMatchObject({ key: 'listing:lr1', kind: 'listing', title: 'Snow blower', aboutName: 'Maya R.', reportedByName: "Rosa's Bakery", note: 'Wanted a gift card.' });
    expect(p).toMatchObject({ key: 'post:pr1', kind: 'post', title: 'Cheap everything', aboutName: "Rosa's Bakery", reportedByName: 'Priya Nair', status: 'kept' });
  });
  it('puts open reports first, newest first, then the decided ones', () => {
    expect(sortQueue(all()).map((i) => i.key)).toEqual(['listing:lr1', 'chat:r1', 'post:pr1']);
  });
  it('filters by kind and by status', () => {
    expect(filterQueue(all(), 'listing', 'all').map((i) => i.key)).toEqual(['listing:lr1']);
    expect(filterQueue(all(), 'all', 'open')).toHaveLength(2);
    expect(filterQueue(all(), 'all', 'decided').map((i) => i.key)).toEqual(['post:pr1']);
    expect(filterQueue(all(), 'post', 'open')).toHaveLength(0);
    expect(filterQueue(all(), 'all', 'all')).toHaveLength(3);
  });
  it('counts what is waiting, for the chips', () => {
    expect(countByKind(all())).toEqual({ all: 2, chat: 1, listing: 1, post: 0 });
    expect(countByKind(all(), 'all')).toEqual({ all: 3, chat: 1, listing: 1, post: 1 });
  });
  it('only an open report can be decided', () => {
    expect(canDecide({ status: 'open' })).toBe(true);
    expect(canDecide({ status: 'hidden' })).toBe(false);
    expect(canDecide({ status: 'kept' })).toBe(false);
  });
  it('has words for each kind', () => expect(Object.keys(KIND_LABEL)).toEqual(['chat', 'listing', 'post']));
});

describe('what people are told', () => {
  it('the person it is about learns it was removed, never who reported it', () => {
    for (const k of ['chat', 'listing', 'post'] as const) {
      const n = hiddenNotice(k, 'Snow blower');
      expect(n.text).toMatch(/Neighbr staff removed/);
      expect(JSON.stringify(n)).not.toMatch(/reported by|Team 2|Rosa|Priya/i);
    }
  });
  it('the reporter hears either outcome', () => {
    expect(reporterNotice('listing', 'Snow blower', 'hidden').text).toMatch(/removed it/);
    expect(reporterNotice('post', 'Cheap', 'kept').text).toMatch(/keep it up/);
    expect(reporterNotice('chat', '', 'hidden').title).toBe('Your report');
  });
});

describe('reporting a business post', () => {
  const open = { reportedBy: 'profile-business', visibility: 'public' };
  it('anyone else can, once', () => {
    expect(canReportPost('profile-resident', open, [], 'post-09')).toEqual({ ok: true });
    expect(canReportPost('profile-resident', open, [{ ...post, postId: 'post-09', reportedBy: 'profile-resident' }], 'post-09')).toEqual({ ok: false, reason: 'You already reported this post.' });
  });
  it('not your own post, and not one that is not public', () => {
    expect(canReportPost('profile-business', open, [], 'post-09').reason).toBe('You cannot report your own post.');
    expect(canReportPost('profile-resident', { ...open, visibility: 'private' }, [], 'post-09').reason).toBe('Post not found.');
  });
  it('needs a reason from the list, and a short note', () => {
    expect(validatePostReport('', '')).toBe('Choose a reason.');
    expect(validatePostReport('Because', '')).toBe('Choose a reason.');
    expect(validatePostReport('Offensive', 'x'.repeat(301))).toMatch(/under 300/);
    expect(validatePostReport('Offensive', 'Rude words')).toBeNull();
  });
});
