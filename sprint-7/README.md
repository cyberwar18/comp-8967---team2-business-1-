# PinPoint – Neighbr front-end shell

**Team 2 – PinPoint** · COMP 8967 · Business partner: Commonfield Systems Inc. / Neighbr

The shared map is the main screen. A resident lands on the Olde Riverside corridor (Wyandotte St E, Thompson to Glidden), sees places, events, public updates, issues and roadwork as pins, and can search, filter and switch layers. All data is illustrative mock data.

## Run it

Needs Node.js 20 or newer.

```
npm install
npm run dev      # open the link it prints, usually http://localhost:5173
npm test         # 538 tests
npm run build    # type check + production build
```

### Live demo link

`npm run build` creates the `dist` folder. Drag it onto **app.netlify.com/drop** (or any static host) to get a link anyone can open without installing anything.

### Put the pins on the real street

Get two points from Google Maps (right-click each intersection, click the numbers), then:

```
npm run place-pins -- <Wyandotte & Thompson lat,lng> <Wyandotte & Glidden lat,lng>
```

This rewrites only the coordinates in `src/data/mock-data.json`.

On Windows PowerShell, if `npm` is blocked, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Sprint 7 (Nov 9–15): final week, feature complete

Every feature planned for the final demo is in this build: the map, Requests, Community and School, Updates, **Chats**, **Marketplace**, **Review** (Neighbr staff), and **Your profile and Settings**. Week 8 is refinements only. For a 10-minute walkthrough that shows every user type, see [`docs/final-demo-script.md`](docs/final-demo-script.md).


