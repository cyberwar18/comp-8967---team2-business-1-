// Tests for the KAN-9 search and filter logic, using the real mock data file.

import { describe, expect, it } from 'vitest';
import rawData from '../../data/mock-data.json';
import { applyFilters, firstResult, getAllItems, matchesQuery, type MockData } from './filters';

const data = rawData as unknown as MockData;
const items = getAllItems(data);

describe('mock data', () => {
  it('has the amounts asked for in KAN-9', () => {
    expect(data.places).toHaveLength(15);
    expect(data.events).toHaveLength(5);
    expect(data.updates.length).toBeGreaterThanOrEqual(5);
  });

  it('labels every item as illustrative', () => {
    expect(items.every((item) => item.illustrative)).toBe(true);
  });

  it('gives every item a location for its pin', () => {
    expect(items.every((item) => typeof item.lat === 'number' && typeof item.lng === 'number')).toBe(true);
  });
});

describe('search', () => {
  it('shows everything when the box is empty', () => {
    expect(applyFilters(items, '', 'all')).toHaveLength(items.length);
  });

  it('finds a place by name, ignoring case and extra spaces', () => {
    const results = applyFilters(items, '  ROSA  ', 'all');
    expect(results.map((r) => r.name)).toContain("Rosa's Bakery");
  });

  it('finds items by category', () => {
    const results = applyFilters(items, 'roadworks', 'all');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.category.toLowerCase().includes('roadworks'))).toBe(true);
  });

  it('needs every typed word to match', () => {
    const item = items.find((i) => i.name === "Rosa's Bakery")!;
    expect(matchesQuery(item, 'bakery cafe')).toBe(true);
    expect(matchesQuery(item, 'bakery pharmacy')).toBe(false);
  });

  it('returns nothing, not an error, when nothing matches', () => {
    const results = applyFilters(items, 'zzzz', 'all');
    expect(results).toHaveLength(0);
    expect(firstResult(results)).toBeNull();
  });

  it('picks the first result for the map to move to', () => {
    const first = firstResult(applyFilters(items, 'books', 'all'));
    expect(first?.name).toBe('Northside Books');
  });
});

describe('filter chips', () => {
  it('Events only shows events', () => {
    const results = applyFilters(items, '', 'events');
    expect(results).toHaveLength(5);
    expect(results.every((r) => r.kind === 'event')).toBe(true);
  });

  it('Issues only shows issues', () => {
    const results = applyFilters(items, '', 'issues');
    expect(results.every((r) => r.kind === 'issue')).toBe(true);
  });

  it('works together with search', () => {
    const results = applyFilters(items, 'sidewalk', 'issues');
    expect(results.map((r) => r.name)).toEqual(['Sidewalk closed in front of the bakery']);
  });
});
