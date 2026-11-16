# KAN-48: Community groups and the library join the journey (Mounika)

> **After the team merge (Nov 8, Purab):** this work now runs on top of Sprint 6. Priya Nair and Sofia Mendes are the Sprint 6 *Organizations* in Viewing as (Ms. Laurent too), linked to their member records, so they open their own group as organizers. Requests from a group come from the person, "for" the group, and the form now asks **Post to the map / Send privately** (Nigel, Nov 2). Events and service changes are kept after a refresh and cleared by **Reset demo**. Test counts below are from before the merge; the merged build has 332 tests.

Sprint 6, updated 7 November 2026. Built on the Sprint 5 final code. All data is illustrative.

Nigel (Nov 2 office hours) asked for one app where you can pick any user type and follow their experience, said a request comes **from the person who sends it** (any user can send any request), and said things on the map should **stay for a while and then disappear**. KAN-48 connects the Community section (KAN-42) to that journey in four steps.

## 1. Community section uses Viewing as (Fri)

- **Viewing as** has a new group, **Community groups**: *Priya Nair, Community group organizer* (Riverside Neighbours Network) and *Sofia Mendes, Library organizer* (Riverside Branch Library).
- The Community page no longer has its own *Me / Organizer (demo)* switch. It shows "Signed in as …" and your role in the group you are looking at.
- Picking an organizer opens their own group. They are only an organizer in that group; in other groups they are not a member.
- City 311 staff, the BIA coordinator and the councillor are not members of any group, so they see only what the public sees.
- *Not changed:* the School workspace (Devu, KAN-43) still has its own Public / Parent / Staff switch.

## 2. Community groups send requests to the City (Wed)

- New card in each workspace: **Send a request to the City → New request** (members only).
- The same problem types as *Report a problem* (pothole, street light, sidewalk, garbage, park or tree, something else), a place on the corridor, and details.
- Before sending, it shows **who gets it**, for example *City of Windsor 311, copy to Ward Councillor*, and why.
- It is sent **from the person** (for example Priya Nair), with *for Riverside Neighbours Network* noted on the request.
- It becomes a normal request: it appears in the **City 311 work queue**, the sender follows it in **Requests**, and the BIA and other organizations do not see it.

## 3. Approved community events become map pins (Thu)

- When an organizer approves an event that has a place on the corridor, it becomes an **E** pin in the Events layer and shows in the map search and Around you.
- Pending events never go on the map.
- The pin **leaves the map when the event is over** (Nigel: map items stay a while, then disappear).
- Events with no place (online, or not on the corridor) stay in the workspace only.

## 4. Library posts service changes that show on the map (Fri)

- The library workspace has **Service changes**. Its organizers (and coordinators) can **Post a service change**: what is changing, details, first day and last day.
- It shows as a **U** (Public update) pin at the branch, labelled *Service change*, **from the first day to the end of the last day**, then drops off the map and the list.
- Example in the data: *Closed Wednesday, Nov 11 (Remembrance Day)*, shown Nov 6–11.
- Members who are not organizers, and other people, can read service changes but cannot post them.

## Privacy and permission rules (each one has a test)

| Rule | Where it's checked |
| --- | --- |
| Only a group's organizer can approve its events | `canApprove`, `approveOrgEvent` |
| Pending events are not on the map | `eventOnMap` |
| Only organizers or coordinators of an organization with a place on the map can post service changes | `canPost`, `submitOrgPost` |
| A request from a group comes from the person; only they, the receiver and the copy holder see it | `submitReport`, `accessOf` (Purab) |
| Staff and the councillor are not members of any community group | `memberFor` |

## Files changed

| File | What changed | Owner |
| --- | --- | --- |
| `src/features/community/communityData.ts` | `memberFor` (Viewing as), map rules (`eventOnMap`, `isOver`, `postIsActive`, `postsFor`), service changes (`canPost`, `validatePost`, `buildPost`) | Mounika |
| `src/features/community/CommunityPage.tsx`, `Community.css` | Uses Viewing as; Send a request to the City; Service changes; approval goes through the adapter; finished events show as Past | Mounika |
| `src/data/mock-data.json` | Library location; `orgPosts` with one service change; corridor event and volunteer dates moved to Nov 27 – Dec 5 | Mounika |
| `src/data/api.ts` | `submitOrgEvent`, `approveOrgEvent`, `getOrgPosts`, `submitOrgPost`; `getMapData` adds community event pins and service change pins while current; `submitReport` keeps the sender's name and group | Purab's file |
| `src/features/requests/personas.ts`, `requests.ts`, `RequestDetail.tsx` | Two organizer personas; `memberId` / `orgName` on a persona; `onBehalfOf` on a request, shown as "for …" | Purab's / Bhavana's files |
| `src/app/ViewAs.tsx`, `App.tsx` | *Community groups* section in Viewing as; organizers open the Community page and see the public map; the name badge got a role so its label is valid (accessibility fix) | Purab's files |
| `src/features/school/SchoolWorkspace.test.tsx` | Renders the Community page with the default person instead of the old `userId` prop | Devu's test |
| `src/features/cards/Cards.test.tsx` | Friday Market date check: Nov 27 | Bhavana's test |

New events, approvals, requests and service changes are kept in memory for the demo and are gone after a refresh. With a real backend they become calls in `api.ts`.

## Checks

- **252 tests pass** (243 before). New and updated: `communityData.test.ts` (26) and `CommunityPage.test.tsx` (11), including: the request reaches the City 311 queue and not the BIA, an approved event appears in the map data and a private one does not, a service change is on the map on its day and gone the next day.
- Type check and production build pass.
- **Accessibility scan** (axe-core, WCAG 2.1 A/AA) on 6 screens: Community as organizer, request form, City 311 queue with the group's request, service change form, map with a community event, phone. **0 issues.**

## Evidence

Screenshots in `docs/evidence/sprint-6-KAN-48-mounika/`:

| Screenshot | Shows |
| --- | --- |
| 01-community-as-organizer | Viewing as Priya Nair: Community page, "You are an organizer here", no separate switch |
| 02-request-to-city-form | Send a request to the City, with "Goes to: City of Windsor 311, copy to Ward Councillor" |
| 03-request-sent | Request sent, with a link to follow it in Requests |
| 04-event-approved-goes-on-map | Organizer approves the potluck; "It is on the shared map until it ends" |
| 05-request-in-city-311-queue | Viewing as City 311 lead: the request from Priya Nair, for Riverside Neighbours Network |
| 06-library-service-change-form | Viewing as Sofia Mendes: posting "Closed Monday for staff training" |
| 07-library-service-changes-posted | Service changes list: on the map now / from Mon, Nov 9 |
| 08-map-community-event-pin | The approved potluck as an E pin on the map |
| 09-map-library-service-change | The library closure as a U pin with "Shown until Wed, Nov 11" |
| 10-phone-organizer | Phone layout as the organizer |

## Still to decide

- Nigel (Nov 2): events in public spaces (a park, the street) need a permit uploaded and approval by Neighbr staff before they go on the map. Not built yet.
- Notifications when a map item drops off (Devu's notifications work).
- One switch for the School workspace too (Devu).
