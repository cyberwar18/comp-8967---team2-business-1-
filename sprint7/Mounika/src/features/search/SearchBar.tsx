// Search box for the map (KAN-9).
// Typing filters as you go; pressing Enter (or the search button) also moves the map to the first result.

import type { FormEvent } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
  /** Lets another screen reuse the box with its own id and spoken label (KAN-42 members list). */
  id?: string;
  label?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search Wyandotte St E',
  id = 'map-search',
  label = 'Search the map',
}: SearchBarProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="search-bar">
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <svg className="search-bar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id={id}
        type="text"
        enterKeyHint="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
      />
      {value && (
        <button type="button" className="search-bar__clear" onClick={() => onChange('')} aria-label="Clear search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
      <button type="submit" className="search-bar__go">
        Search
      </button>
    </form>
  );
}
