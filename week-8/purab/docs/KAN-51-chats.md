# KAN-51: People and organizations can message each other safely (Bhavana)

Sprint 7 (Nov 9–15). Parent epic KAN-18. Built on `pinpoint-sprint6-team-merged`. All messages and names are illustrative.

Open **Chats** in the top bar (`#/chats`). It follows **Viewing as**, so you can switch between the two sides of a chat.

## What it does

| Ticket item | What you see | Where |
| --- | --- | --- |
| **Chats page** (`#/chats`) | Conversation list with "N new" and the last message, the conversation, a send box, **New message** | `src/features/chats/ChatsPage.tsx`, `Chats.css` |
| **Chat linked to a request** | On a request: **Message City of Windsor 311 about this request** (sender) or **Message the sender about this request** (staff). Opens one chat per request. The sender sees the **organization**, never staff names; staff see which colleague wrote | `RequestDetail.tsx`, `openRequestChat` in `src/data/api.ts` |
| **Organization chats** | A community group, school, library or the BIA can message its members (**New message → To**). Members can message their organizations | `orgChatMembers` in `mock-data.json`, `contactsFor` in `chats.ts` |
| **Safety: block** | **Block …** in a direct or organization chat, with a confirm step. The blocked person is told only "… isn't accepting messages from you", never that they were blocked. **Unblock** any time. Chats about a request can't be blocked (report a message, or withdraw the request) | `canStart`, `canSend`, `canBlock` in `chats.ts` |
| **Safety: report** | **Report** on every message from the other side: reason + optional note. It goes to Neighbr staff; the sender isn't told who reported it | `reportMessage`, `getMessageReports` |
| **"Who can message me"** | Anyone / Only organizations I belong to / Nobody new. Chats about your requests always work | `getMessageSetting`, `setMessageSetting` |
| **Notification bell** | "New message from City of Windsor 311" (one line per chat). Opening the chat clears it | `chatNotifications` in `api.ts` |

Privacy is enforced in the data layer, not only on screen: every function returns a `ChatView` built by `viewFor`, so staff names and staff ids never reach someone outside the organization's browser. A test checks the JSON.

## Sample chats (Reset demo brings them back)

| Chat | Between | Try it as |
| --- | --- | --- |
| Pothole on Wyandotte at Pierre Ave | Maya R. ↔ City of Windsor 311 (about her request) | Maya R., then Jordan Lee |
| Sidewalk closed in front of the bakery | Rosa's Bakery ↔ Olde Riverside BIA (about her request) | Rosa's Bakery, then Alex Moreau |
| Riverside Neighbours Network | Team 2 Group 10 ↔ the group (Priya Nair) | Team 2 Group 10, then Priya Nair |
| Riverside Public School | Maya R. ↔ the school (Ms. Laurent) | Maya R., then Ms. Laurent |
| Jamie K. | A scam message to Team 2 Group 10, to show **Report** and **Block** | Team 2 Group 10 |

## For the team (functions you can call)

| Who | Use | Function (`src/data/api.ts`) |
| --- | --- | --- |
| Purab, KAN-50 settings page | "Who can message me" | `getMessageSetting(persona)`, `setMessageSetting(persona, 'anyone' \| 'organizations' \| 'nobody')` |
| Devu, KAN-53 "Message the seller" | Start or continue a chat with the seller, then go to `#/chats?c=<id>` | `startChat(persona, sellerProfileId, firstMessage?, sellerName?)` (throws with a reason if blocked or not accepting messages) |
| Mounika, KAN-52 reported content queue | Reported messages, newest first, with reason, note and a copy of the text | `getMessageReports()` (status `open`; add hide/keep there) |

## Checks

- **32 new tests** (`chats.test.ts` 23, `ChatsPage.test.tsx` 9). **364 tests pass** in total (332 before). Type check and production build pass.
- One existing test updated: the resident's bell now has 4 new items (the sample chat from Jamie K.).
- Browser run (Chromium): report, block, unblock, request chat from both sides, organization new message, bell, phone layout (390 px, no sideways scrolling). **axe-core (WCAG 2.1 A/AA): 0 issues on 6 screens.**
- Fixed during testing: a double full stop after names like "Jamie K."; people known only from a chat showed as "Someone"; the chat list overflowed on phones.

Screenshots in `docs/evidence/sprint-7-KAN-51-bhavana/`:

| # | Shows |
| --- | --- |
| 01 | Resident's chats: the scam message from Jamie K. |
| 02 | Reporting a message |
| 03 | Block confirm |
| 04 | Blocked: "You blocked Jamie K." and the send box locked |
| 05 | Request page with "Message City of Windsor 311 about this request" |
| 06 | Maya sees "City of Windsor 311", never staff names |
| 07 | Jordan Lee (City) sees which colleague wrote |
| 08 | Priya Nair (community group) starts a chat with a member |
| 09 | New messages in the bell |
| 10–11 | Phone: list and conversation |

## Not done / to decide

- Real-time delivery (messages appear when the other person's page refreshes its data; with a backend this would be pushed).
- Neighbr staff actions on a report (hide or keep) are Mounika's queue (KAN-52).
- Should the ward councillor be able to message, or only comment on requests? For now: comment only.
