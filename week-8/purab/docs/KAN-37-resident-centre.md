# KAN-37: Resident at the centre, owner separate from business (Bhavana)

Updated 23 October 2026. Built on Mounika's KAN-36 data (which already includes Devu's map additions). All data is illustrative.

Follows Nigel's feedback at the Oct 19 office hours: everything centres on the resident; a business sits in the BIA corridor while its owner is a resident of the city; resident reports go to the city or ward councillor, not the BIA.

## What changed

1. **Your own resident profile is your home base** (avatar in the top bar, in Me mode):
   - *Coming up for you*: up to 3 upcoming events and offers picked from your interests.
   - *My reports* (only you see this): your reports, their step, and who they were sent to (e.g. City of Windsor 311, copy to the ward councillor). Names open those profiles.
   - *Who to contact about a problem*: ward councillor and city first, then the MP (federal matters only). Never the BIA.
2. **Owner and business are separate profiles.**
   - Other people see Rosa's Bakery without its owner, and Rosa's personal profile without her business.
   - Only the owner sees the link: *Run by you* on the business, *Your business* on her personal profile.
   - The business shows *Part of: Olde Riverside BIA*; the owner shows *Lives in: City of Windsor*.
   - Top bar in My business mode: "Rosa's Bakery, run by Rosa Alvarez".
3. **Responder profiles** (councillor, city, MP) open properly: role, area, *Handles*, and *Your reports sent here*.
4. **Report cards say who the report went to.** *Sent to* row, and the privacy line names the right approver ("Only you and City of Windsor 311, until approved"). Business requests still go to the BIA.
5. **Back goes to the previous profile** (resident → councillor → Back → resident). × closes all. Escape works like Back.

## Files

- `src/features/cards/cardData.ts`: new helpers `ownerOf`, `businessesOwnedBy`, `isSamePerson`, `biaFor`, `recipientsOf`, `shortName`, `areaResponders`, `reportsSentTo`, `comingUpFor`; new roles councillor, city, MP.
- `src/features/cards/ProfileCard.tsx`: reworked (home base, private owner link, responders).
- `src/features/cards/PlaceCard.tsx`: *Sent to* row and the right approver.
- `src/features/cards/UserPresence.tsx`, `src/app/App.tsx`: owner name in the top bar.
- `src/features/map/MapPage.tsx`: profile history (Back), links between profiles.
- `src/data/api.ts`: one line, the profile role type now includes councillor, city and MP (Purab's file).
- `src/features/cards/Cards.css`: styles for the new sections.
- Tests: new `src/features/cards/ResidentCentre.test.tsx` (17 tests); 4 older tests updated for the new wording.

## Checks

- 118 tests pass (101 before + 17 new). Type check and production build pass.
- Accessibility scan (axe-core, WCAG 2.1 AA) on 5 new screens × desktop and phone: own resident profile, councillor, business (owner view), owner's personal profile, report card. 0 issues.

## Still to decide (with the team / Nigel)

- In the demo, "Me" is the resident (Team 2 Group 10) and "My business" is Rosa's Bakery, which is owned by a different person (Rosa). Should the demo user become Rosa, or should there be a "view as" switch between the two people?
- How a resident picks who to report to (by issue type, by ward, or their choice). This is Purab's KAN-35.
