# KAN-42: Community organization workspace (Mounika)

> **Update (KAN-48, Nov 7):** the *Me / Organizer (demo)* switch described below was replaced by the app-wide **Viewing as** (pick *Priya Nair, Community group organizer*). New events are now kept by `api.ts`, and approved events with a place go on the map. See `docs/KAN-48-community-journey.md`.

Updated 30 October 2026. Built on the Sprint 4 code (Purab's shell, Devu's map, Bhavana's cards, my KAN-36 profiles). All data is illustrative.

Nigel (Oct 19) described Neighbr as separate loops around the resident: business ↔ BIA, resident ↔ City / councillor. This adds a third loop: **community organizations ↔ residents** (events and volunteering).

## What it does

A new **Community** section in the top bar (and the bottom bar on phones), at `#/community`.

1. **Organizations:** four demo organizations, one of each kind asked for in KAN-42:
   - Riverside Neighbours Network (community organization, the same group as `profile-ngo` on the map)
   - Olde Riverside Food Bank (food bank)
   - Riverside Public School (school)
   - Riverside Branch Library (institution)
2. **Events with Create event.** Members can create an event (name, date, start and end time, where, details). A new event **stays private**: only the person who made it and the organizers see it, marked *Waiting for approval*. An organizer approves it, then it's public. Events that are already on the shared map (Friday Market, Fall Garden Clean-up) show *Also on the shared map*.
3. **Volunteer roles and sign-ups.** Each role shows when, where and how many spots are left. Members can sign up and cancel; a full role can't be joined. Organizers see who signed up; everyone else only sees the number.
4. **Members list with search and filters**, reusing the map search: the same search box and chips, and the same rule (every typed word has to match name, role or skills). Chips: All, Organizers, Coordinators, Volunteers, Members, with counts. **Only members see the list**; others see how many people belong. Contact details and home addresses are never shown.
5. **Me / Organizer (demo).** The demo resident is a volunteer in the community group and the food bank, and not a member of the school or library. *Organizer (demo)* lets you look at the same workspace as the group's organizer, to show approving events.
6. **What's public and what's private** box at the bottom of every workspace.

## Privacy rules (same idea as private reports on the map)

| Thing | Who can see it |
| --- | --- |
| Public event | Everyone |
| Event waiting for approval | The person who made it, and the organizers |
| Members list | Members of that organization |
| Who signed up for a role | Organizers (everyone else sees the number of spots left) |
| Contact details, home address | Nobody |

## Files

| File | What |
| --- | --- |
| `src/features/community/communityData.ts` | All the rules, with no UI: who can see an event, building and approving events, form checks, sign-ups, members search |
| `src/features/community/CommunityPage.tsx` | The page: organizations, events and the create form, volunteer roles, members |
| `src/features/community/Community.css` | Styles (desktop: list on the left; phone: organizations in a row, everything stacked) |
| `src/data/mock-data.json` | New lists: `organizations`, `orgMembers`, `volunteerRoles`, `orgEvents`; `orgId` on the two map events the community group runs |
| `src/data/api.ts` | New functions: `getOrganizations`, `getOrgMembers`, `getVolunteerRoles`, `getOrgEvents` (Purab's file) |
| `src/app/routes.ts`, `App.tsx`, `AppShell.tsx`, `AppShell.css` | The Community section, its icon, and five places in the phone bottom bar (Purab's files) |
| `src/features/search/filters.ts`, `SearchBar.tsx`, `FilterChips.tsx` | Made reusable: `matchesWords` (same search rule for any text), the search box takes its own id and label, the chips take any ids. The map search works exactly as before. |
| `src/app/shell.test.tsx` | Test name says five sections instead of four |

New events and sign-ups are kept in the page's memory for the demo, and are gone after a refresh. With a real backend, they become calls in `api.ts`.

## Checks

- **28 new tests**: `communityData.test.ts` (22) and `CommunityPage.test.tsx` (6). **173 tests pass** in total (145 before). Type check and production build pass.
- **Accessibility scan** (axe-core, WCAG 2.1 A and AA) on 7 screens: workspace, form with errors, event sent, organizer view, members search, not a member, phone. **0 issues.**
- Keyboard: every button, chip and field is reachable; the form puts focus on the first field with an error; the "sent for approval" message gets focus; buttons say what they act on (for example *Sign up for Garden clean-up helper*).

## Evidence

Screenshots in `docs/evidence/sprint-5/`:

| Screenshot | Shows |
| --- | --- |
| 01-community-workspace | The Community section: organizations, events, volunteer roles, members |
| 02-create-event-form | The Create event form, with the privacy line |
| 03-event-waiting-for-approval | The new event, private and *Waiting for approval* |
| 04-organizer-sees-pending | As the organizer: both pending events with *Approve* |
| 05-organizer-approved | After approving: the event is public |
| 06-volunteer-signed-up | Signed up for a volunteer role, spots left goes down |
| 07-members-search | Members search for "gardening" |
| 08-not-a-member | The school: not a member, so no members list and no Create event |
| 09-phone | Phone layout with five places in the bottom bar |

## Still to decide (team / Nigel)

- Who approves a group's events: only its organizers, or also the City or BIA for events in public spaces?
- Should approved community events also become pins on the shared map? (Right now only the two existing map events are linked.)
- Joining a group: open to anyone, or approved by an organizer?
