# KAN-35: Report a problem (Purab)

Updated 24 October 2026. Built on Bhavana's KAN-37, Mounika's KAN-36 data and Devu's map additions. All data is illustrative.

Follows Nigel's feedback at the Oct 19 office hours: a resident reporting a pothole or a broken street light goes to whoever is responsible (the City, the ward councillor), not the BIA. The BIA's loop is with its businesses.

## What it does

1. **A "Report a problem" button on the map** (top left of the map; "Report" on a phone). In My business mode it reads **Request help from the BIA**.
2. **A short form:**
   - *What's the problem?* Resident: pothole or road damage, street light out, sidewalk problem, garbage or recycling, park or tree, something else. Business: roadwork or access blocking my shop; moved, new hours or closing; corridor problem; something else.
   - *Where is it?* Places along the corridor, nearest first.
   - *Details*: optional, up to 500 characters; required for "Something else".
3. **Who receives it is shown before sending**, with one line explaining why, and a privacy line ("only you and City of Windsor 311 see this until it's approved").

   | Problem | Goes to | Copy to |
   | --- | --- | --- |
   | Pothole, street light, sidewalk | City of Windsor 311 | Ward councillor |
   | Garbage or recycling | City of Windsor 311 | – |
   | Park or tree | Ward councillor | City of Windsor 311 |
   | Something else (resident) | Ward councillor | – |
   | Any business request | Olde Riverside BIA | – |

   A resident's report never goes to the BIA (tested).
4. **After sending:** a confirmation names the receiver; **See it on the map** selects the new pin and opens its card. The report is at the **Reported** step, private, and shows under **My reports** (resident) or **My requests** (business), with the existing "Sent to" row and progress ring.

## How it works

- `src/features/report/routing.ts`: report types, routing by role (looked up in the data, not hard-coded ids), validation and `buildReport`, which creates an issue in the same shape as the mock data, so every existing card and pin shows it without changes.
- `src/features/report/ReportProblem.tsx` + `Report.css`: the form (dialog).
- `src/data/api.ts`: `submitReport()` stores the report and `onDataChange()` tells the map page to reload. Demo only: reports are kept in memory until the page is refreshed. With a real backend, `submitReport` becomes a POST.
- `src/features/map/MapPage.tsx`: the button, the dialog and selecting the new report.

## Accessibility

Real dialog (`role="dialog"`, `aria-modal`, labelled by its title); focus moves to the title on open and stays inside the dialog (Tab wraps); Escape, Cancel and × close it; radio buttons and labelled fields; errors are linked to their fields and focus moves to the first one; the "Goes to" box is a polite live region; 48 px choice tiles; bottom sheet on a phone.

## Tests

27 new tests (`routing.test.ts`, `ReportProblem.test.tsx`): routing for every type, validation, the report's shape, the form in both modes, a failed send, closing, and `submitReport`. 145 tests pass in total. Type check and build pass.

## Screenshots

See `docs/evidence/sprint-4/` (listed in the README).

## Open questions for Nigel

- Should residents be able to choose the receiver themselves (for example the MP for federal matters), or is routing by problem type right?
- When the City or councillor answers, should the resident see the reply in the app, or only the status change?
