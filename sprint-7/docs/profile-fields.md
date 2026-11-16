# Profile fields: public and private (KAN-36)

Owner: Mounika Boggarapu · Updated: 20 October 2026 · All profiles are illustrative demo data.

This table lists, for every profile in `src/data/mock-data.json`, what other people can see (public) and what is never shown (private). It follows Nigel's feedback at the Oct 19 office hours: keep the owner separate from the business, and send resident reports to the city or ward councillor, not the BIA.

## All profiles

| Profile | ID | Badge | Public (anyone can see) | Private (never shown to others) |
| --- | --- | --- | --- | --- |
| Team 2 Group 10 | `profile-resident` | Resident | name, bio, interests, skills, area | home address, contact details |
| Rosa's Bakery | `profile-business` | Business | name, hours, location, offers | owner identity, request history |
| Olde Riverside BIA (demo) | `profile-bia` | BIA | corridor area, approved notices, member directory | inbox, internal notes, board summary drafts |
| Riverside Neighbours Network (demo) | `profile-ngo` | Community group | name, programs, events | volunteer contact list |
| Rosa Alvarez (demo) | `profile-owner-rosa` | Resident | name, bio, interests, area | home address, contact details, which business they own |
| Ward Councillor (demo) | `profile-councillor` | Ward councillor | name, ward area, office hours, public responses to reports | inbox, resident contact details, internal notes |
| City of Windsor 311 (demo) | `profile-city` | City service | name, service area, report status | case notes, staff names, resident contact details |
| Member of Parliament (demo) | `profile-mp` | MP | name, riding, public statements | constituent casework, contact details |

## Rules we follow

1. **No home address is ever public**, for anyone. A resident shows a general area only.
2. **Owner and business are separate.** The business profile (`profile-business`) sits in the BIA corridor. The owner (`profile-owner-rosa`) is a resident of the city. The business links to its owner with `ownerProfileId`; which business the owner runs is private on the owner's profile.
3. **Who receives a report depends on who is responsible**, not on the BIA:
   - Business → BIA: sales, posts, requests about the corridor (for example `issue-04`, `post-03`).
   - Resident → City or ward councillor: potholes, street lights, sidewalks (for example `issue-05`, which now has `routedToProfile: "profile-city"` and `ccProfile: "profile-councillor"`).
   - MP: federal matters only, not local repairs.
4. **Private reports stay private until approved** (`visibility: "private until approved"`); only the person who raised them sees them.

## What changed in the data

- Added `profile-owner-rosa` (resident) and `ownerProfileId` on `profile-business`.
- Added responder profiles: `profile-councillor`, `profile-city`, `profile-mp`, each with `handles` (what they deal with) and public and private fields.
- `issue-05` now points to the city and copies the councillor. The display text `routedTo` that the map popup uses is unchanged.
- The demo ward (`ward-demo`) lists `responsibleProfiles`.
- No existing profile IDs were renamed or removed.

## Still to decide with Nigel

- What other residents should see on a business owner's personal profile (we keep the business link private for now).
- Whether one person can switch between their resident profile and their business profile.
- How the app picks the responder: by issue type, by ward, or by the resident's choice.

## Tests

`src/data/profiles.test.ts` (8 tests) checks the rules above. The adapter test in `src/app/shell.test.tsx` now expects 8 profiles instead of 4. All tests pass (145 in Sprint 4) and the production build passes.
