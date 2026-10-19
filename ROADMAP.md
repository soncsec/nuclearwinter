# Nuclear Winter — Roadmap

> **Status:** APPROVED by owner 2026-10-18. Every milestone ends with something playable or visible on staging.

## Progress

| Milestone | Status |
|---|---|
| M0 Setup | Done |
| M1 Walking skeleton (one wave, released to production) | Done: owner played on PC and phone 2026-10-18; phone frame rate 60 fps average, 54 worst (2026-10-19) |
| M2 Core game | Done |
| M3 Enemies | In progress |
| M4 The Nuclear Winter look | Not started |
| M5 Mobile and launch (MVP) | Not started |
| M6 Audio | Not started (after the MVP) |

## Risks

| # | Risk | Mitigation | When |
|---|---|---|---|
| 1 | Phones: small screen with whole-number scaling, fingers hiding the target | Device-pixel zoom (ADR-NW02); test on a real phone; 320×180 fallback | M1 |
| 2 | Difficulty curve not fun | All numbers in `tuning.ts`; dev debug overlay; play-test each milestone | M1–M3 |
| 3 | Effects too slow on phones | Additive glow by default, bloom only when fast enough (ADR-NW04); fps check | M1, M4, M5 |
| 4 | Art gaps (no bases or warheads in the pack) | Missiles as glowing lines; bases from pack props or our own simple sprites | M1, M4 |
| 5 | Photosensitivity from the nuclear flash | Flash kept under the safe limit; "reduce flashing" setting | M4 |
| 6 | Deployment | Proven pipeline from three games; first release in M1 | M1 |

## M0 — Setup

**Demonstrable result:** CI is green and a placeholder screen is on staging.

- [x] M0.1 Repo created from `soncsec/game-template`, `scripts/init-game.sh` run (ports 5177/6177/6178)
- [x] M0.2 Branch protection on `main` with the four required checks; secret scanning and vulnerability alerts on
- [x] M0.3 GitHub Pages turned on (Actions mode, `main` only); first staging deploy and ZAP scan pass
- [x] M0.4 Portal entry `games/nuclearwinter.json` (status `in-development`, devPort 5177) merged in `soncsec/games-portal`
- [x] M0.5 PROJECT.md, ARCHITECTURE.md, ROADMAP.md and CLAUDE.md approved; docs page published

**Acceptance criteria:** the four required checks pass on the first PR; staging URL serves the placeholder; ZAP reports no high-risk findings; portal PR merged.

## M1 — Walking skeleton

**Demonstrable result:** one full wave is playable at `games.soncrant.com/nuclearwinter/` on a laptop and a phone.

- [x] M1.1 384×216 canvas with device-pixel whole-number zoom and the portrait "rotate" overlay (ADR-NW02)
- [x] M1.2 Copy the first art (one skyline background, one explosion) into `public/assets/`, list it in CREDITS.md
- [x] M1.3 Logic: geometry, world state and fixed-step update, unit tested (ADR-NW03)
- [x] M1.4 Six cities and three bases on screen (placeholder sprites allowed)
- [x] M1.5 Tap or click fires a counter-missile that explodes at the target; the blast destroys warheads
- [x] M1.6 One wave of plain warheads that destroy cities on impact; score per kill
- [x] M1.7 Wave end, game over and restart
- [x] M1.8 Playwright: boots clean under the production CSP, whole-number scaling on desktop and phone viewports, firing and a kill through the test hook
- [x] M1.9 First production release with smoke test; ZAP and static check results reported

**Acceptance criteria:** the owner plays one wave on staging and production, on desktop and on a phone; CI green; frame rate measured on a phone and recorded.

**Recorded 2026-10-19:** the owner's phone, production build with `?debug`: **60 fps** average, **54 fps** worst frame over the last 120 frames. All met.

## M2 — Core game

**Demonstrable result:** a complete game of classic Missile Command.

