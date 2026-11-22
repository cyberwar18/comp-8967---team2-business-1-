# Accessibility check – PinPoint map (Week 3)

Owner: Bhavana Volati · Checked: 15 October 2026 · Standard: WCAG 2.1 level A and AA

## How we checked

1. **Automated scan** with axe-core 4.14 (rules tagged WCAG 2.0/2.1 A and AA) on the built app, in 13 screen states:
   - Desktop (1440 × 860): map with search list, Around you, event card, My business place card, business profile, resident profile, BIA profile
   - Phone (390 × 844): map, list sheet open, Around you, event card, My business place card, business profile
2. **Keyboard-only walk**: Tab through the page from the top, open a card with Enter, close it with Escape and Back, and check where focus goes.
3. **Code review** of labels, roles and states in the components (`aria-pressed`, `aria-current`, `aria-expanded`, headings, live regions).

## Results

| Screen state | Problems before | After fixes |
| --- | --- | --- |
| Desktop: map with search list | 13 | 0 |
| Desktop: Around you | 3 | 0 |
| Desktop: event card | 3 | 0 |
| Desktop: My business place card | 6 | 0 |
| Desktop: business profile | 6 | 0 |
| Desktop: resident and BIA profiles | (new) | 0 |
| Phone: map | 1 | 0 |
| Phone: list sheet open | 9 | 0 |
| Phone: Around you | 2 | 0 |
| Phone: event card | 2 | 0 |
| Phone: My business place card | 4 | 0 |
| Phone: business profile | 3 | 0 |

The counts are the number of elements that failed a rule. Several states share the same causes, listed below.

## What we found and fixed

| # | Problem (WCAG) | Where | Fix | File (owner) |
| --- | --- | --- | --- | --- |
| 1 | Green "Open / Published" and amber "Acknowledged / Planned" status text was 4.3:1 and 4.47:1 on its pale background; needs 4.5:1 (1.4.3 Contrast) | Result list status pills, card pills, "Your report" tag, business avatars | Darkened the shared colours: `--moss` #2f7d5b → #2a6f51 (5.2:1), `--amber` #b45309 → #a84d08 (5.0:1) | `src/index.css` (Purab's design tokens) |
| 2 | Grey hint text was 4.0:1 on the light grey background (1.4.3) | "Wyandotte" under street numbers, card type labels on grey cards | Darkened `--ink-3` #6b7885 → #5e6a76 (4.75:1 on grey, 5.5:1 on white) | `src/index.css` (Purab) |
| 3 | Chip counts like "(9)" were 3.4:1 because of 70% opacity (1.4.3) | Filter chips | Solid hint colour instead of opacity | `src/features/search/SearchAndFilters.css` (Mounika) |
| 4 | The logo link's spoken name ("Neighbr, Olde Riverside map") didn't contain its visible text as written (2.5.3 Label in Name) | Top bar logo | Spoken name is now the visible text plus ", go to the map" | `src/app/AppShell.tsx` (Purab) |
| 5 | The avatar button's spoken name ("Open profile: …") didn't include its visible badge text (2.5.3) | Top bar avatar | Spoken name is now "Team 2 Group 10 Resident, open profile" | `src/features/cards/UserPresence.tsx` (Bhavana) |
| 6 | No keyboard shortcut to leave an open card or profile (2.1.1 Keyboard, usability) | Card and profile panel | **Escape** closes the profile, then the card | `src/features/map/MapPage.tsx` (Bhavana) |
| 7 | After "← Back to list", keyboard focus was lost (2.4.3 Focus Order) | Card panel | Focus returns to the highlighted row in the list | `src/features/map/MapPage.tsx` (Bhavana) |
| 8 | Who raised a private report was shown to everyone (privacy, found during the check) | Place card "Raised by" | Shows "Hidden until the BIA approves it" unless you raised it | `src/features/cards/PlaceCard.tsx` (Bhavana) |

## What already worked well

- Skip link to the main content; every button, chip, tab and checkbox has a name.
- Opening a card or profile moves focus to its title, so screen-reader users hear what opened.
- Selected and on/off states are announced: `aria-pressed` (chips, Me / My business, corridor toggle), `aria-selected` (tabs), `aria-current` (selected card, current page, current issue step), `aria-expanded` (Layers, phone sheet).
- Type and status never rely on colour alone: pins show a letter (P, E, U, I, R), issue rings show "2/3 Acknowledged", popup steps show a tick and bold text.
- Visible focus outline on every control (the search box shows it on its rounded container).
- Touch targets are at least 36–44 px.

## Known limits (not failures, but worth saying)

- **Pins on the map canvas can't be reached with Tab.** MapLibre draws pins on a canvas. Every pin has the same item in the Search list or Around you, which are fully keyboard accessible, and choosing one there selects the pin.
- The pin popup is drawn by MapLibre and isn't announced automatically; the card that opens in the panel carries the same information and gets focus.

## Still to check by hand

These need a person and a real device, so they are not covered above:

- [ ] **Screen reader**: Windows Narrator (Ctrl + Win + Enter) or NVDA. Open a place card, a profile and Around you; check that names, badges and steps are read sensibly.
- [ ] **Zoom to 200%** in the browser (Ctrl + +): nothing is cut off and the panel still scrolls.
- [ ] **Real phone**: VoiceOver (iPhone) or TalkBack (Android) on the list sheet and a card.
- [ ] **Reduced motion**: with "Show animations" turned off in Windows settings, transitions are switched off (already handled in `index.css`).

## How to repeat the automated scan

Open the app, press F12 in Chrome or Edge, open the **Lighthouse** tab, tick **Accessibility** and click **Analyze page load**. Or install the free axe DevTools browser extension and click **Scan all of my page** in each screen state listed above.

## KAN-37 follow-up scan (23 Oct)

Same scan (axe-core, WCAG 2.1 AA) on the new screens, desktop 1440×900 and phone 390×844: own resident profile, ward councillor profile, business profile seen by its owner, owner's personal profile, report card with "Sent to". **0 issues.** Escape now goes back one profile at a time.
