# Sprint 6: six features for the next demo

Updated 3 November 2026. Nigel liked how deep the school workspace went ("deeper than I anticipated"). These six features give the same depth to every user type and connect them as one neighbourhood. All data is illustrative.

**The demo story:** a resident reports a pothole → neighbours add their support instead of sending duplicates → the City sees "Reported by 3 neighbours", fixes it, and the sender confirms it's fixed → the shop next to the roadwork told customers it's open → the councillor asked the ward a question → the City and the BIA take the numbers to their board.

| # | Feature | Where | Owner |
| --- | --- | --- | --- |
| 1 | **"Me too"**: support a request already on the map | Report form, Requests | Purab |
| 2 | **Corridor pulse and board report** | Requests → **Insights** tab (leads and the councillor) | Bhavana |
| 3 | **Roadwork impact for businesses** with a one-tap "We're open" notice | **Updates** | Devu |
| 4 | **Ward polls**: the councillor asks, residents vote once | **Updates** | Mounika |
| 5 | **"Was it fixed?"** rating once a request is resolved | Requests | Purab |
| 6 | **Area alerts** to everyone in a circle around a place | **Updates**, notifications | Bhavana |

**Updates** (top bar) was a placeholder page. It is now the neighbourhood's own page: alerts for your area, ward polls, roadwork near your shop, and "Recently fixed nearby".

## 1. "Me too" (Purab)

- While reporting, if the **same kind of problem** has already been **posted to the map within 150 m**, the form shows **Already reported nearby** with "Reported by 2 neighbours · 0 m away" and **Support this instead**.
- Supporting adds you to the request: it appears in **My requests** marked *You support this*, and you get its updates in notifications ("… (you support it)").
- The sender is told "A neighbour added their support". Staff see **Reported by 3 neighbours** and can sort the queue by **Most supported**.
- **Privacy:** supporters are anonymous to everyone but staff, and a supporter never sees the sender's name or staff names. Private requests can't be supported, and nobody but the sender and the people handling it can change a request.
- Try it: as the **resident**, Report a problem → *Pothole* → *Maple & Rye Diner*.

## 2. Corridor pulse and board report (Bhavana)

- **Insights** tab for the City 311 lead, the BIA coordinator and the ward councillor (not for crew members).
- Key numbers: open, **overdue**, **average days to resolve**, **% who say it was fixed** (from feature 5), times neighbours added support (from feature 1), this month vs last month.
- **What kind** (bars by category) and **Where they cluster** (a small map of the corridor, circles sized by reports), plus the most supported request.
- **Board report**: a one-page summary ("In numbers" and "You said, we did") with **Print or save as PDF**. Residents' names are never included.

## 3. Roadwork impact for businesses (Devu)

- Reuses the school roadwork alert: a shop within **150 m of public roadwork** sees **Roadwork near your shop** ("Sidewalk work on Wyandotte St E, about 20 m from Rosa's Bakery").
- One tap posts **"We're open during the roadwork"** to the map (Business posts layer). The text can be edited (140 characters).
- The BIA coordinator sees **Shops affected by roadwork**, with distances and whether each shop has posted a notice yet.
- Only public roadwork is used; private requests never are. Only the business itself can post for its shop.

## 4. Ward polls (Mounika)

- The councillor posts a question with 2 to 4 choices, a closing date and **What happens next**.
- **Only residents of the ward can vote, once each.** Business owners, organizations and staff see why they can't. Votes are anonymous.
- Results show after you vote, when the poll closes, and always to the councillor.
- Sample poll: "Which spot should get new street lighting first?"

## 5. "Was it fixed?" (Purab)

- Once a request is resolved, the sender sees **Was it fixed?** with *Yes, it's fixed* or *No, it's not*. "No" asks what is still wrong, and they can still reopen within 14 days.
- The rating shows on the request for staff ("Sender's rating"), in the record, in **Recently fixed nearby**, and feeds the **% fixed** number in Insights.

## 6. Area alerts (Bhavana)

- The City 311 lead, the BIA coordinator and the councillor send an alert: title, message, **around a place**, **how far** (100, 250 or 500 m), **who** (everyone, residents, businesses, or schools and community organizations), and an optional end date.
- Before sending, it says **Reaches N people in the demo**. Everyone whose home or business is inside the circle gets a **notification**, and the alert shows in **Alerts for your area** on Updates.
- Sample alert: hydrant flushing on Wyandotte St E.
- Each demo person has an illustrative home location (`home` in `personas.ts`).

## Try them all (8 minutes)

