# Mounika Boggarapu: my work on PinPoint

The full working app (all four of us, 538 tests) is in `sprint-7/` at the top of this repo. This folder holds the parts I built, with their docs and screenshots.

| Ticket | What I built | Files here |
| --- | --- | --- |
| KAN-9 / KAN-27 | Mock dataset, search, filter chips, result cards, search tests | `src/features/search/` |
| KAN-36 | Owner and business profiles separated, responder profiles, profile fields table, resident interview guide | `docs/profile-fields.md`, `docs/resident-interview-guide.md` |
| KAN-42 | Community workspace: events (private until an organizer approves), volunteer roles, members | `src/features/community/`, `docs/KAN-42-community-workspace.md` |
| KAN-48 | Community follows Viewing as, groups send requests to the City, approved events and library service changes on the map | `src/features/community/`, `docs/KAN-48-community-journey.md`, `docs/evidence/sprint-6-KAN-48-mounika/` |
| KAN-52 | Neighbr staff user type and Review page: event permits (organizer, then Neighbr staff, then the map) and the reported content queue (Hide or Keep) | `src/features/moderation/`, `docs/KAN-52-event-permits-moderation.md`, `docs/evidence/sprint-7-KAN-52-mounika/` |

My smaller changes inside shared files (ward polls in `src/features/updates/`, permit and report functions in `src/data/api.ts`, sample data in `src/data/mock-data.json`) are in the full app in `sprint-7/`.
