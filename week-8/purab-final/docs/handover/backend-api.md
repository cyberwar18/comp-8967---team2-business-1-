# Backend handover: the data functions

Every screen gets and changes its data through one file, [`src/data/api.ts`](../../src/data/api.ts). Today it reads the sample data in `src/data/mock-data.json` and keeps changes in the browser. To connect Neighbr's backend, replace the body of each function below with a call to your API and keep its name and return type: no screen needs to change.

The **suggested endpoint** column is only a starting point for your team. The **rules that must move to the server** are listed after the tables: in the demo they are enforced in the browser, which is fine for a prototype but not for real data.

## Map and places

Built by: Devu (map), Mounika (search data)

| Function | Arguments | Suggested endpoint | Notes |
| --- | --- | --- | --- |
| `getMapData` | `(none)` | `GET /map?area=` | Everything the map shows: places, events, updates, issue pins, request pins with their status, listings, event pins |
| `getPlaces` | `(none)` | `GET /places` |  |
| `getEvents` | `(none)` | `GET /events` |  |
| `getUpdates` | `(none)` | `GET /updates` |  |
| `getWards` | `(none)` | `GET /wards` | Ward outline |
| `getListingPins` | `(none)` | `GET /listings?onMap=true` | Marketplace pins at public meeting spots |

## People, profiles and settings

Built by: Purab, Bhavana, Mounika

| Function | Arguments | Suggested endpoint | Notes |
| --- | --- | --- | --- |
| `getCurrentUser` | `(none)` | `GET /me` |  |
| `getProfiles` | `(none)` | `GET /profiles` | Public fields only for other people |
| `getProfileSummary` | `persona` | `GET /me/summary` | Counts for the profile page |
| `getSettings` | `persona` | `GET /me/settings` |  |
| `saveSettings` | `persona, next` | `PUT /me/settings` | Validated: home area must be a public place |
| `effectivePersona` | `persona` | `(client)` | Applies the home area; keep on the client |
| `getHomePlaces` | `(none)` | `GET /places?public=true` | Places a person may pick as home area |
| `getStaff` | `(none)` | `GET /orgs/:id/staff` | Staff only; never sent to residents |
| `orgNames` | `(none)` | `GET /orgs?fields=name` |  |

## Requests (report, follow, handle)

Built by: Purab (rules, sender side), Bhavana (staff side)

| Function | Arguments | Suggested endpoint | Notes |
| --- | --- | --- | --- |
| `submitReport` | `report` | `POST /requests` | Sender chooses public or private |
| `getRequests` | `persona` | `GET /requests` | Filtered by who is asking: sender, staff of the receiving org, copy holder, supporter |
| `actOnRequest` | `id, persona, action, input` | `POST /requests/:id/actions` | acknowledge, assign, update, ask-info, resolve, decline, publish, reply, reopen, withdraw, support, rate, comment, note |
| `getSupportable` | `persona` | `GET /requests?near=&category=` | Open public requests a person can support instead of a duplicate |
| `getRecentlyFixed` | `(none)` | `GET /requests?state=resolved&public=true` |  |
| `markRequestRead` | `persona, requestId` | `POST /requests/:id/read` |  |

## Notifications

Built by: Bhavana, with parts from everyone

| Function | Arguments | Suggested endpoint | Notes |
| --- | --- | --- | --- |
| `getNotifications` | `persona` | `GET /me/notifications` | Requests, chats, area alerts, school notices, Neighbr staff decisions, ended posts; respects Settings |
| `markNotificationRead` | `id` | `POST /me/notifications/:id/read` |  |

## Updates page

Built by: Bhavana (alerts), Mounika (polls), Devu (roadwork impact)

