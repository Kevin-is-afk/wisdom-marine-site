# Wisdom Marine Equipment Repairing LLC: website

Static site (no build step). Ship repair and dry docking at Dubai Maritime City.

- `index.html`: the whole page
- `css/site.css`: styles (design tokens follow DESIGN.md)
- `js/site.js`: reel (hero tile > panel > service wheel), drifting cards, nav, form
- `js/ship.js`: 3D ship for the services wheel (three.js, bundled; built from `src/ship.src.js`)
- `assets/models/ship.glb`: the ship model the wheel flies around
- `tools/ship/`: build tools for the model and bundle (not needed to deploy)
- `scrollcraft/`: scroll engine used for pinning, the photo rail and fade-ins
- `assets/img/`: job photos and the stitched map. `assets/video/hero-reel.mp4`: hero loop

## Run locally
Open `index.html`, or serve the folder: `npx serve .`

## Deploy on Vercel
Import this repo in Vercel. Framework preset: **Other**. Leave build command and output directory empty (the repo root is the site).

## 3D ship (services wheel)
`assets/models/ship.glb` is loaded by `js/ship.js` (from `file://` it reads the embedded copy in `js/ship-model.js`, which `npm run model` regenerates). As the wheel turns, the camera flies to the part of the ship each service relates to, tilts the model between stops, and glows that part. If WebGL or the model is unavailable (or the page is opened from `file://`) the page falls back to the photos.

Rebuild after editing:
```bash
cd tools/ship && npm install
npm run model    # regenerates assets/models/ship.glb from model.js
npm run bundle   # rebuilds js/ship.js from src/ship.src.js
```
To use a different model, replace `ship.glb` with one that keeps these node names: `hl_dock`, `hl_barge`, `hl_pipes`, `hl_crane`, `hl_engine`, `hl_prop` (groups that glow) and `ov_waterline`, `ov_hullside`, `ov_bow` (thin overlay meshes that fade in). Camera views per service are in `VIEWS` in `src/ship.src.js`.

## Video slots
The reel has four video slots, one per discipline (`data-video-slot` in `index.html`). `docking` plays `assets/video/hero-reel.mp4`. To add another clip, give its `<video>` a `src`.

## Credits
Map: © OpenStreetMap contributors (ODbL), stitched into `assets/img/map-yard.webp`.
