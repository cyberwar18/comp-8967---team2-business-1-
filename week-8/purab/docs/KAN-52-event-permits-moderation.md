# KAN-52: Event permits and Neighbr moderation (Mounika)

Sprint 7 (Nov 9–15). Parent epic KAN-17 (Research, Data and Search). Built on `pinpoint-sprint7-KAN-53` (which includes Bhavana's Chats and Devu's Marketplace). All names, permits and reports are illustrative.

Nigel (Nov 2): events in public spaces (a park, the street) need a permit, uploaded and approved by Neighbr staff, before they go on the map. Chats, listings and posts that people report need someone to decide. This ticket adds **Neighbr staff** as a user type and the two queues they work from.

## What it does

| Ticket item | What you see | Where |
| --- | --- | --- |
| **New Neighbr staff user type** in Viewing as (Taylor Brooks) | Lands on a new **Review** page. Review shows in the top bar only for Neighbr staff. Everyone else who opens `#/review` is told it is for Neighbr staff | `personas.ts`, `Welcome.tsx`, `routes.ts`, `AppShell.tsx`, `App.tsx` |
| **Event permits**: an event in a public place needs a permit upload | In **Create event**, choosing a park (or any place in a public-space category) shows a **Permit** upload (PDF, JPG or PNG, up to 5 MB). Without one the event is not sent, and the error says why. A hall, a shop or an online event needs no permit | `permits.ts` (`needsPermit`, `validatePermitFile`), `EventForm` in `CommunityPage.tsx`, `submitOrgEvent` in `api.ts` |
| **Organizer approval, then Neighbr staff approval, then the map pin** | An organizer approves as before, but a permit event then goes to Neighbr staff instead of the map. The event row says where the permit is: *Waiting for approval → With Neighbr staff → Permit approved*. Only after staff approve is it public and on the map until it ends | `approveOrgEvent`, `allOrgEvents` in `api.ts`; `canApprove` in `communityData.ts` |
| **Permit queue**: Approve, Decline with a reason, Ask for more information | Review → **Event permits**: *Needs review*, *Waiting for the group*, *Decided*. Each card shows the group, date, place, permit file and a history. **Decline** and **Ask** need text (at least 10 characters), shown to the group | `ModerationPage.tsx`, `decidePermit` in `api.ts` |
| The group answers | After a question, an organizer writes an answer (and can attach a new file); after a decline, an organizer sends it again with a new permit. Either way it goes back to staff. Volunteers and other groups cannot | `answerPermit`, `PermitStatus` / `AnswerForm` in `CommunityPage.tsx` |
| **Reported content queue**: chats, listings and posts that users report | Review → **Reported content**: one list with kind chips (All, Chats, Listings, Posts) and status chips (Needs a decision, Decided, All). Each card has a copy of the content, the reason, the reporter's note, who wrote it and who reported it | `reports.ts`, `getReportQueue`, `ModerationPage.tsx` |
| **Hide or keep** | **Hide**: a chat message is replaced by "This message was removed by Neighbr staff." for both people; a listing leaves the Marketplace and the map (Devu's `resolveListingReport`); a post leaves the map. **Keep** leaves it up. A report is decided once, and other open reports about the same thing get the same decision | `resolveReport`, `viewFor` in `chats.ts` |
| **Reporting a business post** (new) | **Report this post** on the Updates page (new section *Posts from local businesses*) and in the map popup of a business post. Not your own post, not twice | `reportPost`, `PostsSection` in `UpdatesPage.tsx`, `CorridorMap.tsx` |
| **Senders get notified of every decision** | Permit: the organizer who sent it and the person who made the event get a bell notification for approve, decline (with the reason) and ask (with the question). Reports: the person who reported hears the outcome; if it was hidden, so does the person it was about | `decisionNotifications` in `api.ts` |

## Privacy and permission rules (each one has a test)

| Rule | Where it's checked |
| --- | --- |
| Only Neighbr staff open the queues, decide on permits and decide on reports | `requireStaff` in `api.ts`; the Review page also checks |
| An event in a public space cannot be sent without a valid permit file | `needsPermit`, `validatePermitFile`, `submitOrgEvent` |
| A permit event is never public or on the map until Neighbr staff approve the permit | `allOrgEvents`, `eventOnMap` |
| Once an organizer has sent a permit to staff, only staff decide | `canApprove` |
| Decline and Ask need a message the group can read | `validateDecision` |
| Only an organizer of the same group answers staff | `canAnswer` |
| The group sees "Neighbr staff", never a staff name | `STAGE_LABEL`, `decisionNotice` |
| Staff see who reported something; the person it is about never does | `hiddenNotice`, `reporterNotice` |
| A report is decided once | `resolveReport` |

## For the team (shared files I touched)

| File | What changed | Owner |
| --- | --- | --- |
| `src/data/api.ts` | Permit and report functions at the end; `allOrgEvents`, `submitOrgEvent`, `approveOrgEvent` handle permits; `getPosts` skips hidden posts; notifications and save/reset include moderation | Purab's file |
| `src/features/requests/personas.ts`, `src/app/Welcome.tsx`, `src/app/ViewAs.tsx` (no change), `src/app/routes.ts`, `AppShell.tsx` / `.css`, `App.tsx` | Neighbr staff person (11 user types now), **Review** route shown only to staff, seven items fit the phone bottom bar | Purab's files |
| `src/features/chats/chats.ts`, `ChatsPage.tsx`, `Chats.css` | A message hidden by staff shows as removed (`removed: true`) and cannot be reported again | Bhavana's files |
| `src/features/updates/UpdatesPage.tsx`, `Updates.css`, `src/features/map/CorridorMap.tsx` | Report a business post: new section and a popup link | Bhavana's and Devu's files |
| `src/data/mock-data.json` | Sample event with a permit waiting for staff (`oe-06`, Parkette bench painting day) | shared |
| Tests | `shell.test.tsx` (Review only for staff), `sprint6.test.ts` (landing `review`), `CommunityPage.test.tsx` (the old event test now uses the hall, a park needs a permit) | shared |

## Try it

1. **Viewing as → Taylor Brooks, Neighbr staff**: Review → the sample permit. Approve it, then look at the map (the event appears) and, as Priya Nair, the bell.
2. **Reset demo**. As **Priya Nair**: Community → Create event → Where: **Thompson Parkette**. Try to send without a permit, then upload any PDF. Approve it as Priya, then Decline it as Taylor (with a reason) and read it as Priya.
3. As the **resident**: Marketplace → a listing → Report this listing; Chats → Jamie K. → Report; Updates → Report this post. As **Taylor**: Review → Reported content → Hide / Keep. Open Chats again as the resident to see the removed message.

## Checks

- **80 new tests** (`permits.test.ts` 25, `reports.test.ts` 10, `moderationApi.test.ts` 23, `ModerationPage.test.tsx` 14, 8 in `CommunityPage.test.tsx`). **517 tests pass** in total (437 before). Type check and production build pass.
- Browser run (Chromium): the whole permit journey, the report journey, phone layout. **axe-core (WCAG 2.1 A/AA): 0 issues on 9 screens** (Review permits, decline form, event form with error, permit status in Community, Reported content, Report a post, chat with a removed message, phone Review).
- Map screenshots use a plain background because the sandbox cannot load map tiles.

## Screenshots (`docs/evidence/sprint-7-KAN-52-mounika/`)

| # | Shows |
| --- | --- |
| 01 | Neighbr staff: Review, the permit waiting |
| 02–03 | Create event in a park: the Permit upload, and the error without one |
| 04 | An organizer approves: "Neighbr staff now check its permit" |
| 05 | Staff decline with a reason |
| 06–07 | The group sees the reason and the question, and answers |
| 08 | The group's notifications for the decisions |
| 09–10 | Staff approve; the event is on the map |
| 11–12 | The resident reports a listing and a business post |
| 13–14 | Reported content queue, and decided reports |
| 15–16 | The removed chat message; the reporter's notifications |
| 17 | Phone layout of Review |

## Still to decide

- A real backend would store the permit file; the demo keeps only its name, size and type.
- Which place categories count as public space (`PUBLIC_SPACE_CATEGORIES` in `permits.ts`); today only the park does.