| Function | Arguments | Suggested endpoint | Notes |
| --- | --- | --- | --- |
| `getAlerts` | `persona` | `GET /alerts` |  |
| `sendAreaAlert` | `persona, draft` | `POST /alerts` | City lead, BIA lead, councillor |
| `alertReach` | `alert, 'center' | 'radiusM' | 'audience' | 'fromProfile'>` | `GET /alerts/reach?center=&radius=` | How many people an alert would reach |
| `getWardPolls` | `(none)` | `GET /polls` |  |
| `createWardPoll` | `persona, draft` | `POST /polls` | Councillor |
| `voteWardPoll` | `persona, pollId, optionId` | `POST /polls/:id/votes` | Residents only, once |
| `postOpenNotice` | `persona, placeId, text, endsOn?` | `POST /businesses/:id/notices` | "We're open" during roadwork |
| `getOffers` | `(none)` | `GET /offers` |  |
| `getPosts` | `(none)` | `GET /posts` |  |
| `getPolls` | `(none)` | `GET /bia/polls` |  |

## Community, school and library

Built by: Mounika (community), Devu (school)

| Function | Arguments | Suggested endpoint | Notes |
| --- | --- | --- | --- |
| `getOrganizations` | `(none)` | `GET /orgs` |  |
| `getOrgMembers` | `(none)` | `GET /orgs/:id/members` | Members only |
| `getVolunteerRoles` | `(none)` | `GET /orgs/:id/roles` |  |
| `getOrgEvents` | `(none)` | `GET /orgs/:id/events` | Pending events visible to the creator and organizers only |
| `submitOrgEvent` | `ev` | `POST /orgs/:id/events` | Public-space events need a permit upload |
| `approveOrgEvent` | `id, viewer` | `POST /orgs/:id/events/:eventId/approve` | Organizer step |
| `getOrgPosts` | `(none)` | `GET /orgs/:id/posts` | Library service changes |
| `submitOrgPost` | `post, poster` | `POST /orgs/:id/posts` |  |
| `getSchools` | `(none)` | `GET /schools` |  |
| `getSchoolNotices` | `(none)` | `GET /schools/:id/notices` | Filtered by audience: public, parents, one grade |
| `postSchoolNotice` | `persona, notice` | `POST /schools/:id/notices` | School staff only |

## Chats

Built by: Bhavana

| Function | Arguments | Suggested endpoint | Notes |
| --- | --- | --- | --- |
| `getChats` | `persona` | `GET /me/chats` |  |
| `getChat` | `persona, chatId` | `GET /chats/:id` |  |
| `getUnreadChatCount` | `persona` | `GET /me/chats/unread` |  |
| `getChatContacts` | `persona` | `GET /me/contacts` | Who this person may start a chat with |
| `openRequestChat` | `persona, requestId` | `POST /requests/:id/chat` | Sender and the receiving organization; staff names hidden from the sender |
| `startChat` | `persona, to, text?, toName?` | `POST /chats` |  |
| `sendMessage` | `persona, chatId, text` | `POST /chats/:id/messages` |  |
| `markChatRead` | `persona, chatId` | `POST /chats/:id/read` |  |
| `blockInChat` | `persona, chatId` | `POST /chats/:id/block` |  |
| `unblockInChat` | `persona, chatId` | `DELETE /chats/:id/block` |  |
| `getMessageSetting` | `persona` | `GET /me/settings/messages` |  |
| `setMessageSetting` | `persona, value` | `PUT /me/settings/messages` | Anyone, only my organizations, nobody new |
| `reportMessage` | `persona, chatId, messageId, reason, note = ''` | `POST /messages/:id/reports` |  |
| `getMessageReports` | `(none)` | `GET /moderation/messages` | Neighbr staff |

## Marketplace

Built by: Devu

| Function | Arguments | Suggested endpoint | Notes |
| --- | --- | --- | --- |
| `getMarketAreas` | `(none)` | `GET /market/areas` | Public meeting spots |
| `getListings` | `persona` | `GET /listings` |  |
| `createListing` | `persona, draft` | `POST /listings` |  |
| `endListing` | `persona, id, how` | `POST /listings/:id/end` |  |
| `relistListing` | `persona, id, days` | `POST /listings/:id/relist` |  |
| `messageSeller` | `persona, listingId` | `POST /listings/:id/chat` | Opens a chat |
| `reportListing` | `persona, listingId, reason, note = ''` | `POST /listings/:id/reports` |  |
| `getListingReports` | `(none)` | `GET /moderation/listings` |  |
| `resolveListingReport` | `reportId, status` | `POST /moderation/listings/:id` |  |

## Neighbr staff review

Built by: Mounika

