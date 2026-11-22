# KAN-53: Marketplace and expiring posts (Devu)

Sprint 7 (Nov 9–15). Parent epic KAN-19 (Map and Interaction). Built on `pinpoint-sprint7-KAN51` (Bhavana's Chats). All listings, names and prices are illustrative.

Open **Marketplace** in the top bar (`#/marketplace`). It follows **Viewing as**.

## What it does

| Ticket item | What you see | Where |
| --- | --- | --- |
| **Marketplace page** with For sale, Free, Wanted, Services and Business offers; each listing has a picture or photo, a price and the area | Cards with the kind, price, meeting spot and distance, who posted it and when it ends. 14 sample listings | `src/features/marketplace/MarketplacePage.tsx`, `art.tsx`, `Marketplace.css`, `listings` in `mock-data.json` |
| **Create a listing** | Kind, title, description, price (not needed for Free), public meeting spot, how long it stays up (7, 14 or 30 days), "Show it on the map", optional photo. Plain-word errors, the first problem is focused | `CreateForm` in `MarketplacePage.tsx`, `validateListing` in `marketplace.ts`, `createListing` in `src/data/api.ts` |
| **Search and filters** | Search box, kind chips, lowest and highest price, **Free only**, distance (150 m to 1 km), sort (newest, price, nearest), "Clear filters", a live count | `browse` in `marketplace.ts` |
| **Listings on the map as pins, with a link back** | New map layer **Marketplace listings** (brown, letter M). The popup shows the meeting spot, the description, who posted it and when it ends, and a **View listing** link. The listing has **See it on the map** | `CorridorMap.tsx` (popup), `layers.ts`, `itemLayer.ts`, `listingPins` in `marketplace.ts` |
| **Message the seller** | Opens a chat in Bhavana's Chats with a first line about the listing (sent once, not again on a second click). If the chat rules say no, the reason is shown | `messageSeller` in `api.ts` (uses `startChat`) |
| **Report a listing** | Reason plus an optional note. It goes to the Neighbr staff queue; the seller is not told who reported it. One report per person per listing; not your own | `reportListing`, `getListingReports`, `resolveListingReport` in `api.ts` |
| **Map posts expire; they become a notification "This post has ended"** | After its end date a listing, a business post (such as "We're open") or an offer leaves the map. The person who posted it gets **This post has ended** in the notification bell (for 30 days). A seller can also end a listing early (**Mark as sold or done**, **Take it down**) and **Post it again** for 7, 14 or 30 days | `statusNow`, `endedRecently` in `marketplace.ts`, `endedPostNotifications` in `api.ts`, `buildMapExtras` in `src/features/map/extras.ts`, end date on the "We're open" form in `UpdatesPage.tsx` |

## Choices made for privacy and safety

- A pin is always at a **public meeting spot** (a shop, the hall, the parkette), never at a home. The form says so.
- The seller is shown as a first name and initial ("Maya R."). No address or phone number is stored or shown; the description box tells people to use Chats.
- Listings from City staff and the ward councillor are not allowed (they handle requests). **Business offers** are for businesses and organizations only.
- The seller of an ended or removed listing is the only one who still sees it, to post it again. A listing hidden by staff cannot be posted again.
- A listing with no price is hidden while a price limit or "Free only" is on, and the page says so.

## Sample listings (Reset demo brings them back)

| Kind | Example | Try it as |
| --- | --- | --- |
| For sale | Kids' bike, 20 inch ($45, Maya R.) | Resident, then Maya R. |
| Free | Moving boxes (Rosa's Bakery); Children's picture books (the community group) | Resident, then Priya Nair |
| Wanted | Looking for a used ladder | any |
| Services | Snow shovelling ($25 per visit) | any |
| Business offers | Buy 2 loaves, get 1 free (Rosa's Bakery) | Rosa's Bakery |
| Already ended | Display shelves for a shop (Rosa's Bakery, ended Nov 9) | Rosa's Bakery: see the bell and **My listings** |

## For the team

| Who | Use | Function (`src/data/api.ts`) |
| --- | --- | --- |
| Mounika, KAN-52 reported content queue | Reported listings, newest first, with reason, note and a copy of the listing | `getListingReports()`; staff decision `resolveListingReport(id, 'hidden' \| 'kept')` (hidden takes the listing off the Marketplace and the map) |
| Everyone | Any map post can have an `endsOn` date (YYYY-MM-DD); after it, it leaves the map and its owner is notified | `buildMapExtras` (map) and `endedPostNotifications` (bell) |

## Checks

- **73 new tests** (`marketplace.test.ts` 33, `marketplaceApi.test.ts` 23, `MarketplacePage.test.tsx` 17, and one updated layer test). **437 tests pass** in total (364 before). Type check and production build pass.
- Browser run (Chromium): browse, search, filters, listing, message the seller, report, create (errors and success), map pin and popup, end a listing and the bell, Rosa's ended posts, phone layout. **axe-core (WCAG 2.1 A/AA): 0 issues on 3 screens** (browse, create form with errors, listing with the report form).
- The map screenshots use a plain background because the sandbox cannot load map tiles. On your own machine the real streets show.

Screenshots in `docs/evidence/sprint-7-KAN-53-devu/`:

| # | Shows |
| --- | --- |
| 01 | Marketplace: search, filters and the listings |
| 02 | Search for "bike" |
| 03 | Free listings within 300 m |
| 04 | One listing, with Message the seller and Report |
| 05 | After **Message the seller**: the chat in Chats |
| 06–07 | Report a listing, and the confirmation |
| 08–10 | Create a listing: errors, filled in, posted |
| 11 | A listing on the map, with **View listing** |
| 12 | The map with the Marketplace layer |
| 13–14 | End a listing, then "This post has ended" in the bell |
| 15 | Rosa's Bakery: sample posts that have ended |
| 16 | "We're open" form with its end date |
| 17–18 | Phone |

## Not done / to decide

- A listing ends on its date when someone opens the app; there is no background job. With a backend this would be a scheduled task that also sends the email or push.
- Neighbours who are only in the sample listings (Marcus T., Lena P. and so on) can be messaged, but nobody can answer for them in the demo. Use Maya R., Rosa's Bakery or the community group to see both sides.
- No payments, ratings or "saved listings".
- The staff screen for reported listings is Mounika's queue (KAN-52). The data and the hide/keep decision are ready.
- Not mine, seen while testing: on a 390 px phone the top bar is about 30 px too wide on every page for the resident (the page can be dragged sideways a little). The Marketplace itself fits.
