# Sprint 6 (Nov 2–8): Nigel's Nov 2 feedback, and this week's features (Purab and Bhavana)

Updated 3 November 2026. Built on the Sprint 5 code (everyone's work, including Mounika's community workspace and Devu's school workspace). All names and data are illustrative.

## What Nigel asked for at office hours (Nov 2), and what we changed

| Nigel said | What we built | Who |
| --- | --- | --- |
| "Do a good enough cross-section of user types" and make it navigable: pick a user type and go through their experience | **Viewing as** now has 10 user types in three groups: residents and businesses (resident, parent, business owner), organizations (community organizer, school staff, library staff) and staff (City 311 lead, City crew, BIA coordinator, ward councillor) | Purab |
| "The onboarding should route to the proper landing for the proper user type" | **Onboarding** (`#/welcome`, shown on the first visit): pick who you are joining as, confirm (account and verification simulated), and land on your page: the map, your workspace in Community, or your work queue in Requests | Purab |
| "Any user can send any request" (a school, a BIA, a community group act as an individual) | Organizations send requests from the map like anyone else. The BIA has two tabs: **Work queue** (requests to the BIA) and **Sent by us** (its own requests to the City). We dropped the planned "BIA refers to the City" feature: the BIA simply sends its own request. | Bhavana |
| "They should have a choice": post to the map, or send directly | The report form asks **Who can see it?**: *Send privately* (default: only you and the people handling it) or *Post to the map* (neighbours see it and follow its progress). The outcome can only go on the map if the sender chose that. | Purab |
| The ward councillor "should be able to comment… it's an interactive process" | The councillor (copy holder) can **Add a comment**. The City and the sender see it; the councillor still can't change the request. | Bhavana |
| "I don't think we need to have them see who's handling it" | Senders see the **organization only** ("City of Windsor 311"), never staff names or job titles, in the record, the access box and notifications | Bhavana |
| Alerts "could go right into the notification" | **Notifications** for the person who sent a request: a bell in the top bar | Bhavana |
| Events in public spaces need a permit, approved by Neighbr staff | Not in this package: Mounika's task this sprint (needs the Neighbr staff user type) | Mounika |
| Public map posts expire into notifications; school alerts notify parents | Not in this package: Devu's task this sprint | Devu |

## This week's features in this package

### Purab
- **Onboarding** with a landing page per user type (`src/app/Welcome.tsx`)
- **One Viewing as for the whole app.** The Community and School sections follow it; their own Me / Organizer and Public / Parent / Staff switches are gone when used in the app (`src/features/requests/personas.ts`, `CommunityPage.tsx`, `SchoolWorkspace.tsx`)
- **Post to the map / Send privately** in the report form
- **Pick the spot on the map** ("Or pick the spot on the map": the form steps aside, you click the map, it comes back with the spot; Escape or Cancel to stop). The report is named after the nearest place.
- **Photo on a report** (resized in the browser), shown to the sender and the staff handling it
- **The demo is kept after a refresh** (saved in this browser), with **Reset demo** in the yellow strip and **Sign up as someone else** to go back to onboarding
- **Ready for a live link**: the build works from any web address (`base: './'`), see "Live demo link" below

### Bhavana
- **Any organization can send a request** (BIA, school, community group, library), with **Sent by us** for the BIA
- **Ward councillor comments**
- **Senders see the organization only**
- **Notifications**: bell with a count of new ones; *received your request*, *is working on it*, *asked you a question*, *sent an update*, *marked it resolved*, *declined it*, *passed it to another team*, *posted the outcome on the map*, *Ward Councillor commented*. Clicking one opens the request; opening a request marks its notifications read. Only the sender gets them; internal notes never become notifications.
- **Due dates and overdue warnings**: a target time per request type (e.g. street lights 5 days, garbage 3 days, roads 7 days), *Due Nov 10* or *Overdue by 3 days* in words, an **Overdue** tile and filter, and **Oldest first** sorting
- **Move a request to another City team** (e.g. Roads → Parks): only the lead, and a reason is required; the record says who it moved from and to

## Try it (5 minutes)

`npm install`, `npm run dev`, then:

1. The first visit opens **onboarding**. Choose **School staff** → **Continue**. You land on the school workspace (no separate switch).
2. **Map** → **Report a problem** → *Sidewalk problem* → **Or pick the spot on the map** → click the map → add a photo → details → **Post to the map** → **Send report** → **Track it in Requests**.
3. Refresh the page: everything is still there.
4. **Viewing as** → *Jordan Lee, City 311 intake lead*. Look at the **Overdue** tile and filter. Open the school's request (photo, "On the map", due date). **Acknowledge**, **Assign** to Sam, then choose Dana, write a reason and **Move to this team**.
5. **Viewing as** → *Ward Councillor*: write a comment and **Add a comment**.
6. **Viewing as** → *Ms. Laurent, School staff*: the bell shows the new notifications; click one. The record shows "City of Windsor 311", no staff names, and the councillor's comment.
7. **Viewing as** → *Alex Moreau, BIA coordinator*: report a street light from the map, then see **Sent by us** next to the **Work queue**.
8. **Reset demo** goes back to onboarding and the sample data.

## Evidence

Screenshots in `docs/evidence/sprint-6/` (desktop 1440 × 900 unless noted; the map background is grey because the machine that took them could not load map tiles).

| Screenshot | Shows |
| --- | --- |
| [01](evidence/sprint-6/01-onboarding.png) | Onboarding: residents and businesses, organizations, staff |
| [02](evidence/sprint-6/02-onboarding-confirm.png) | Confirm: account, verification (simulated), where you'll land |
| [03](evidence/sprint-6/03-school-staff-lands-on-workspace.png) | School staff land on their workspace; no separate switch |
| [04](evidence/sprint-6/04-pick-spot-on-map.png) | Picking the spot on the map |
| [05](evidence/sprint-6/05-report-form-spot-photo.png) | Report form: spot chosen on the map, photo added |
| [06](evidence/sprint-6/06-report-form-who-can-see.png) | **Who can see it?**: Send privately or Post to the map |
| [07](evidence/sprint-6/07-school-requests.png) | "Requests from Riverside Public School", with the photo |
| [08](evidence/sprint-6/08-after-refresh-still-there.png) | After a refresh, still there |
| [09](evidence/sprint-6/09-city-queue-overdue.png) | City queue: Overdue tile and filter, "Overdue by …" in words |
| [10](evidence/sprint-6/10-city-sees-photo-and-public.png) | Staff see the photo, the spot, "On the map" and the due date |
| [11](evidence/sprint-6/11-city-reassigned-with-reason.png) | Moved from Roads to Parks, with the reason in the record |
| [12](evidence/sprint-6/12-councillor-comment.png) | The councillor's comment |
| [13](evidence/sprint-6/13-school-notifications.png) | The school's notifications |
| [14](evidence/sprint-6/14-school-record-org-only.png) | The sender's record: organization only, and the comment |
| [15](evidence/sprint-6/15-bia-sent-by-us.png) | The BIA's **Sent by us** tab |
| [16](evidence/sprint-6/16-parent-lands-on-school.png) | A parent lands on the school, seeing parent notices |
| [17](evidence/sprint-6/17-resident-map-public-school-request.png) | A resident sees the school's public request on the map |
| [18](evidence/sprint-6/18-reset-back-to-onboarding.png) | Reset demo |
| [19](evidence/sprint-6/19-phone-onboarding.png) | Onboarding on a phone (390 × 844) |

## Checks

- **274 tests pass** (243 before): 31 new tests (29 in `sprint6.test.ts` and `Sprint6Screens.test.tsx`, 2 in existing files), and 8 existing tests updated for the new rules. Type check and production build pass.
- **Browser run** of the steps above as 6 user types (school staff, City lead, councillor, BIA coordinator, parent, resident): no console errors.
- **Accessibility** (axe-core, WCAG 2.1 A and AA) on onboarding, the report form, the work queue, the councillor view and the notifications panel: **0 issues**. The bell says how many are new to screen readers; overdue is said in words, not only colour.

## Rules that changed (and why)

| Before (Sprint 5) | Now | Why |
| --- | --- | --- |
| Reports were always private; the City lead published the outcome | The sender chooses; the outcome goes on the map only if the sender posted it there | Nigel: the sender should have the choice |
| Senders saw "City of Windsor 311, roads crew" | Senders see "City of Windsor 311" | Nigel: who handles it isn't needed on an external civic platform |
| Councillor read-only | Councillor can comment, still can't change it | Nigel: it's an interactive process |
| Only residents and businesses sent requests | Anyone can, organizations too | Nigel: treat an organization as an individual |
| Changes were lost on refresh | Kept in this browser until **Reset demo** | So testers and Nigel can stop and come back |

## Live demo link (Purab's task: due this week)

The app is ready to host anywhere:

1. `npm run build` (creates the `dist` folder).
2. Go to **app.netlify.com/drop** and drag the `dist` folder onto the page (free; a Netlify account keeps the link).
3. Put the link at the top of the README and send it to Nigel.

## What works, what is simulated, what remains

| | |
| --- | --- |
| **Works** | Onboarding and landing per user type; Viewing as for 10 user types; anyone sends requests; post to the map or send privately; spot on the map; photo; councillor comments; notifications; due dates and overdue; moving between teams; kept after a refresh; Reset demo |
| **Simulated** | Sign-up and verification; photos are stored in the browser; notifications appear in the app only (no email or phone); target times are illustrative |
| **This sprint, other team members** | Neighbr staff user type with event permit approval (Mounika); community events on the map (Mounika); school alerts to parents as notifications and map posts that expire into notifications (Devu); status on pins and "You said, we did" (Devu) |
| **Still to do** | Live link (above); real-user testing on the live link; real backend (the server must repeat the rules in `requests.ts`) |