| Function | Arguments | Suggested endpoint | Notes |
| --- | --- | --- | --- |
| `getPermitQueue` | `persona` | `GET /moderation/permits` | Neighbr staff only |
| `decidePermit` | `persona, eventId, decision, text = ''` | `POST /moderation/permits/:id` | Approve, decline with a reason, ask for more information |
| `answerPermit` | `viewer, eventId, reply` | `POST /orgs/:id/events/:eventId/permit-answer` | Organizer answers a question |
| `getReportQueue` | `persona` | `GET /moderation/reports` |  |
| `getOpenReportCount` | `persona` | `GET /moderation/reports/count` |  |
| `reportPost` | `persona, postId, reason, note = ''` | `POST /posts/:id/reports` |  |
| `resolveReport` | `persona, kind, reportId, status` | `POST /moderation/reports/:id` | Hide or keep |

## Demo only (remove with a real backend)

Built by: Purab

| Function | Arguments | Suggested endpoint | Notes |
| --- | --- | --- | --- |
| `onDataChange` | `fn` | `(client) live updates` | Replace with websockets or polling |
| `resetDemo` | `(none)` | `(demo)` | Reset demo button |
| `clearSubmittedReports` | `(none)` | `(tests)` |  |
| `setClockForTests` | `fn` | `(tests)` |  |

## Rules that must move to the server

These are the promises PinPoint makes to people. The demo enforces them in `src/data/api.ts` and `src/features/requests/requests.ts`; a real backend must enforce them itself, never trusting the app.

1. **Private stays private.** A request sent privately is seen only by the sender and the receiving organization's staff (and a copy holder such as the councillor). Its outcome never goes on the map (`accessOf`, `getRequests`).
2. **Senders see the organization, not staff names.** Staff names, titles and internal notes are removed before anything reaches a sender or supporter (`historyFor`, `whoText`).
3. **Who may do what.** Every action is checked by `can()` in `requests.ts` (for example, only a lead can assign or decline; only the sender can rate). The server needs the same checks and should return the same plain-language reasons.
4. **Supporters stay anonymous** to everyone except staff.
5. **School notices by audience.** Parent and grade notices only reach parents of that school (and grade). No student information is stored anywhere.
6. **Public-space events need a permit** approved by the organizer and then by Neighbr staff before they appear on the map (`moderation/permits.ts`).
7. **Meeting spots, never homes.** Marketplace pins and home areas are public places from a fixed list; no home address is ever stored or shown.
8. **Messaging settings.** "Who can message me" and blocks are checked before a chat starts or a message is delivered.

## Where the rules live

| Area | Rules file | Tests |
| --- | --- | --- |
| Requests | `src/features/requests/requests.ts` | `requests.test.ts`, `sprint6.test.ts` |
| Chats | `src/features/chats/chats.ts` | `chats.test.ts` |
| Marketplace | `src/features/marketplace/marketplace.ts` | `marketplace.test.ts` |
| Permits and moderation | `src/features/moderation/permits.ts` | `permits.test.ts` |
| Community | `src/features/community/communityData.ts` | `communityData.test.ts` |
| School | `src/features/school/schoolData.ts` | `schoolData.test.ts` |
| Updates | `src/features/updates/neighbourhood.ts` | `neighbourhood.test.ts` |
| Profile and settings | `src/features/profile/settings.ts` | `profile.test.ts` |

The rules files are plain TypeScript with no screen code, so they can be reused on a Node backend as they are.

## Sign-in (Week 8)

The prototype signs in on the front end only (`src/app/auth.ts`): the demo accounts and passwords ship with the app, so they protect nothing. To connect it to Neighbr:

| Prototype | Replace with |
|---|---|
| `signInWith(email, password)` | `POST /auth/sign-in`, checked on the server; returns a session (HTTP-only cookie or token) and the person's id |
| `currentAccountId()` | `GET /auth/me` |
| `signOut()` | `POST /auth/sign-out` |
| 5 wrong tries, then a 30-second wait (in the browser) | Rate-limit on the server, per account and per IP |
| `admin` account that can view as anyone | A staff-only "view as" permission, logged every time it is used |

Keep the same message for an unknown email and a wrong password, so the form never reveals which emails have accounts.
