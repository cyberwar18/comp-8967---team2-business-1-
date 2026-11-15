# KAN-33: Map review, state check, popup steps, backup recording (Devu)

Status of each part

| Part | Status | Notes |
| --- | --- | --- |
| Issue status steps in popup | Done in code | `src/features/map/popupSteps.ts`, popup in `CorridorMap.tsx`, styles in `CorridorMap.css`, tests in `popupSteps.test.ts`. Select an issue pin: the popup shows Reported / Acknowledged / Resolved. |
| Layer and URL state check | Checked in a desktop browser (18 checks passed); repeat on a phone | Steps below |
| Map review on real devices | To do by hand | Checklist below |
| Backup demo recording | To do by hand | Script below |

## 1. Layer and URL state check (about 3 minutes)

Run `npm run dev` and open the map. The Layers box is closed at first: click "Layers".

1. Switch **Events** and **Roadwork** off. The address bar should now contain `l=places,updates,issues`.
2. Refresh. Events and Roadwork stay off.
3. Copy the address, paste it into a new tab (or send it to your phone). Same view, same layers.
4. Click a pin or a card. The address gets `pin=...`. Refresh: the same popup opens.
5. Switch every layer off. Address has `l=` with nothing after it. Refresh: still all off.
6. Click the recenter button (crosshair). The map goes back to the whole corridor.
7. Open an issue pin (Issues layer): the popup shows three steps. `issue-05` = step 1 Reported, `issue-04` = step 2 Acknowledged, `issue-06` = step 3 Resolved.

## 2. Real-device review (phone and laptop)

Use the live link or the dev server on the same Wi-Fi.

- [ ] Phone: map fills the screen, no horizontal scrolling
- [ ] Phone: pins and clusters are easy to tap with a thumb
- [ ] Phone: tapping a cluster zooms in; tapping a pin opens the popup and the details sheet
- [ ] Phone: the Layers box opens and closes; the checkboxes are easy to tap
- [ ] Phone: the popup text is readable and not cut off at the screen edge
- [ ] Phone: rotate to landscape and back; the map still works
- [ ] Laptop: zoom +/-, recenter, search, chips and layers all work
- [ ] Pins show a letter as well as a colour (P, E, U, I, R)
- [ ] The basemap loads. If not, it should switch to standard OpenStreetMap by itself.
- [ ] Pins sit on Wyandotte St E (not in the river or on side streets)
- [ ] Anything that looks wrong: note the device, browser and a screenshot, and add it as a comment on KAN-33

## 3. Backup demo recording (60 to 90 seconds)

Record the screen (Windows: Win + G, or Xbox Game Bar; phone: built-in screen recorder). Use a sunny-day run: refresh first so the map is loaded.

1. (0:00) Open the map. Say: "This is the Olde Riverside corridor on Wyandotte Street East. All data is illustrative."
2. (0:10) Zoom in on a crowded spot. Show a cluster breaking apart into pins.
3. (0:20) Open Layers. Switch Events off, then back on.
4. (0:30) Search "bakery", press Enter. The map flies to Rosa's Bakery and the popup opens.
5. (0:40) Click the **Issues** chip. Click "Sidewalk closed in front of the bakery": the popup shows step 2, Acknowledged.
6. (0:50) Copy the link, open it in a new tab: the same view and the same pin come back.
7. (1:00) Recenter. Done.

Save the video as `PinPoint_map_demo_backup.mp4` and keep a copy on your phone and in the team folder.

## 4. When all done

Add a comment on KAN-33 listing what you checked and on which devices, attach the recording, then move the card to Done.
