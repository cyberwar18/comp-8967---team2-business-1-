# Regression testing: Mounika (M01–M10)

Build tested: Purab's `pinpoint-week8-final.zip` (570 automated tests pass). Tested on Nov 23, 2026 in Chrome on a laptop (1440 px) and at phone width (390 px), after **Reset demo**. Passwords: `Demo2026!` for everyone, `Admin2026!` for the admin.

**Result: 8 Pass, 2 Fail (M03, M10).** Both fails were the same bug (the Review page did not scroll). It is fixed in `pinpoint-week8-final-reviewfix.zip` and retested: the page scrolls on laptop and phone, and all 570 tests still pass.

| ID | Area | Account | Result | What I saw | Screenshots |
| --- | --- | --- | --- | --- | --- |
| M01 | Sign in | priya@pinpoint.demo | Pass | Empty fields: an error next to each field and a summary at the top. An email without @: "Enter an email like name@example.com". | `M01-sign-in-errors.png` |
| M02 | Event permit | priya@pinpoint.demo | Pass | Thompson Parkette shows "This is a public space, so the event needs a permit". It can't be sent without a permit. After the upload and the organizer's approval it says "With Neighbr staff". | `M02a`, `M02b` |
| M03 | Review: approve | taylor@pinpoint.demo | **Fail, fixed** | Approve works and the event shows on the map. But the Review page did not scroll, so with 2 or more permits the lower cards and their buttons could not be reached. | `M03a` (after the fix), `M03b`, `M03c` |
| M04 | Review: decline | taylor@pinpoint.demo | Pass | Decline needs a reason. Priya's bell shows "Neighbr staff declined the permit: …" with the reason. | `M04a`, `M04b` |
| M05 | Review: ask for info | taylor@pinpoint.demo | Pass | Priya sees the question on the event, answers it, and it goes back to Neighbr staff. | `M05a`, `M05b` |
| M06 | Reported content | taylor@pinpoint.demo | Pass | Reported a chat message and a listing as the resident. Taylor hid the message and kept the listing. The chat shows "This message was removed by Neighbr staff", and the reporter got both outcomes in the bell. | `M06a`, `M06b`, `M06c` |
| M07 | Library service change | sofia@pinpoint.demo | Pass | A change starting today is on the map until its last day. A change starting tomorrow waits until its first day. | `M07a`, `M07b` |
| M08 | Ward poll | councillor@pinpoint.demo | Pass | The councillor's poll goes live. The resident votes once, sees the results and "What happens next", and can't vote again. | `M08a`, `M08b` |
| M09 | French | priya@pinpoint.demo | Pass | Community and Review switch to French and back to English. Small: the line "Neighbr staff · Olde Riverside" above the Review title stays in English. | `M09a`, `M09b`, `M09c` |
| M10 | Phone | taylor@pinpoint.demo | **Fail, fixed** | Nothing scrolls sideways at 390 px, but the page did not scroll down (same bug as M03). After the fix it scrolls to the second permit. | `M10a`, `M10b` (after the fix) |

## The bug and the fix

- **What happened:** the app frame does not scroll, so each page scrolls itself (Marketplace and Profile already do). The Review page did not, so anything below the screen was cut off.
- **Fix:** one line in `src/features/moderation/Moderation.css`:

```css
.mo-page { height: 100%; overflow-y: auto; box-sizing: border-box; padding: 24px max(16px, calc((100% - 828px) / 2)) 48px; }
```

Map tiles are blank in the map screenshots because the test machine had no internet for the background map. The pins and the list are what the tests check.

## Files

- `PinPoint_Regression_Testing_Mounika.xlsx`: my filled rows.
- `screenshots/`: one or more per test, named by test ID.