| Change | Where | Owner |
| --- | --- | --- |
| **Chats** (`#/chats`): people and organizations message each other safely. A chat linked to each request (the sender sees the organization, not staff names); organizations (community group, school, library, BIA) message their members; **block**, **report a message** to Neighbr staff, **"Who can message me"**; new messages in the **notification bell**. Functions for the team: `startChat` (Message the seller), `getMessageReports` (reported content queue), `get/setMessageSetting` (settings page) | `src/features/chats/`, chat functions in `src/data/api.ts`, `RequestDetail.tsx`, sample chats in `src/data/mock-data.json`; [`docs/KAN-51-chats.md`](docs/KAN-51-chats.md), screenshots in `docs/evidence/sprint-7-KAN-51-bhavana/` (KAN-51) | Bhavana |
| **Marketplace** (`#/marketplace`): For sale, Free, Wanted, Services and Business offers with picture, price and area; create a listing; search and filters (kind, price, Free only, distance); listings as pins on the map (new layer) with a link back; **Message the seller** (opens a chat); **report a listing** to the Neighbr staff queue; **map posts expire**: after the end date a listing, a business post or an offer leaves the map and its owner gets "This post has ended" in the bell (KAN-53) | `src/features/marketplace/`, `listingPins` / `endedPostNotifications` and the listing functions in `src/data/api.ts`, `extras.ts`, `CorridorMap.tsx`, `docs/KAN-53-marketplace.md` | Devu |
| **Event permits and Neighbr moderation** (`#/review`): a new **Neighbr staff** user type; an event in a public place needs a **permit upload**, approved by an organizer and then by Neighbr staff before it goes on the map (**Approve, Decline with a reason, Ask for more information**); a **reported content queue** for chats, listings and business posts (**Hide or Keep**); **Report this post**; senders are notified of every decision (KAN-52) | `src/features/moderation/`, permit and report functions at the end of `src/data/api.ts`, `CommunityPage.tsx` (permit upload and status), `chats.ts` (removed messages), `UpdatesPage.tsx`; [`docs/KAN-52-event-permits-moderation.md`](docs/KAN-52-event-permits-moderation.md), screenshots in `docs/evidence/sprint-7-KAN-52-mounika/` (KAN-52) | Mounika |
| **Your profile and Settings** (`#/profile`, from **Your profile** in the yellow strip): who you are, what neighbours can see and what stays private, links to your requests, chats and listings; **Settings**: who can message me (Bhavana's rule), which **notifications** reach the bell (requests, messages, area alerts, community and school, Marketplace), and a **home area** (a public place, never an address) that area alerts and Marketplace distances follow. **Phone fix**: nothing scrolls sideways at 390 px. **Final merge** of KAN-51, KAN-53 and KAN-52; sample dates moved so events, the ward poll and the hydrant alert are still current for the final demo; a date-dependent school test fixed (KAN-50) | `src/features/profile/`, `getSettings` / `saveSettings` / `effectivePersona` / `getProfileSummary` in `src/data/api.ts`, `App.tsx`, `ViewAs.tsx`, `AppShell.css`; [`docs/KAN-50-profile-settings.md`](docs/KAN-50-profile-settings.md), screenshots in `docs/evidence/sprint-7-KAN-50-purab/` | Purab |

## Sprint 6 (Nov 2–8): user types, onboarding and Nigel's Nov 2 feedback

**Start here:** [`docs/sprint-6-purab-bhavana.md`](docs/sprint-6-purab-bhavana.md): what Nigel asked at office hours on Nov 2, what changed, a 5-minute walkthrough and screenshots (`docs/evidence/sprint-6/`).

**New for the demo:** [`docs/sprint-6-demo-features.md`](docs/sprint-6-demo-features.md): six features that give every user type the depth Nigel liked in the school workspace: "Me too" support, Corridor pulse and board report, roadwork impact for businesses, ward polls, "Was it fixed?", and area alerts. **Updates** (top bar) is now a real page.

**Team merge (Nov 8):** this build also has Mounika's KAN-48 ([`docs/KAN-48-community-journey.md`](docs/KAN-48-community-journey.md), screenshots in `docs/evidence/sprint-6-KAN-48-mounika/`) and Devu's KAN-47 ([`docs/KAN-47-request-outcomes-on-map.md`](docs/KAN-47-request-outcomes-on-map.md), screenshots in `docs/evidence/sprint-6-KAN-47-devu/`). Their screenshots were taken on their own branches before the merge, so the top bar there looks older.

The first visit opens **onboarding**: pick who you are joining as and you land on your own page. **Viewing as** (yellow strip) switches between 11 user types at any time; **Reset demo** goes back to the sample data.

### Progress note (Nov 8)

| Done | In progress this sprint | Next |
| --- | --- | --- |
| Onboarding with a landing per user type; one Viewing as for the whole app (10 user types); anyone can send requests, organizations too; post to the map or send privately; spot on the map; photo; demo kept after a refresh and Reset demo; "Me too" support; "Was it fixed?" (Purab). Councillor comments; senders see the organization only; notifications; due dates and overdue; moving a request to another team; "Sent by us" for the BIA; Corridor pulse and board report; area alerts (Bhavana). Roadwork impact for businesses (Devu) and ward polls (Mounika) on the new Updates page. Community events on the map, community groups send requests to the City, library service changes on the map (Mounika, KAN-48). Status on pins, "You said, we did", school requests to the City, school follows Viewing as (Devu, KAN-47). School notices reach parents' notifications (merge). 332 tests, 0 accessibility issues on the new screens. | Event permits approved by Neighbr staff (Mounika). Map posts that expire into notifications (Devu). Live demo link and real-user testing (Purab). | Week 8: refinements only: fix test findings, accessibility and phone pass, API contract, walkthrough video, handover. |

| Change | Where | Owner |
| --- | --- | --- |
| **Onboarding** (`#/welcome`) routes each user type to its own page; **Viewing as** with 10 user types drives every section (Community and School follow it); **Post to the map / Send privately**; **pick the spot on the map**; **photo** on a report; demo **kept after a refresh**, **Reset demo**; build ready for a live link | `src/app/Welcome.tsx`, `src/app/ViewAs.tsx`, `src/app/App.tsx`, `src/features/requests/personas.ts`, `src/features/report/`, end of `src/data/api.ts` | Purab |
| **Any organization can send a request** (BIA "Sent by us" tab); **ward councillor comments**; **senders see the organization only**; **notifications** bell; **due dates and overdue** warnings with Oldest first; **move a request to another team** with a reason | `src/features/requests/requests.ts`, `WorkQueue.tsx`, `RequestDetail.tsx`, `RequestsPage.tsx`, `src/app/Notifications.tsx`, `getNotifications` in `src/data/api.ts` | Bhavana |
| **"Me too"**: support a request already on the map instead of sending a duplicate; **"Was it fixed?"** rating | `src/features/report/ReportProblem.tsx`, `support` / `rate` in `src/features/requests/requests.ts`, `MyRequests.tsx`, `getSupportable` in `src/data/api.ts` | Purab |
| **Corridor pulse** (Insights tab) and **board report**; **area alerts** with reach and notifications | `src/features/requests/insightsData.ts`, `Insights.tsx`, alerts in `src/features/updates/` and `src/data/api.ts` | Bhavana |
| **Roadwork impact for businesses** with a "We're open" notice; the BIA's list of affected shops | `roadworkImpacts` in `src/features/updates/neighbourhood.ts`, `UpdatesPage.tsx`, `postOpenNotice` in `src/data/api.ts` | Devu |
| **Ward polls**: the councillor asks, residents vote once, "What happens next" | polls in `src/features/updates/neighbourhood.ts`, `UpdatesPage.tsx`, `createWardPoll` / `voteWardPoll` in `src/data/api.ts` | Mounika |
| **Community follows Viewing as** (Priya Nair, Sofia Mendes, Ms. Laurent open their own group as organizers); **community groups send requests to the City** (from the person, "for" the group); **approved events become map pins** until they are over; **library service changes** on the map for their dates (KAN-48) | `src/features/community/`, `submitOrgEvent` / `approveOrgEvent` / `submitOrgPost` and the event and service-change pins in `getMapData` (`src/data/api.ts`) | Mounika |
| **Status on request pins** in words; **"You said, we did"** tab with filters for the list and the pins; **school staff send requests to the City**; the **School section follows Viewing as** (KAN-47) | `src/features/map/requestStatus.ts`, `YouSaidWeDid.tsx`, `CorridorMap.tsx`, `MapPage.tsx`, `withRequestInfo` in `src/data/api.ts`, `src/features/school/` | Devu |
| **Merge (Nov 8)**: one set of user types for all three branches; the sender's "Post to the map / Send privately" choice added to the community and school request forms (an outcome reaches the map only if the sender put it there); events, service changes and school notices kept after a refresh and cleared by Reset demo; school notices for parents now reach the parent's notifications | `src/features/community/CommunityPage.tsx`, `src/features/school/`, `src/data/api.ts` | Purab |

## Sprint 5 (Oct 26 – Nov 1): connected journeys

**Start here:** [`docs/sprint-5-connected-journey.md`](docs/sprint-5-connected-journey.md). It answers Nigel's Week 6 message: the walkthrough of one complete journey (resident → City 311 → resident, and business → BIA → business), what happens when a request is declined, needs more information or someone isn't allowed, what we tested and changed, what works / is simulated / remains, and the plan to the final deliverable.

To follow it in the app: `npm run dev`, then use **Viewing as** (yellow strip under the top bar) to switch between the resident, the business owner, City 311 staff, the BIA coordinator and the councillor. Sign-in is simulated.

### Progress note

| Done this sprint | In progress / gaps | Next (Sprint 6, Nov 2–8) |
| --- | --- | --- |
| Requests from start to finish: work queue for City 311 and the BIA, My requests for senders, assign, ask, answer, decline, resolve, reopen, publish outcome; who can see and change, with a record; 35 new tests; accessibility scan 0 issues. Community organization workspace (KAN-42). School workspace with roadwork alert, safe routes and parent notices, plus a School safe routes map layer (KAN-43). | Not yet tested with real residents or staff (team tests, Purab's manual run and automated tests only). Community and School still have their own demo role switches instead of **Viewing as**; schools have no request flow of their own yet. Demo data resets on refresh. | Test both journeys with at least 3 residents or business owners and 1 staff role-play; fix findings; notifications for senders; BIA referral to the City; outcome style on map pins. |

| Change | Where | Owner |
| --- | --- | --- |
| **Requests: one request from start to finish.** Reports become requests; rules for who can see and change each one and why not; every action recorded (blocked attempts too, staff only); reopen within 14 days; **Viewing as** demo sign-in; **My requests** for residents and businesses (answer a question, follow up, reopen, withdraw); status reaches the map and published outcomes become public. | `src/features/requests/requests.ts`, `personas.ts`, `MyRequests.tsx`, `src/app/ViewAs.tsx`, `getRequests` / `actOnRequest` / `getStaff` in `src/data/api.ts` | Purab |
| **Organization workspace** (institution dashboard) for City of Windsor 311 and the Olde Riverside BIA: work queue with counts and filters, acknowledge, assign within the team, ask for more information, send updates, decline with a reason, resolve, internal notes, publish the outcome; locked actions explained; read-only copies for the ward councillor. | `src/features/requests/WorkQueue.tsx`, `RequestDetail.tsx`, `Requests.css`; demo staff and requests in `src/data/mock-data.json` | Bhavana |
| **Community** section (`#/community`) for community groups, food banks, schools and libraries: events with Create event (private until an organizer approves), volunteer roles with sign-ups, members list with the map's search and chips (members only), public/private box. Four demo organizations, members and roles in the data. | `src/features/community/`, new lists in `src/data/mock-data.json`, `getOrganizations` / `getOrgMembers` / `getVolunteerRoles` / `getOrgEvents` in `src/data/api.ts` (KAN-42) | Mounika |
| **School workspace** inside the Community section (pick the school): a **roadwork alert** when public roadwork is near the school or a safe walking route, two **safe walking routes** with crosswalks, **notices and events** for the public, all parents or one grade, and a **Public / Parent / Staff** view where only staff can post. On the map, a new **School safe routes** layer draws the school area, the routes (dashed and labelled when roadwork is near) and the crosswalks. No student information anywhere. | `src/features/school/`, `src/features/map/` (layer, `CorridorMap.tsx`, `MapPage.tsx`), new lists `schools` and `schoolNotices` in `src/data/mock-data.json`, `getSchools` / `getSchoolNotices` in `src/data/api.ts` (KAN-43) | Devu |

Details and screenshots: `docs/sprint-5-connected-journey.md` and `docs/evidence/sprint-5-journey/` (requests); `docs/KAN-42-community-workspace.md` and `docs/evidence/sprint-5/` 01–09 (community); `docs/KAN-43-school-workspace.md` and `docs/evidence/sprint-5/` 10–15 (school).

## Sprint 4 (Oct 19–25): resident at the centre

Following Nigel's feedback at office hours on Oct 19: everything centres on the resident; a resident's problem (pothole, street light) goes to the City or ward councillor, not the BIA; a business sits in the BIA corridor while its owner is a resident of the city.

| Change | Where | Owner |
| --- | --- | --- |
| **Report a problem**: resident reports go to City of Windsor 311 with a copy to the ward councillor; business requests go to the BIA. The form shows who receives it before sending; the report appears straight away as a private pin, on its card and under My reports. | `src/features/report/`, `submitReport` in `src/data/api.ts` (KAN-35) | Purab |
| Business posts and offers layer, BIA polls with demo voting, ward area outline, private requests kept off the public map | `src/features/map/extras.ts`, `polls.ts` | Devu |
| Owner and business profiles separated in the data; councillor, City and MP responder profiles; profile fields table; resident interview guide | `src/data/mock-data.json`, `docs/profile-fields.md`, `docs/resident-interview-guide.md` (KAN-36) | Mounika |
| Resident profile as home base (Coming up for you, My reports, who to contact); owner shown separately from the business; "Sent to" on report cards | `src/features/cards/` (KAN-37) | Bhavana |

Details: `docs/KAN-35-report-a-problem.md`, `docs/map-additions-oct20.md`, `docs/KAN-37-resident-centre.md`.

### Evidence: Report a problem (KAN-35)

Screenshots from the running app, in `docs/evidence/sprint-4/`.

| Screenshot | Shows |
| --- | --- |
| [01-report-button](docs/evidence/sprint-4/01-report-button.png) | The **Report a problem** button on the map, with the ward area outline |
| [02-form-open](docs/evidence/sprint-4/02-form-open.png) | The form: what the problem is, where it is, optional details |
| [03-form-routing-city](docs/evidence/sprint-4/03-form-routing-city.png) | Street light out goes to **City of Windsor 311** with a copy to the **Ward Councillor**, not the BIA, and stays private |
| [04-report-sent](docs/evidence/sprint-4/04-report-sent.png) | Confirmation naming who received it, at the Reported step |
| [05-my-reports-and-pin](docs/evidence/sprint-4/05-my-reports-and-pin.png) | The new report under **My reports** and its pin on the map (Reported / Acknowledged / Resolved, "Goes to") |
| [06-business-request-bia](docs/evidence/sprint-4/06-business-request-bia.png) | In My business mode, a business request goes to **Olde Riverside BIA** |

## Week 3 deliverables and where they are

| Deliverable | What we built | Where | Owner |
| --- | --- | --- | --- |
| Responsive map shell and navigation | Top bar with Map, Updates, Chats, Marketplace; bottom navigation on phones; map panel becomes a bottom sheet on phones; placeholder pages for later sections | `src/app/`, `src/features/map/MapPage.*` | Purab |
| User/profile presence, pins and activity cards | Signed-in demo resident with Resident badge and a Me / My business switch in the top bar; optional "you are here" marker; typed pins with clustering and a selected-pin popup; place and profile cards; activity cards for events, offers, updates and issues (with progress ring) in an Around you list; cards and pins linked both ways | `src/app/`, `src/features/map/CorridorMap.tsx`, `src/features/search/`, `src/features/cards/` | Purab, Devu, Mounika, Bhavana |
| Filters, search and layer controls | Search box (Enter flies to the first result), filter chips including Vacant, five layer toggles in a collapsible box | `src/features/search/`, `src/features/map/CorridorMap.tsx` | Mounika, Devu, Purab |
| Mock-data adapters and map-state evidence | Mock dataset; one adapter (`api.ts`) that every screen uses, ready to swap for the real backend; map state (centre, zoom, layers, selected pin) saved in the URL | `src/data/`, `src/features/map/urlState.ts` | Mounika, Purab, Devu |

## Project layout

```
src/
  app/                 shell, navigation, routes, phone detection, onboarding, Viewing as (Purab); notifications (Bhavana)
  data/
    mock-data.json     illustrative places, events, updates, issues, profiles (Mounika)
    api.ts             mock-data adapter: getMapData, getPlaces, getProfiles, getCurrentUser... (Purab)
  features/
    map/               MapLibre corridor map, pins, clusters, layers, URL state (Devu)
    search/            search box, filter chips, result cards (Mounika)
    cards/             presence, place, activity and profile cards, Around you, card-pin linking (Bhavana)
    report/            Report a problem: form, routing to City / councillor / BIA (Purab, KAN-35)
    community/         Community workspace: organizations, events, volunteer roles, members (Mounika, KAN-42); requests to the City, events and service changes on the map (KAN-48)
    requests/          Requests: rules, My requests (Purab), organization work queue (Bhavana), Sprint 5
    school/            School workspace: roadwork alert, safe walking routes, parent notices (Devu, KAN-43); requests to the City (KAN-47)
    updates/           Updates page: area alerts (Bhavana), ward polls (Mounika), roadwork impact for businesses (Devu), recently fixed (Sprint 6)
    chats/             Chats: request chats, organization chats, block, report (Bhavana, KAN-51)
    marketplace/       Marketplace: listings, search and filters, map pins, expiring posts (Devu, KAN-53)
    moderation/        Review for Neighbr staff: event permits, reported content (Mounika, KAN-52)
    profile/           Your profile and Settings (Purab, KAN-50)
```

## How the pieces connect

- `App.tsx` reads the section from the URL hash (`#/map`, `#/chats` ...) and wraps it in `AppShell`.
- `MapPage` loads data through `api.ts`, then gives it to the search panel and the map.
- The search panel sends the filtered items to the map, so pins and cards always match.
- Clicking a card or pin selects it; the map flies to it and the URL updates (`?c=lng,lat&z=zoom&l=layers&pin=id`), so a shared link restores the same view.
- "Report a problem" builds and routes the report in `features/report/routing.ts`, stores it with `submitReport()` in `api.ts`, and `api.ts` tells the map page to reload, so the new pin and card appear at once.
- Every report also becomes a **request** (`actOnRequest` / `getRequests` in `api.ts`, rules in `features/requests/requests.ts`). Staff actions change the request, the change reaches the pin's status on the map, and a published outcome makes the pin public.
- To connect the real backend later, change only the function bodies in `src/data/api.ts`. The server must repeat the checks in `requests.ts` (who can see and change a request).

## Accessibility

Visible focus outlines, labelled controls, `aria-current` on the active section, `aria-expanded` on the Layers and list toggles, a skip link, pins that show a letter as well as a colour, and touch targets of at least 40px.

## Who built what

| Member | Contribution |
| --- | --- |
| Purab Singh Mohan | App shell and navigation, phone layout and bottom sheet, visual design (type, colours, street-directory result list, pins and popup), collapsible Layers box, mock-data adapter, pin placement script, shell and adapter tests; Report a problem with routing to City / councillor / BIA and its tests (KAN-35); requests from start to finish: rules for who can see and change, the record, Viewing as demo sign-in, My requests (Sprint 5); integration and README; Sprint 6: onboarding per user type, Viewing as for 10 user types, post to the map or send privately, spot on the map, photo, demo kept after refresh, "Me too" support, "Was it fixed?"; Sprint 7: Your profile and Settings, phone layout fix, final merge and demo script (KAN-50) |
| Devu Babu Sheeja | Corridor map (MapLibre, OSM basemap), typed pins and clusters, layer toggles, selected-pin popup with issue steps, URL map state, map tests (KAN-7); business posts layer, BIA polls, ward outline, private requests kept off the map; school workspace and School safe routes map layer (KAN-43); roadwork impact for businesses (Sprint 6); status on request pins, "You said, we did", school requests to the City, School following Viewing as (KAN-47); Marketplace and expiring map posts (KAN-53) |
| Mounika Boggarapu | Mock dataset, search, filter chips, result cards, search tests (KAN-9); owner and business profiles, responder profiles, profile fields table, resident interview guide (KAN-36); Community organization workspace with events, volunteer roles and members (KAN-42); ward polls (Sprint 6); community groups in Viewing as, requests to the City from a group, community events and library service changes on the map (KAN-48); Neighbr staff user type, event permits and the reported content queue (KAN-52) |
| Bhavana Volati | User presence (Me / My business switch, "you are here" marker), place cards, activity cards with issue progress ring, Around you list, two-way card and pin linking (tasks 9–12); profile cards for resident, business and BIA connected to the map (avatar, "View full profile", "Raised by", BIA corridor highlight); accessibility check and fixes (`docs/accessibility-check.md`); resident home base and owner separated from business (KAN-37); organization workspace for City 311 and the BIA: work queue, staff actions, locked actions, councillor copies (Sprint 5); organizations as senders, councillor comments, notifications, due dates and overdue, moving requests between teams, Corridor pulse and board report, area alerts (Sprint 6); Chats with request chats, organization chats, block, report and "Who can message me" (KAN-51); card and profile tests |

## Notes

- **Why the filter chips and the Layers box show different counts:** the chips group items by what they are (Updates, Issues), while the map layers give roadworks their own **Roadwork** layer. So the sidewalk-work notice counts under the Updates chip but in the Roadwork layer, not Public updates.
- **Private reports:** reports marked "private until approved" only appear (list, pins, cards) for the person who raised them. Switch between Me and My business to see the difference.
- **The demo is saved in this browser** (Sprint 6): reports, requests, staff actions, notifications read and the person chosen in Viewing as survive a refresh. **Reset demo** in the yellow strip goes back to the sample data. With a real backend, `submitReport` and `actOnRequest` become API calls.

- All names, places, events and coordinates are illustrative demo data.
- Basemap: OpenFreeMap "Positron" (free, no API key, OpenStreetMap data). If it can't load, the map switches to standard OpenStreetMap tiles automatically.
