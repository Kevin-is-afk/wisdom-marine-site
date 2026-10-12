# Wisdom Marine: build brief (v2)

> Self-authored under delegation, not interviewed. The reference for the scroll choreography is a screen recording the client supplied (a tile that grows into a full-bleed panel, a service wheel, a card rail, drifting cards).

## Evidence (from the old site)
- Wisdom Marine Equipment Repairing L.L.C, Shed No. 385, Dubai Maritime City. +971 4 5148821, operations@wisdommaritime.com, Mon to Fri 08:00 to 17:00.
- Nine listed services, five listed strengths plus a commitment, three written policies, mission text, 17 real job photos.
- No verified statistics. The only number used is **9**, the count of listed services.

## Structure and score
| # | Section | Device | Notes |
|---|---|---|---|
| 1 | Reel (6.6vh, pinned) | bespoke clip-path growth + wheel, cloud `parallax` | Hero tile grows into a rounded full-bleed panel (0 to 20%), headline turns white and hands over (27 to 34%), then the nine services scroll as a wheel (36 to 94%) while the panel background crossfades per discipline |
| 2 | Work (4.2vh) | `pan` | horizontal photo rail |
| 3 | Mission | `reveal` + `kinetic` | orange feature card, photo wipes in, quote assembles by line |
| 4 | Commitments (3.8vh, pinned) | bespoke drift | six tilted cards pass behind a centred heading at different speeds |
| 5 | Policies | `in` stagger + accordion | full policy text |
| 6 | Contact | `in` + `magnet` | dark band, form card, map |

Smoothness: the page renders a smoothed copy of scroll progress (frame-rate independent ease), so motion glides rather than stepping with wheel notches. All of it is `transform`, `opacity` and `clip-path`.

## Video placeholders (to build later)
Four slots in the reel, one per discipline, each a poster photo plus an empty `<video class="slot-video" data-video-slot="...">` in `index.html`:
`docking`, `steel-piping`, `mechanical`, `surface-treatment`.
To add a clip, set that element's `src`. The script plays it while its layer is visible and pauses it otherwise. Remove the `.slot-tag` span when all four are in. Use short, muted, looping, landscape clips.

## Removed from v1
The tabbed services stage and the "scope of works" code panel (it did not fit and switched in steps). The service list now lives in the wheel.

## Fingerprint
| Grammar | Nav | Hero | Act shape | Close | Signature |
|---|---|---|---|---|---|
| Doc-grade band stack | sticky white bar + promo strip | tile grows into full-bleed panel | pin, pan, flow, pin, flow, flow (~18vh) | dark teal band, form card, magnet call pill | one stage that carries the hero into a service wheel |

## Verified
Desktop 1920, 1440, 1280x720, 1024; tablet 820, 768; phone 390, 360, 320. No horizontal overflow, no console errors, drawer, wheel item clicks, "Services" nav jump, form validation, reduced-motion fallback (static, no pinning), `http://` and `file://`.
Not verified: a real phone (touch scrolling), delivery of the mailto form, and the video slots (no clips yet).
