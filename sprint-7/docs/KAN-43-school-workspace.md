# KAN-43: School workspace (Devu)

Updated 1 November 2026. Built on Mounika's Community section (KAN-42), Purab's shell and my map. All data is illustrative: the school, its routes, the crosswalks and the notices are invented.

Nigel's three loops again: business ↔ BIA, resident ↔ City / councillor, and now **school ↔ families**. A school is the same kind of workspace as the community group and the library, so it sits in the **Community** section: choose *Riverside Public School* and the school section appears at the top of its page.

## What it does

1. **Roadwork alert.** A banner says whether there is roadwork near the school (within 250 m) or near a walking route (within 100 m). Today it says: *Roadwork near the school: Sidewalk work on Wyandotte St E, about 170 m away. Route A passes within 20 m of it. Use Route B instead.* The words "Roadwork alert" / "All clear" carry the meaning, not just the colour.
2. **Safe walking routes.** Two illustrative routes (Route A from Thompson Parkette, Route B from the Community Hall), each with its crosswalk and a status in words: *Clear* or *Roadwork near*. A button opens the map showing the routes.
3. **Notices and events.** Each one has an audience: **Public**, **All parents**, or one **grade**. Events show their date and time.
4. **Public / Parent / Staff view.** A switch at the top of the section (demo only), using the same roles as the shared workspace (Public, Member, Staff). **Only staff can post**, with a form (notice or event, title, message, who can see it). Parents and the public never see the form.
5. **Privacy box.** What is public, what parents also see, and what is never shown.

On the map, a new layer **School safe routes** (green "S"): the school area, the two routes, the crosswalks, and the school pin. A route with roadwork near it is **dashed, orange and labelled "(roadwork near)"**; a clear route is solid green and labelled "(clear)". Clicking the school pin shows the alert in its popup. The layer has its own switch, is saved in the link (`l=school`), and the Layers count is 9.

## Privacy rules (the ticket)

| Thing | Who can see it |
| --- | --- |
| Public notices and events, the routes, the roadwork alert | Everyone |
| Notices for all parents | Parents and staff |
| Notices for one grade | Parents of that grade, and staff |
| The post form | Staff only |
| Student names, photos, parent contact details | Nobody (not in the data at all) |

- A parent's own child's grade is kept only on the school's demo record, never on a notice, and is never returned to the public view.
- The roadwork alert uses **public roadwork only**. The bakery's private request to the BIA (`issue-04`) is never used, so it can't leak to parents.

## Files

| File | What |
| --- | --- |
| `src/features/school/schoolData.ts` | All the rules, with no UI: who sees which notice, staff-only posting, form checks, distances, the roadwork alert, the shapes for the map |
| `src/features/school/SchoolWorkspace.tsx` + `School.css` | The section: alert, routes, notices, post form, privacy box |
| `src/features/community/CommunityPage.tsx` | One line added: show the school section when the school is chosen (Mounika's file) |
| `src/features/map/layers.ts`, `itemLayer.ts`, `types.ts`, `CorridorMap.tsx`, `MapPage.tsx` | The new layer: school pin, zone, routes, crosswalks, labels |
| `src/data/mock-data.json` | New lists: `schools` (1), `schoolNotices` (6) |
| `src/data/api.ts` | New functions: `getSchools`, `getSchoolNotices` (Purab's file) |
| `src/features/map/layerMapping.test.ts` | Layer list now has nine layers |

New posts live in the page's memory for the demo and are gone after a refresh. With a real backend they become calls in `api.ts`.

## Checks

- **35 new tests**: `schoolData.test.ts` (26) and `SchoolWorkspace.test.tsx` (9). **208 tests pass** in total (173 before). Type check and production build pass.
- Browser check (Chromium): the alert, the three roles, a staff post that only parents see, the form errors, the school pin and its popup, the layer switch and the link, and the phone layout with no sideways scrolling.
- Not done: an accessibility scan (axe-core) of the new section, a screen reader check, and a real-phone check. These need doing by hand.
- Update (Purab, Nov 1, after merging with the Requests work): axe-core scan (WCAG 2.1 A and AA) of the school section in the Public and Staff views, and of the map with the new layer: **0 issues**. 243 tests pass together. Screen reader and real-phone checks are still to do.

## Evidence

Screenshots in `docs/evidence/sprint-5/`:

| Screenshot | Shows |
| --- | --- |
| 10-school-public-view | The school section as the public: alert, routes, public notices |
| 11-school-parent-view | As a Grade 2 parent: parent notices appear, Grade 5 does not |
| 12-staff-post-form | As staff: the post form |
| 13-staff-posted | The new post, with its audience |
| 14-school-on-map | The school zone, routes, crosswalk, roadwork and popup on the map |
| 15-school-phone | The phone layout |

## Still to decide (team / Nigel)

- Should parents get the alert as a notification, or only see it in the app?
- Real school zones and routes: who owns this data (the school board or the City)?
- Should the School section join Purab's shared roles switch (KAN-40) so there is one "View as" for the whole workspace?