- [x] M2.1 Ammo per base, nearest-base firing, empty-base handling, optional desktop base keys
- [x] M2.2 Wave formula with hand-set first waves (ADR-NW05)
- [x] M2.3 End-of-wave bonus count-up (leftover ammo, surviving cities), bases restored
- [x] M2.4 Bonus city every 10,000 points
- [x] M2.5 High score saved in localStorage
- [x] M2.6 Title screen, pause and resume, game-over screen
- [x] M2.7 Debug overlay (wave, counts, fps): dev builds, and production with `?debug` (owner, 2026-10-19, to measure phones)
- [x] M2.8 Wave score multiplier: kill points and the end-of-wave bonus rise every two waves up to a cap (approved 2026-10-18)
- [x] M2.9 WebKit added to the Playwright matrix, desktop and phone (approved 2026-10-18)

**Acceptance criteria:** a full game from title to game over and back; scoring rules (including the multiplier) unit tested; high score survives a reload; CI runs WebKit.

## M3 — Enemies

**Demonstrable result:** all four enemy types appear as the waves get harder.

- [x] M3.1 Splitting warheads (MIRVs)
- [x] M3.2 Bombers and satellites that cross the sky and launch warheads
- [x] M3.3 Smart bombs that steer around blasts
- [x] M3.4 Enemy mix added to the wave formula, with their point values
- [x] M3.5 Daily challenge: same waves for everyone each day (seed from the UTC date), separate best score (moved from M2 on 2026-10-18, so the enemy roster is final first)
- [x] M3.6 Separate random streams for gameplay and visuals (ADR-NW08), before M4 adds particles
- [x] M3.7 Build number on the title screen, so play-test reports name the build
- [ ] M3.8 Tuning session with the owner, using the debug overlay; the agreed numbers go into `tuning.ts`

**Acceptance criteria:** each enemy's behaviour unit tested; each appears by the wave set in `tuning.ts`; the daily challenge gives the same waves for the same date; owner play-test.

## M4 — The Nuclear Winter look

**Demonstrable result:** the finished visual style.

- [ ] M4.0 Look mock-up: one screenshot of the finished style (ash, darkening sky, glow, city-hit flash) approved by the owner before the effects are built
- [x] M4.1 Final art: skyline layers, cities, bases, explosions, night sky
- [ ] M4.2 Glowing missile trails and blast glow (additive), particles
- [ ] M4.3 Screen shake and the city-hit flash, kept under the safe-flash limit
- [ ] M4.4 Falling ash and a darkening sky that thicken as cities are lost
- [ ] M4.5 Settings screen: "reduce flashing" (also turns off screen shake) and vibration, saved in localStorage; mute joins it in M6
- [ ] M4.6 Press Start 2P HUD and screens
- [ ] M4.7 Optional bloom filter, switched off automatically when the frame rate drops (ADR-NW04)
- [ ] M4.8 Phone vibration on city hits (Vibration API where supported), with a setting

**Acceptance criteria:** owner approves the look on staging; 60 fps on a laptop; no flash exceeds three per second.

## M5 — Mobile and launch (MVP)

**Demonstrable result:** Nuclear Winter has a card on the portal and plays on desktop, phone and tablet.

- [ ] M5.1 Touch tuning on real phones and tablets (target size, no page scrolling or zooming)
- [ ] M5.2 Automatic quality setting and frame-rate check on phones
- [ ] M5.3 Load-time check (under 2 seconds on the local network)
- [x] M5.4 Portal card image (256×192) and status `live` (portal PR #25, merged and released 2026-10-18 at the owner's request)
- [ ] M5.5 Release 1.0 to production; production check workflow passes

**Acceptance criteria:** every non-functional requirement in PROJECT.md met and recorded; owner signs off the MVP.

## M6 — Audio (after the MVP)

- [ ] M6.1 Owner decides the audio approach (generated or CC0 pack)
- [ ] M6.2 Sound effects for launches, blasts, city hits, wave bonus and game over; mute setting

**Acceptance criteria:** owner approves the sound on staging.
