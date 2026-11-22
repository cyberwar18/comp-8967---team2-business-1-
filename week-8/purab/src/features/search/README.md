# Search and filters (KAN-9)

Owner: Mounika Boggarapu

Search box, filter chips and result cards for the map, using the illustrative mock data in `src/data/mock-data.json`.

## Files

| File | What it does |
| --- | --- |
| `filters.ts` | Search and chip logic (no UI), shared by pins and cards |
| `SearchBar.tsx` | Search box; Enter moves the map to the first result |
| `FilterChips.tsx` | All, Shops, Services, Community, Events, Updates, Issues |
| `SearchAndFilters.tsx` | Puts the search box, chips and result cards together |
| `*.test.ts(x)` | 15 tests for the logic and the screen behaviour |

## Connecting to the map (KAN-7)

```tsx
<SearchAndFilters
  data={mockData}
  onResultsChange={(items) => /* redraw pins with these items */}
  onFocusItem={(item) => map.flyTo({ center: [item.lng, item.lat], zoom: 17 })}
/>
```

## Run the tests

`npx vitest run`
