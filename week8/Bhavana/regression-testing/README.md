# Regression testing (Nov 23): Bhavana Volati

Regression check of the final Week 8 build (`pinpoint-week8-final`, with sign-in and French on every page) before the walkthrough video and the final demo.

- Automated checks: 570 tests pass, the type check and the production build pass.
- Manual checks: 34 tests split across the team by who built what (Bhavana 14, Mounika 10, Devu 10). The plan and results are in `PinPoint_Regression_Testing.xlsx`.
- Accounts: the ones under **Demo accounts** on the sign-in page. Reset demo before each run.

## My results (B01–B14): 14 of 14 pass

| ID | Area | Account | Result | Screenshot |
| --- | --- | --- | --- | --- |
| B01 | Sign in: wrong password gives one message that doesn't say which field was wrong | Any | Pass | `screenshots/B01-wrong-password.png` |
| B02 | Sign in: after 5 wrong tries, a 30-second wait and the button locks | Any | Pass | `screenshots/B02-locked-30-seconds.png` |
| B03 | Sign out goes back to the sign-in page | Jordan Lee | Pass | `screenshots/B03-signed-out.png` |
| B04 | Admin: Viewing as and Reset demo | Admin | Pass | `screenshots/B04-admin-viewing-as-reset.png` |
| B05 | City work queue: Overdue lists the pothole | Jordan Lee | Pass | `screenshots/B05-jordan-overdue.png` |
| B06 | Assign the streetlight request to Sam Patel | Jordan Lee | Pass | `screenshots/B06-assigned-to-sam.png` |
| B07 | Mark the pothole resolved | Sam Patel | Pass | `screenshots/B07-sam-marks-resolved.png` |
| B08 | Publish the pothole outcome (it is under **Closed** once resolved) | Jordan Lee | Pass | `screenshots/B08-jordan-publishes-outcome.png` |
| B09 | Insights | Jordan Lee | Pass | `screenshots/B09-insights.png` |
| B10 | Chats: Maya sees City of Windsor 311, never staff names | Maya R. | Pass | `screenshots/B10-maya-sees-city-only.png` |
| B11 | Chats: report the message from Jamie K., then block | Team 2 Group 10 | Pass | `screenshots/B11-report-and-block.png` |
| B12 | New chat message in the bell | Maya R. | Pass | `screenshots/B12-bell-new-message.png` |
| B13 | QR poster link opened signed out: sign in, then Report a problem with Rosa's Bakery chosen | Team 2 Group 10 | Pass | `screenshots/B13-qr-poster-report-form.png` |
| B14 | French on Requests and Chats, then back to English | Jordan Lee | Pass | `screenshots/B14-french-then-english.png` |

No console errors during the run.

## Notes for the video and demo

- After Sam resolves the pothole, it moves to the **Closed** tab of Jordan's queue: open it there to click **Publish outcome**.
- Publish outcome only appears for requests the sender posted to the map; the streetlight request is private, so use the pothole.
- B13 was checked by opening the poster's link; scanning the code with a phone needs the live link.

## Still to come

Mounika's (M01–M10) and Devu's (D01–D10) results, then one combined sheet.
