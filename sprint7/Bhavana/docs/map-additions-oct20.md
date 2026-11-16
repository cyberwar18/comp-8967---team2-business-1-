# Map additions (Devu), Oct 20

What changed on the map. All data is illustrative.

1. **Business posts and offers layer** (B pins, gold). Public offers and public business posts. Each pin sits about 10 m from its shop. An offer that has passed its end date comes off the map.
2. **BIA polls** (V pins, purple). Open poll: tap an answer, then see the results (percent and number, with bars). One vote each. Votes are demo only and are not saved. Closed poll: final results, no buttons.
3. **Private requests stay off the public map.** Anything with a visibility other than "public" is dropped in `src/features/map/extras.ts` (the draft sale post waiting for the BIA, `post-03`, never appears). Tests: `extras.test.ts`.
4. **Ward area outline** (W layer, dashed). Shows the demo ward area where resident reports go (city / ward councillor, not the BIA). The resident's street-light issue popup says "Goes to: City of Windsor / ward councillor (demo)".

Shared files touched: `src/data/mock-data.json` (new lists `posts`, `polls`, `wards`; `routedTo` on issue-05), `src/data/api.ts` (`getPosts`, `getPolls`, `getWards`), `src/features/map/MapPage.tsx`.
Tests: 93 pass (73 before + 20 new).