1. **Viewing as: Resident** → Map → Report a problem → *Pothole* → *Maple & Rye Diner* → **Support this instead** → **Follow it in Requests**.
2. **Updates**: see the hydrant alert; vote in the ward poll.
3. **Viewing as: Rosa's Bakery** → Updates → **Post "We're open" to the map**.
4. **Viewing as: Alex Moreau, BIA coordinator** → Updates: **Shops affected by roadwork**.
5. **Viewing as: Jordan Lee, City 311 lead** → Updates: write an alert, choose a place and see **Reaches N people**, then **Send alert**. → Requests → **Insights** → **Board report**. → **Work queue**: open the pothole (*Reported by 3 neighbours*), write what was done, **Mark resolved**.
6. **Viewing as: Maya R.** → Requests → the pothole → **Yes, it's fixed**.
7. **Viewing as: Ward Councillor** → Updates → **Ask the ward**.
8. **Viewing as: Resident** → the bell: the alert and "marked it resolved (you support it)". Updates → **Recently fixed nearby**.

## Evidence

Screenshots in `docs/evidence/sprint-6/` (20–35; the map background is grey because the machine that took them could not load map tiles).

| Screenshot | Shows |
| --- | --- |
| [20](evidence/sprint-6/20-me-too-suggestion.png) | "Already reported nearby" in the report form |
| [21](evidence/sprint-6/21-me-too-supported.png) | "You're supporting it" |
| [22](evidence/sprint-6/22-supporter-view.png) | A supporter's view: anonymous, organizations only |
| [23](evidence/sprint-6/23-updates-resident-alert-and-poll.png) | Updates for a resident: area alert, ward poll after voting |
| [24](evidence/sprint-6/24-updates-business-roadwork.png) | Roadwork near your shop |
| [25](evidence/sprint-6/25-business-posted-open.png) | "We're open" notice posted |
| [26](evidence/sprint-6/26-updates-bia-affected-shops.png) | The BIA's list of affected shops |
| [27](evidence/sprint-6/27-city-alert-form-reach.png) | Area alert form with "Reaches N people" |
| [28](evidence/sprint-6/28-insights-corridor-pulse.png) | Insights: corridor pulse |
| [29](evidence/sprint-6/29-board-report.png) | Board report |
| [30](evidence/sprint-6/30-queue-reported-by-3.png) | Work queue: "Reported by 3 neighbours" |
| [31](evidence/sprint-6/31-was-it-fixed.png) | "Was it fixed?" |
| [32](evidence/sprint-6/32-rated-fixed.png) | Rated: "You said: it's fixed" |
| [33](evidence/sprint-6/33-councillor-ask-the-ward.png) | The councillor's "Ask the ward" form |
| [34](evidence/sprint-6/34-resident-notifications.png) | A resident's notifications: alerts and a supported request |
| [35](evidence/sprint-6/35-recently-fixed.png) | Recently fixed nearby |

## Checks

- **306 tests pass** at the time (332 after the Nov 8 team merge; 274 before; 32 new in `src/features/updates/neighbourhood.test.ts` and `UpdatesScreens.test.tsx`). Type check and production build pass.
- **Browser run** of all eight steps as 6 user types (resident, business owner, BIA coordinator, City lead, parent, councillor): no console errors.
- **Accessibility** (axe-core, WCAG 2.1 A and AA) on the "Me too" form, Updates (resident and BIA), Insights and "Was it fixed?": **0 issues**.
- **Privacy check:** a test makes sure a supporter never sees the sender's or staff names.

## Files

| File | What |
| --- | --- |
| `src/features/requests/requests.ts` | `support` and `rate` actions, supporters, ratings, "Most supported" sort |
| `src/features/requests/insightsData.ts`, `Insights.tsx` | Corridor pulse numbers, the small map, the board report |
| `src/features/updates/neighbourhood.ts` | Rules for area alerts, ward polls and roadwork impact |
| `src/features/updates/UpdatesPage.tsx`, `Updates.css` | The Updates page |
| `src/features/report/ReportProblem.tsx` | "Already reported nearby" and "Support this instead" |
| `src/data/api.ts` | `getSupportable`, `getAlerts`, `sendAreaAlert`, `alertReach`, `getWardPolls`, `createWardPoll`, `voteWardPoll`, `postOpenNotice`, `getRecentlyFixed`; pins for public requests; alerts and supporters in notifications; all saved with the demo |
| `src/data/mock-data.json` | Sample poll (`wardPolls`), sample alert (`areaAlerts`); the pothole request is now public with 1 supporter; the crosswalk request has a rating |
| `src/features/requests/personas.ts` | `home` for each person who can receive alerts |
