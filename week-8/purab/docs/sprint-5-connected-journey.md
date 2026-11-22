# Sprint 5: one request, followed from start to finish (Purab and Bhavana)

Updated 1 November 2026. Answers Nigel's Week 6 message: connected journeys between residents, businesses and the organizations that handle their requests, tested and improved. Built on the existing coded prototype (Purab's shell and Report a problem, Devu's map, Bhavana's cards, Mounika's profiles and community workspace). All names and data are illustrative.

**Quick links:** [How to follow the journey](#1-how-to-follow-the-journey-5-minutes) · [Walkthrough](#2-walkthrough-one-complete-journey) · [Declined, more information, no permission](#3-declined-more-information-needed-and-no-permission) · [Who can see and change what](#4-who-can-see-and-change-a-request) · [Testing record](#5-what-we-tested-learned-and-changed) · [Works / simulated / to build](#6-what-works-what-is-simulated-what-remains) · [Plan](#7-plan-to-the-final-deliverable)

## The journeys we chose

| Journey | Who sends it | Who handles it | Back to |
| --- | --- | --- | --- |
| **A. Resident → City** (main) | Resident reports a street light out on the map | City of Windsor 311: the intake lead acknowledges and assigns; the roads and lighting crew asks a question, updates and resolves. The ward councillor gets a read-only copy. | The resident follows progress, answers the question, reopens it when the light fails again, and everyone sees the published outcome on the map. |
| **B. Business → BIA** | Rosa's Bakery: sidewalk closed in front of the shop | Olde Riverside BIA coordinator (can assign to business support) | Rosa sees the update and the outcome; the neighbourhood sees the outcome on the map. |

Both follow Nigel's Oct 19 guidance: a resident's problem goes to the City or the councillor, never the BIA; the BIA's loop is with its businesses.

## 1. How to follow the journey (5 minutes)

```
npm install
npm run dev
```

1. Open the app. A yellow **Demo · Viewing as** strip is under the top bar. Sign-in is simulated: choosing a person there makes every screen act for them.
2. As **Team 2 Group 10, Resident**: on the map, **Report a problem** → *Street light out* → *Second Spin Cycles* → **Send report** → **Track it in Requests**.
3. Switch **Viewing as** to **Jordan Lee, City 311 intake lead**. The same request is open in the work queue. **Acknowledge**, then **Assign** to Sam Patel.
4. Switch to **Sam Patel, City roads and lighting crew**. Try **Decline** (locked: only the lead can). Type a question and **Ask for more information**.
5. Switch to the **Resident**. The question is waiting; answer it with **Send reply**.
6. Switch to **Sam Patel**: **Send update**, then **Mark resolved**.
7. **Resident**: the request is resolved; type what's still wrong and **Still a problem? Reopen**.
8. **Jordan Lee**: the request is back as *Reopened*. Acknowledge; Sam resolves it again; Jordan writes the outcome and **Publish outcome on the map**.
9. **Ward Councillor**: sees the copy, can't change it. **Alex Moreau, BIA coordinator**: opening the same link shows *You don't have access to this request*.
10. Journey B: as **Alex Moreau**, open *Sidewalk closed in front of the bakery*, **Mark resolved** and **Publish outcome**; switch to **Rosa's Bakery, Business owner** to see it.

Changes last until the page is refreshed (the demo resets to the sample data).

## 2. Walkthrough: one complete journey

Screenshots from the running app on Purab's laptop during the manual test run on Nov 1 (desktop), in `docs/evidence/sprint-5-journey/`. Screenshots 02, 05, 22 and 23 come from the scripted browser run, where the map background is grey because that machine had no access to the map tiles; the pins and panels are real.

### Journey A: resident → City of Windsor 311 → resident

| # | Who | What happens | Screenshot |
| --- | --- | --- | --- |
| 1 | Resident | Reports a street light out near Second Spin Cycles. The form says it goes to City of Windsor 311 with a copy to the ward councillor, and stays private. | [01](evidence/sprint-5-journey/01-resident-reports.png) |
| 2 | Resident | Confirmation, with **Track it in Requests**. | [02](evidence/sprint-5-journey/02-report-sent.png) |
| 3 | Resident | **My requests**: the new request is at *Sent*, with who it went to. | [03](evidence/sprint-5-journey/03-resident-my-requests-new.png) |
| 4 | City 311 intake lead | The request arrives in the **work queue** as *New*, with summary counts and filters. | [04](evidence/sprint-5-journey/04-city-queue-new-request.png) |
| 5 | City 311 intake lead | Acknowledges and assigns it to the roads and lighting crew. Both steps go into the record. | [05](evidence/sprint-5-journey/05-city-lead-assigned.png) |
| 6 | Crew | Tries to decline: **not allowed**. The button is marked locked, the reason is shown, and the attempt is logged for staff. | [06](evidence/sprint-5-journey/06-crew-blocked-decline.png) |
| 7 | Crew | Asks the resident which pole it is. State: *Needs more info*. | [07](evidence/sprint-5-journey/07-crew-asks-for-info.png) |
| 8 | Resident | Sees *Answer needed* and the question. | [08](evidence/sprint-5-journey/08-resident-sees-question.png) |
| 9 | Resident | Answers. The request goes back to the crew (*Being handled*). | [09](evidence/sprint-5-journey/09-resident-replied.png) |
| 10 | Crew | Sends an update ("crew booked for Tuesday"), then marks it resolved with what was done. | [10](evidence/sprint-5-journey/10-crew-resolved.png) |
| 11 | Resident | Sees *Resolved*, the crew's note, and that they can reopen within 14 days. | [11](evidence/sprint-5-journey/11-resident-sees-resolved.png) |
| 12 | Resident | The light fails again: **Reopen** with what's wrong. | [12](evidence/sprint-5-journey/12-resident-reopened.png) |
| 13 | City 311 intake lead | The request is back in the queue as *Reopened*. | [13](evidence/sprint-5-journey/13-city-lead-sees-reopened.png) |
| 14 | City 311 intake lead | After the crew fixes it again, publishes the outcome to the map. | [14](evidence/sprint-5-journey/14-city-lead-published.png) |
| 15 | Ward councillor | Reads the copy; every action is locked ("You get a copy to stay informed"). | [15](evidence/sprint-5-journey/15-councillor-copy-read-only.png) |
| 16 | BIA coordinator | Opens the City's request link: *You don't have access to this request*. | [16](evidence/sprint-5-journey/16-bia-no-access.png) |
| 21 | Everyone | On the map, the street light is now public and shows *Resolved 3/3* for every visitor, with the outcome on its card. | [21](evidence/sprint-5-journey/21-map-outcome-public.png) |
| 21b | City 311 staff | Staff see the public map: the outcome is there, private reports and the **Report a problem** button are not. | [21b](evidence/sprint-5-journey/21b-staff-map-public.png) |

### Journey B: business → BIA → business

| # | Who | What happens | Screenshot |
| --- | --- | --- | --- |
| 17 | BIA coordinator | BIA work queue: Northside Books' delivery-zone request is *New*; acknowledges and assigns it to business support. | [17](evidence/sprint-5-journey/17-bia-queue.png) |
| 18 | BIA coordinator | Rosa's sidewalk request: sends the City's answer, resolves, publishes the outcome. | [18](evidence/sprint-5-journey/18-bia-resolved-and-published.png) |
| 19 | BIA coordinator | A **declined** example: a leaking roof inside a rented unit (landlord's job), with the reason and where to go instead. | [19](evidence/sprint-5-journey/19-bia-declined-example.png) |
| 20 | Rosa's Bakery | **My requests to the BIA**: resolved, with the BIA's update and the published outcome. | [20](evidence/sprint-5-journey/20-business-sees-outcome.png) |

Phone: [22 My requests](evidence/sprint-5-journey/22-phone-my-requests.png), [23 request detail](evidence/sprint-5-journey/23-phone-request-detail.png). The list and the detail stack, with **Back to the list**.

### The states a request goes through

```
            ┌──── Ask for more information ────┐
            ▼                                  │ (requester replies)
New ──► Received ──► Being handled (assigned) ─┴──► Resolved ──► Outcome published on the map
 │          │                │                        │
 │          └──── Decline (reason required) ──► Declined ◄─── lead can reopen
 │                                                    │
 └── Withdraw (requester, while open)                 └── Reopen (requester, within 14 days) ──► Reopened ──► Received ...
```

On the map, the three-step ring and popup keep using *Reported → Acknowledged → Resolved*, so earlier screens did not need to change. *Declined* and *Withdrawn* show as their own label.

## 3. Declined, more information needed, and no permission

| Situation | What the system does | Shown in |
| --- | --- | --- |
| **Declined** | Only the organization's lead can decline, and must give a reason of at least 10 characters. The person who sent it sees *Declined* and the reason (e.g. "this is between you and your landlord; the City's property standards team can help"). They can still send a follow-up, and the lead can reopen it. Declined requests never appear on the public map. | 19, tests |
| **More information needed** | Staff ask a question; the request moves to *Needs more info* and shows *Answer needed* to the person who sent it. Only they can answer. Their answer sends it back to whoever was handling it. | 7, 8, 9 |
| **Not allowed** (e.g. crew tries to decline or assign; councillor tries to change a copy; resident tries a staff action) | Buttons the person may not use are shown with a lock and a dashed border, and a **Locked for you** box explains why. If they still click, the action is refused with the reason, nothing changes, and the attempt is written to the record as *Blocked* (staff only). The same check runs in the data layer, not only on screen. | 6, 15 |
| **No access** (e.g. the BIA opens a City request link) | *You don't have access to this request*. The request isn't in their lists and its contents are never sent to their screen. | 16 |
| **Problem comes back** | The person who sent it can reopen within 14 days of *Resolved*; after that they're asked to send a new report. Reopening takes the published outcome off the map. | 12, 13 |
| **Changed their mind** | The person who sent it can withdraw an open request (with a confirm step). | tests |

## 4. Who can see and change a request

Every request shows this in **Who can see and change this**. People who sent a request see job titles there, not staff names.

| | Sees it | Record they see | Can do |
| --- | --- | --- | --- |
| Person who sent it (resident or business) | Own requests | Everything except internal notes and blocked attempts | Reply to a question, follow up, reopen (14 days), withdraw |
| Organization lead (311 intake lead, BIA coordinator) | All requests sent to their organization | Everything | Acknowledge, assign (own team only), update, ask, resolve, decline, internal note, publish outcome, reopen |
| Assigned staff (roads crew, business support) | All requests sent to their organization | Everything | Update, ask, resolve, only when assigned to them; internal notes on any |
| Copy holder (ward councillor) | Requests copied to them | Everything except internal notes and blocked attempts | Nothing (read only) |
| Any other organization, other residents | Nothing until an outcome is published | Only the outcome, on the map | Nothing |

## 5. What we tested, learned and changed

### How we tested

| Test | What | Result |
| --- | --- | --- |
| Automated rules | `requests.test.ts`: 25 tests for who can see, who can change, every state change, declined, more information, reopen window, withdraw, publish, the BIA loop | Pass |
| Automated journey | `Requests.test.tsx`: 10 tests through the data adapter and the screens: report → request, status reaching the map, blocked attempt logged, locked button, answering a question, no access, councillor read-only | Pass |
| Whole project | `npm test`: **243 tests** (173 before this sprint; 35 for requests, 35 for Devu's school workspace); type check and production build | Pass |
| Manual walkthrough | Purab ran the full test script (section 1, both journeys, all six people) on his laptop and took the screenshots in section 2 | Every step behaved as expected |
| End-to-end walkthrough | A browser script plays both journeys through the real app as six different people (resident, business owner, 311 lead, crew, BIA coordinator, councillor) (screenshots 02, 05, 22, 23 come from this run) | Completed, no console errors |
| Accessibility | axe-core (WCAG 2.1 A and AA) on 8 request screens (My requests, work queue, locked action, question, councillor copy, no access, BIA queue, phone), plus the school section (public and staff views) and the map after merging | **0 issues** |
| Keyboard | Everything reachable with Tab; locked buttons stay focusable so keyboard users can hear why; messages are announced (live region / alert) | Checked |

### What we found and changed

| What we found | Why it mattered | What we changed |
| --- | --- | --- |
| After the City published an outcome, that request appeared in the **BIA's queue**, with the resident's name. | Another organization saw someone else's request. | **Requests** lists only requests you're part of (sent, handling, or copied). Published outcomes are seen on the map, without the sender's name. |
| The data layer returned the **whole record** to the resident; the screen hid internal notes, but they still reached the browser. | Hiding on screen isn't privacy. | The data layer now returns only the record lines that person may read. This is how the real API has to work too. |
| The resident saw **staff names** in the record and in "who can see this". | Staff privacy; residents need the role, not the person. | Residents see the organization and job title ("City of Windsor 311, roads and street lighting crew"). |
| The step **"Assigned"** showed as done when the BIA resolved a request without assigning it. | Misleading progress. | Renamed the step **Being handled**. |
| *Waiting for more information* was too long for the queue badge and wrapped. | Hard to scan the queue. | Badge says **Needs more info**; the full sentence is in the request. |
| A plain disabled button doesn't explain itself and can't be reached with the keyboard. | Nigel asked what happens when someone tries an action they can't do. | Locked buttons stay focusable, show a lock, list the reason in **Locked for you**, refuse with a message, and log the attempt. |

### Not tested yet (gap)

We have **not yet tested with real residents, business owners or staff**. Everything above was tested by the team and automated scripts. This is the first task of the next sprint (see the plan): short walkthroughs with at least 3 residents or business owners and 1 person playing a staff role, using section 1 as the script, recording where they hesitate.

## 6. What works, what is simulated, what remains

| | Works (real code, tested) | Simulated | Still to build |
| --- | --- | --- | --- |
| Sending | Report a problem and Request help from the BIA; routing to City 311, councillor copy or BIA; private until published | Location is picked from a list (no GPS); no photos | Photo upload; choose a point on the map |
| Organization side | Work queue with counts and filters; acknowledge, assign within the team, ask, update, resolve, decline with reason, internal notes, publish, reopen | Staff accounts are demo people; one City team and one BIA | Reassign between City departments; due dates and overdue warnings; BIA referring a request to the City |
| Back to the sender | My requests; status steps; updates; answer a question; follow up; reopen within 14 days; withdraw | No email or phone notifications; the person checks the Requests page | Notifications (in-app first, then email) |
| Rules | Who can see and change, checked in the data layer and on screen; blocked attempts recorded | Sign-in: **Viewing as** switch, no passwords | Real sign-in and verified roles; server-side checks (the rules are written so the API can reuse them) |
| Record | Every action, with who and when; staff-only lines kept from senders | Kept in memory; resets on refresh | Saved in the backend; export for the board report |
| Map | Status ring and outcome on the pin, visible to everyone once published | — | Outcome card style ("You said, we did") |

## 7. Plan to the final deliverable

Dates are our plan; we'll confirm the final date with Nigel and Rustem.

| Sprint | Dates | Work | Owner |
| --- | --- | --- | --- |
| 6 | Nov 2 – 8 | Test both journeys with at least 3 residents or business owners and 1 staff role-play; write up findings | All (Purab organizes) |
| | | Fix the top findings; in-app notifications for the sender ("You have a question from City 311"); one **Viewing as** for the whole app (Community and School switches join it) | Purab |
| | | BIA can refer a request it can't act on to City 311 (keeps the record); overdue warning in the queue | Bhavana |
| | | Request status and published outcomes styled on the map pins; "You said, we did" card | Devu |
| | | Approved community events become map pins; community organization requests to the City (e.g. event permit question) | Mounika |
| 7 | Nov 9 – 15 | Second round of testing on the changes | All |
| | | Photo on a report (simulated upload); choose the location on the map | Purab, Devu |
| | | Reassign between City teams; due dates | Bhavana |
| | | School and library workspaces using the same request flow (e.g. a school reports an unsafe crossing) | Mounika, Devu |
| 8 | Nov 16 – 22 | API contract for `src/data/api.ts` (what each call sends and returns, which checks the server must repeat) | Purab, Mounika |
| | | Accessibility and phone pass on every screen | Bhavana |
| | | Walkthrough video of both journeys | Devu |
| 9 | Nov 23 – 29 | Final deliverable: package, README, handover notes, final demo | All |

## Files

| File | What | Owner |
| --- | --- | --- |
| `src/features/requests/requests.ts` | All the rules, with no UI: states, who can see, who can change and why not, applying an action, the record, helpers | Purab |
| `src/features/requests/personas.ts`, `src/app/ViewAs.tsx` | The people you can view as (simulated sign-in) and the **Viewing as** strip | Purab |
| `src/features/requests/MyRequests.tsx` | My requests for residents and businesses: answer, follow up, reopen, withdraw | Purab |
| `src/features/requests/WorkQueue.tsx` | The organization workspace: queue, counts, filters, staff actions, locked actions; read-only for copy holders | Bhavana |
| `src/features/requests/RequestDetail.tsx` | One request as both sides see it: steps, who can see and change, the record, no access | Purab and Bhavana |
| `src/features/requests/RequestsPage.tsx`, `Requests.css`, `useActions.ts` | The Requests section (`#/requests`, `?id=` opens one request) | Purab and Bhavana |
| `src/data/api.ts` | `getRequests`, `actOnRequest`, `getStaff`; reports become requests; status changes reach the map | Purab |
| `src/data/mock-data.json` | `staff` (5 demo staff) and `requests` (7 demo requests in different states) | Purab and Bhavana |
| `src/app/` (`routes.ts`, `App.tsx`, `AppShell.*`) | Requests in the top and bottom bars; the demo strip | Purab |
| `src/features/map/MapPage.tsx`, `src/features/report/ReportProblem.tsx`, `src/features/cards/cardData.ts`, `src/features/map/popupSteps.ts` | Staff see the public map without the Report button; **Track it in Requests** after sending; *Declined* and *Withdrawn* labels | Purab |
| `src/features/requests/*.test.ts(x)` | 35 tests | Purab and Bhavana |

## Questions for Nigel

- Should the ward councillor be able to add a comment that the City and the resident can see, or stay read-only?
- When the BIA can't act on a business request (e.g. a pothole outside the shop), should it **refer** it to the City (one record) or ask the business to send a new report?
- Should published outcomes need the sender's agreement first?
