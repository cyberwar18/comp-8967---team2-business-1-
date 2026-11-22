# KAN-50: Your profile and Settings, phone layout, final merge (Purab)

Sprint 7 (Nov 9–15). Built on `pinpoint-sprint7-KAN52` (Bhavana's Chats, Devu's Marketplace and Mounika's permits and moderation). All data is illustrative.

Open **Your profile** in the Viewing as strip at the top (`#/profile`). It follows **Viewing as**.

## What it does

| Ticket item | What you see | Where |
| --- | --- | --- |
| **Profile page** | Name, role, organization and area; the bio; **Neighbours can see** and **Only you** (from the profile's public and private fields); for Rosa's Bakery, the owner as a separate profile. No home address or phone number anywhere | `ProfilePage.tsx` (`ProfileCard`), `getProfileSummary` in `src/data/api.ts` |
| **Yours on Neighbr** | Requests you sent (and how many are still open), requests you support, unread messages, your Marketplace listings, new notifications. Each row links to the page where you act on it. Staff see their work queue instead | `YourStuff` in `ProfilePage.tsx` |
| **Settings: who can message me** | Anyone / Only organizations I belong to / Nobody new. This is Bhavana's rule from Chats (KAN-51), so Chats and Settings always agree | `getMessageSetting`, `setMessageSetting` |
| **Settings: notifications** | Turn each kind on or off: My requests, Messages, Area alerts, Community and school, Marketplace and posts. The bell then leaves that kind out | `NOTICE_KINDS`, `keepNotice` in `settings.ts`; `getNotifications` in `api.ts` |
| **Settings: home area** | Pick a public place on the corridor (never an address). Area alerts (Bhavana) reach you around it, and the Marketplace (Devu) measures distances from it. Staff have no home area | `applySettings` in `settings.ts`, `effectivePersona` in `api.ts`, used by `App.tsx` for every page |
| **Kept and reset** | Settings are kept after a refresh and cleared by **Reset demo**. Each person in Viewing as has their own, even the two City staff who share one organization profile | `saveDemo`, `loadDemo`, `resetRequests` in `api.ts` |
| **Phone layout** | On a 390 px phone nothing scrolls sideways for any user type (it was 32 px too wide). The Neighbr name is hidden visually but still read by screen readers; the strip's links wrap onto a second line | end of `src/app/AppShell.css` |

## Final merge and demo-day fixes

- KAN-51, KAN-53 and KAN-52 were built one on top of the other, so `pinpoint-sprint7-KAN52` already had all three. KAN-50 is added on top.
- Sample dates moved into December, so they are still current on demo day: the hydrant alert and the ward poll (now until Dec 18), the winter coat drive, the school fun fair, the potluck and four volunteer roles. The two tests that named the old dates were updated.
- Fixed a school test that started failing on Nov 16. It posted a notice dated Nov 1 while the "last two weeks" check used the real date. The test now fixes the adapter's clock to the same day.

## Checks

- **21 new tests** (`profile.test.ts` 15, `ProfilePage.test.tsx` 6). **538 tests pass** in total (517 before). Type check and production build pass.
- Browser run (Chromium): the profile for a parent, a business, an organizer and City staff; saving settings; phone width for five user types. **axe-core (WCAG 2.1 A/AA): 0 issues** on the profile page (desktop and phone).

Screenshots in `docs/evidence/sprint-7-KAN-50-purab/`: 01 profile and settings (Maya R.), 02 City staff, 03 phone.

## Not done / to decide

- Editing the bio and the public/private fields (the backend will own profiles; the demo shows them read-only).
- Email or push notifications (the bell is in-app only).
