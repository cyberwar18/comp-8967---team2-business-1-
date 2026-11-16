# Devu Babu Sheeja: my work on PinPoint

The full working app (all four of us, 538 tests) is in `sprint-7/` at the top of this repo. This folder holds the parts I built, with their docs and screenshots.

| Ticket | What I built | Files here |
| --- | --- | --- |
| KAN-29 / KAN-33 | MapLibre corridor map, pins with clustering, layer toggles, map state in the URL, issue steps in the popup | `src/features/map/`, `docs/KAN-33-checklist.md` |
| KAN-38 | Business posts and offers layer, BIA polls with voting, ward area outline, private requests kept off the map | `src/features/map/extras.ts`, `polls.ts`, `docs/map-additions-oct20.md` |
| KAN-43 | School workspace: roadwork alert, safe walking routes, notices and events, School safe routes map layer | `src/features/school/`, `docs/KAN-43-school-workspace.md` |
| KAN-47 | Request status on map pins, "You said, we did", school staff send requests to the City | `src/features/map/requestStatus.ts`, `YouSaidWeDid.tsx`, `docs/KAN-47-request-outcomes-on-map.md`, `docs/evidence/sprint-6-KAN-47-devu/` |
| KAN-53 | Marketplace (listings, search and filters, pins on the map, Message the seller, report a listing) and map posts that expire into notifications | `src/features/marketplace/`, `docs/KAN-53-marketplace.md`, `docs/evidence/sprint-7-KAN-53-devu/` |

My smaller changes inside shared files (roadwork impact in `src/features/updates/`, listing functions and `endedPostNotifications` in `src/data/api.ts`) are in the full app in `sprint-7/`.
