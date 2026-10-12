# Wisdom Marine Equipment Repairing LLC: website

Static site (no build step). Ship repair and dry docking at Dubai Maritime City.

- `index.html`: the whole page
- `css/site.css`: styles (design tokens follow DESIGN.md)
- `js/site.js`: reel (hero tile > panel > service wheel), drifting cards, nav, form
- `scrollcraft/`: scroll engine used for pinning, the photo rail and fade-ins
- `assets/img/`: job photos and the stitched map. `assets/video/hero-reel.mp4`: hero loop

## Run locally
Open `index.html`, or serve the folder: `npx serve .`

## Deploy on Vercel
Import this repo in Vercel. Framework preset: **Other**. Leave build command and output directory empty (the repo root is the site).

## Video slots
The reel has four video slots, one per discipline (`data-video-slot` in `index.html`). `docking` plays `assets/video/hero-reel.mp4`. To add another clip, give its `<video>` a `src`.

## Credits
Map: © OpenStreetMap contributors (ODbL), stitched into `assets/img/map-yard.webp`.
