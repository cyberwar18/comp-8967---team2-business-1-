# Final demo script (about 10 minutes)

Sign in as the admin (**admin@pinpoint.demo**, password **Admin2026!**), then press **Reset demo** in the strip at the top before you start. Open with 20 seconds on sign-in: every person has their own account (show a wrong password and the error), and the admin can switch between everyone. Every step uses **Viewing as** to switch person; the app is one shared neighbourhood seen from each side.

| # | Time | Viewing as | Show | Say |
| --- | --- | --- | --- | --- |
| 1 | 0:30 | (first visit) | **Sign up as someone else** → pick a resident → lands on the map. Pick City staff → lands on the work queue | "Onboarding sends each user type to its own page." |
| 2 | 1:30 | Team 2 Group 10, Resident | **Report a problem** → Street lights → pick the spot on the map → **Post to the map** → Send. Then a pothole near **Maple & Rye Diner** → **Support this instead** | "The sender decides if it is public. Neighbours add support instead of duplicates." |
| 3 | 1:30 | Jordan Lee, City lead → Sam Patel, City crew | Work queue: tiles, **Overdue**, **Oldest first**. **Acknowledge**, **Assign** to Sam; as Sam **Mark resolved**; as Jordan **Publish outcome on the map**. Open **Insights** → board report | "Due dates per category, moving between teams with a reason, and a one-page report for the board." |
| 4 | 1:00 | Resident | **Requests**: the steps, the City shown as an organization, never staff names. **Was it fixed?** On the map: the status word on the pin and **You said, we did** | "The loop closes where it started: on the map." |
| 5 | 1:00 | Maya R. → Jordan Lee | **Chats**: Maya's chat with City of Windsor 311 about her pothole; as Jordan, which colleague wrote. As the resident: the scam message from Jamie K. → **Report**, **Block** | "Chats are tied to requests, and staff names stay inside the organization." |
| 6 | 1:00 | Resident → Rosa's Bakery | **Marketplace**: search "bike", **Free only**, distance. A listing → **See it on the map** → **Message the seller**. As Rosa: **This post has ended** in the bell | "Listings meet at public spots, never at a home, and leave the map when they end." |
| 7 | 1:30 | Priya Nair → Taylor Brooks, Neighbr staff | **Community** → **Create event** at **Thompson Parkette**: a permit is required → upload one → approve as organizer. As Taylor: **Review** → **Approve**; the event appears on the map. **Reported content** → **Hide** the scam message | "Events in public spaces need a permit approved by Neighbr staff; reported content gets a decision." |
| 8 | 0:45 | Ms. Laurent → Maya R. | **School**: roadwork alert near the safe routes; **Post a notice** to all parents; as Maya, the notice in the bell | "Parents get what matters near the school, with no student information anywhere." |
| 9 | 0:45 | Business / councillor | **Updates**: "We're open" notice near roadwork; the ward poll (as the councillor, the results) | "Businesses and the councillor have their own tools too." |
| 10 | 0:30 | Any | **Your profile**: what neighbours see and what stays private; **Settings**: who can message me, notifications, home area | "People control who reaches them and what they hear about." |

Close: 570 automated tests, 0 accessibility issues on the screens we checked, one data adapter (`src/data/api.ts`) ready for Neighbr's backend.
