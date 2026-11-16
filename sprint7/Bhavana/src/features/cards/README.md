# Presence, place, activity and profile cards, linking (tasks 9–12 and follow-up)

Owner: Bhavana Volati

Built on Purab's shell and adapter, Devu's map (KAN-7) and Mounika's search and data (KAN-9). All data comes through `src/data/api.ts` and is illustrative.

## What each task does

| Task | What you see | Files |
| --- | --- | --- |
| 9 User presence | In the top bar: avatar, name and Resident badge, a **Me / My business** switch and a **Show me on the map** toggle that adds an approximate "you are here" marker. On a phone the toggle becomes an icon and the switch reads "Me / Business". | `UserPresence.tsx`, `useYouAreHere.ts` |
| 10 Place and profile cards | Selecting a pin or card opens a card in the panel: photo placeholder, category, status, hours, address, description, the profile that runs the place and what's happening there. On a phone it shows in the bottom sheet. In My business mode the owner also sees **My requests** (private). | `PlaceCard.tsx` |
| 11 Activity cards | Cards for events, offers, public updates and issues. Issues have a **progress ring** (Reported → Acknowledged → Resolved). Shown in the **Around you** tab, nearest first, with filters. | `ActivityCard.tsx`, `ProgressRing.tsx`, `AroundYou.tsx` |
| 12 Link cards and pins | Clicking a card selects its pin and the map flies there (offers select their shop). Clicking a pin opens its card. "← Back to list" closes the card but keeps the pin selected, so its row is highlighted and scrolled into view; "×" clears the selection. | `MapPage.tsx`, `AroundYou.tsx` |

### Follow-up: profile cards, connected to the map, and accessibility

| Deliverable | What you see | Files |
| --- | --- | --- |
| Profile cards (resident, business, BIA) | A full profile card: avatar, role, badge, bio, area or corridor, address and hours for organizations, interests and skills for residents (tap one to see what matches it on the corridor, e.g. "Local markets" → Friday Market), "What's on" or "Public notices", and a **What's public / Never shown to others** section from the profile's own lists. Your own profile says "This is how other people see your profile." | `ProfileCard.tsx` |
| Connect profile cards to the map | Click your **avatar** in the top bar → your profile (resident, or the business in My business mode). **View full profile →** on a place card → the business, BIA or community group. **Raised by** on a public report → the reporter's profile (hidden for other people's private reports). **Show on map →** selects the place pin. A **BIA profile highlights its corridor** (Thompson to Glidden) on the map, with a toggle. | `ProfileCard.tsx`, `PlaceCard.tsx`, `UserPresence.tsx`, `useCorridorHighlight.ts`, `MapPage.tsx`, `App.tsx` |
| Accessibility check | axe-core scan of 13 screen states (desktop and phone) and a keyboard walk: 52 problems found, 0 left. Escape closes cards, focus returns to the list after Back. Full report: `docs/accessibility-check.md`. | `docs/accessibility-check.md` |

`cardData.ts` holds the logic (no UI): visibility, distances, the Around you order and issue steps. `Cards.css` uses the shell's design tokens from `src/index.css`.

## Changes outside this folder (small, additive)

- `src/data/mock-data.json`: added `hours` to each place and an `offers` list (3 illustrative offers). Coordinates unchanged.
- `src/data/api.ts`: added `getOffers()` and the `Offer` type.
- `src/app/App.tsx`: holds the Me / My business and Show me choices and passes them to the top bar and the map page.
- `src/features/map/CorridorMap.tsx`: optional `onMapReady` prop, used by the "you are here" marker.
- `src/features/map/MapPage.tsx`: search list and pins now get only what the current viewer may see (`visibleToViewer`), so private reports don't show to other people.
- `src/features/map/MapPage.tsx` / `MapPage.css`: **Search / Around you** tabs and the card view inside the panel; the open card's pin always stays on the map.
- `src/index.css`: `--moss`, `--amber` and `--ink-3` slightly darker so text passes 4.5:1 contrast (accessibility check).
- `src/features/search/SearchAndFilters.css`: chip counts use a solid colour instead of 70% opacity (contrast).
- `src/app/AppShell.tsx`: optional `presence` prop; the logo link's spoken name now includes its visible text.
- `src/app/shell.test.tsx`: test fixture name set back to "Morgan Ellis (demo)" so it matches what the test checks (the test was failing before these changes).

## Privacy

- "You are here" is an approximate demo point (the place nearest the middle of the corridor), never a home address.
- Reports marked "private until approved" show only to the person who raised them (Around you, "Your report") and to the business owner (My requests). They never appear under "Happening here".

## Tests

`npm test` runs 73 tests; 43 are for Bhavana's part (`cardData.test.ts`, `Cards.test.tsx`, `ProfileCard.test.tsx`).
