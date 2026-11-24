// Checks the search box and chips on screen: typing, Enter and clicking a chip.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import rawData from '../../data/mock-data.json';
import { SearchAndFilters } from './SearchAndFilters';
import type { MockData } from './filters';

const data = rawData as unknown as MockData;

// Remove the previous test's screen so buttons are not found twice.
afterEach(cleanup);

describe('SearchAndFilters', () => {
  it('moves the map to the first result when Enter is pressed', () => {
    const onFocusItem = vi.fn();
    render(<SearchAndFilters data={data} onFocusItem={onFocusItem} />);

    fireEvent.change(screen.getByLabelText('Search the map'), { target: { value: 'books' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(onFocusItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Northside Books' }));
  });

  it('filters pins and cards together when a chip is clicked', () => {
    const onResultsChange = vi.fn();
    render(<SearchAndFilters data={data} onResultsChange={onResultsChange} />);

    fireEvent.click(screen.getByRole('button', { name: /^Events/ }));

    const latest = onResultsChange.mock.calls.at(-1)?.[0];
    expect(latest).toHaveLength(5);
    expect(screen.getByRole('button', { name: /^Events/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('shows a friendly message when nothing matches', () => {
    render(<SearchAndFilters data={data} />);
    fireEvent.change(screen.getByLabelText('Search the map'), { target: { value: 'zzzz' } });
    expect(screen.getByText(/No matches/)).toBeTruthy();
  });
});
