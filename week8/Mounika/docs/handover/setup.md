# Setup for Neighbr's developers

## Run it

Needs Node.js 20 or newer.

```
npm install
npm run dev        # http://localhost:5173
npm test           # 538 automated tests
npm run build      # type check + production build into dist/
```

`dist/` works from any address (`base: './'` in `vite.config.ts`). Drag it onto any static host to share a link.

## How it is put together

| Part | Where | Notes |
| --- | --- | --- |
| Screens | `src/features/<area>/` | React 19 + TypeScript, one folder per section (map, requests, community, school, updates, chats, marketplace, moderation, profile) |
| App frame, navigation, onboarding, Viewing as | `src/app/` | Hash routes: `#/map`, `#/requests?id=…`, `#/community`, `#/updates`, `#/chats`, `#/marketplace`, `#/review`, `#/profile`, `#/welcome` |
| Data | `src/data/api.ts` + `src/data/mock-data.json` | The only place to change for a real backend: see [backend-api.md](backend-api.md) |
| Rules | `*.ts` files next to each screen (no screen code) | Who can do what, validation, privacy |
| Map | MapLibre GL with OpenFreeMap tiles (OpenStreetMap fallback) | Pins are placed from the sample data's coordinates |
| Look | `src/index.css` (colours and type), `src/app/polish.css` (shared polish), one stylesheet per section | Fonts are bundled (Familjen Grotesk, Public Sans), so it works offline |

## Things that are simulated in the demo

- **Sign-in.** "Viewing as" switches between 11 sample people. A real app replaces this with Neighbr accounts and roles.
- **Storage.** Changes are kept in the browser (`localStorage`, key `pinpoint-demo-v1`) until **Reset demo**.
- **Live updates.** `onDataChange` tells open screens to reload; a real backend would push changes (websockets or polling).
- **Photos and permit files.** Read in the browser and kept with the demo data; a real backend stores them.
- **Notifications.** In-app bell only, no email or push.

## Accessibility

Every page is checked with axe-core against WCAG 2.1 A and AA for all 11 user types on desktop, and on a 390 px phone. The last check found 0 issues. Keyboard focus is visible everywhere and motion is turned off for people who ask their system for reduced motion.
