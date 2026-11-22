# KAN-47 (Devu): every request's progress and outcome on the map

> **After the team merge (Nov 8, Purab):** this work now runs on top of Sprint 6. The parent in Viewing as is **Maya R.** (Sprint 6) instead of Pat Morgan, and Ms. Laurent is the Sprint 6 school staff person. The open question is answered: the **sender** chooses **Post to the map / Send privately** (also on the school form now), and an outcome only reaches the map and "You said, we did" if the sender put the request on the map. Notices for parents now also reach the parent's notifications. Test counts below are from before the merge; the merged build has 332 tests.

Updated 8 November 2026. Built on the team's `pinpoint-sprint5-final` (Purab's request system, Bhavana's work queue, Mounika's community workspace). All data is illustrative.

## What was added

| Day | What | Where |
| --- | --- | --- |
| Wed | **Request status on map pins.** A request's pin says where it is in words under the pin (Reported, Received, Being handled, Needs more info, Reopened, Resolved, Declined, Withdrawn). Resolved has a green ring, declined or withdrawn a grey faded pin. The popup adds "Status: ...". | `src/features/map/requestStatus.ts`, `CorridorMap.tsx`, `src/data/api.ts` (`withRequestInfo`) |
| Thu | **"You said, we did".** A new tab on the map panel lists the published outcomes as cards (You said: the public title; We did: the outcome; who handled it; date) and every request with its status. Chips filter the list **and** the request pins on the map (All, In progress, Resolved, Declined); other pins stay. The pin popup also shows "We did: ...". | `YouSaidWeDid.tsx`, `MapPage.tsx` |
| Fri | **School can send requests to the City.** School staff get a "Requests to the City" card: choose the problem and where (school or a crosswalk), add details, send. It goes to City 311 with a copy to the ward councillor, starts private, and appears in Requests and on the map like any other request. | `schoolData.ts`, `SchoolWorkspace.tsx` |
| Fri | **School section joined to Viewing as.** The School's own Public / Parent / Staff switch is gone. Two new people in Viewing as: **Pat Morgan, Parent, Grade 2** and **Ms. Laurent, School staff**; everyone else gets the public school view. Picking a school person opens the school. | `personas.ts`, `CommunityPage.tsx`, `App.tsx` |

Seed data: two published outcomes (faded crosswalk at Thompson, street light near Glidden Grocer) so the tab has content, and a demo school profile (`profile-school`) that can send requests.

## Privacy rules

- A request is **private** until the City or the BIA publishes the outcome. The person who sent it sees its progress on their own pin and in Requests; everyone else sees it only after it is published.
- A published outcome shows only the **public title** and the **outcome text**, who handled it and the date. Never who sent it and never their original message (tests check this).
- A **reopened** request stops being an outcome (its old outcome text is not shown as "done").
- The school's request to the City is sent as the school, never with student information (the form says so).

## Files changed in shared code (merge carefully)

`src/data/api.ts` (request info on pins, organization requester), `src/data/mock-data.json` (profile-school, issue-07/08, req-11/req-12), `src/features/requests/requests.ts` (`Persona.schoolRole`, requester kind `organization`), `personas.ts` (2 people), `RequestDetail.tsx` (label), `src/app/App.tsx`, `CommunityPage.tsx`, `MapPage.tsx`, `CorridorMap.tsx`.

## Checks

- **259 tests pass** (243 before): new `requestStatus.test.ts` (11) and a rewritten `SchoolWorkspace.test.tsx` (school follows Viewing as, request to the City, outcome becomes public). Type check and production build pass.
- Browser check (Chromium) and screenshots in `docs/evidence/sprint-6-KAN-47-devu/`.
- Not done: accessibility scan of the new tab, real-phone check.

## Open questions for Nigel / the team

- Nigel (Nov 2): the **sender** should choose whether the outcome goes to the map or only to the person. Today the organization's lead publishes it. Should we add a "Share on the map" choice for the sender?
- Should a public outcome leave the map after a while and live on only in a notification, as Nigel said for alerts?
- Community's own Me / Organizer switch still exists; the School no longer has one.
