# Nuclear Winter — Roadmap

> **Status:** APPROVED by owner 2026-10-18. Every milestone ends with something playable or visible on staging.

## Progress

| Milestone | Status |
|---|---|
| M0 Setup | Done |
| M1 Walking skeleton (one wave, released to production) | Done: owner played on PC and phone 2026-10-18; phone frame rate 60 fps average, 54 worst (2026-10-19) |
| M2 Core game | Done |
| M3 Enemies | Done: owner play-test and tuning 2026-10-19 |
| M4 The Nuclear Winter look | Done: owner approved the look and the laptop speed with bloom on, 2026-10-19; vibration not felt on a device (the owner has no Android phone, and iPhones have no Vibration API), covered by the e2e tests |
| M5 Mobile and launch (MVP) | Done: owner signed off the MVP 2026-10-19; 1.0 live the same day |
| M6 Audio | In progress: sounds in the game; waiting for the owner to approve them on the live game |

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
- [x] M3.8 Tuning session with the owner, using the debug overlay; the agreed numbers go into `tuning.ts` (2026-10-19: wave 1 good, hard from wave 6, speed fair, MIRVs fun, smart bombs fine; ammo raised 20%, from 10 to 12 missiles per base)

**Acceptance criteria:** each enemy's behaviour unit tested; each appears by the wave set in `tuning.ts`; the daily challenge gives the same waves for the same date; owner play-test.

## M4 — The Nuclear Winter look

**Demonstrable result:** the finished visual style.

- [x] M4.0 Look mock-up: one screenshot of the finished style (ash, darkening sky, glow, city-hit flash) approved by the owner before the effects are built (approved 2026-10-19; frames in `docs/look/`, cities to be a bit darker)
- [x] M4.1 Final art: skyline layers, cities, bases, explosions, night sky
- [x] M4.2 Glowing missile trails and blast glow (additive), particles
- [x] M4.3 Screen shake and the city-hit flash, kept under the safe-flash limit
- [x] M4.4 Falling ash and a darkening sky that thicken as cities are lost
- [x] M4.5 Settings screen: "reduce flashing" (also turns off screen shake) and vibration, saved in localStorage; mute joins it in M6
- [x] M4.6 Press Start 2P HUD and screens (every text uses it at 8 or 16 px; loaded before the first screen)
- [x] M4.7 Optional bloom filter, switched off automatically when the frame rate drops (ADR-NW04)
- [x] M4.8 Phone vibration on city hits (Vibration API where supported), with a setting

**Acceptance criteria:** owner approves the look on staging; 60 fps on a laptop; no flash exceeds three per second.

## M5 — Mobile and launch (MVP)

**Demonstrable result:** Nuclear Winter has a card on the portal and plays on desktop, phone and tablet.

- [x] M5.1 Touch tuning on real phones and tablets (target size, no page scrolling or zooming) (owner 2026-10-19: feels good)
- [x] M5.2 Automatic quality setting and frame-rate check on phones (bloom switches itself off when frames are slow, M4.7; owner 2026-10-19: phone frame rate good)
- [x] M5.3 Load-time check (under 2 seconds on the local network): `scripts/load-time.mjs`; production 2026-10-19, 10 first visits: median 1.36 s, worst 1.52 s, 496 KiB (measured while the dev machine was heavily loaded)
- [x] M5.4 Portal card image (256×192) and status `live` (portal PR #25, merged and released 2026-10-18 at the owner's request)
- [x] M5.5 Release 1.0 to production; the release script's production smoke test passes (wording agreed with the owner 2026-10-19: there is no separate production check workflow, as GitHub's runners can't reach the server). Released 2026-10-19 as `20261020T024155Z-acc10e67` (tag `v1.0.0`): 412 e2e tests, smoke test passed, ZAP 0 failures

**Acceptance criteria:** every non-functional requirement in PROJECT.md met and recorded; owner signs off the MVP.

**Non-functional requirements (recorded 2026-10-19):**

| Requirement | Result |
|---|---|
| 60 fps on a mid-range laptop | Met: owner checked with `?debug` and bloom on |
| Playable frame rate on a mid-range phone, quality dropping automatically | Met: 60 fps average, 54 worst (M1); owner found it good after the M4 effects; bloom switches itself off when frames are slow |
| Loads in under 2 seconds on the local network | Met: production median 1.36 s, worst 1.52 s (M5.3) |
| Passes every CI check, CodeQL, gitleaks and the ZAP baseline scan | Met: every merge to `main` passes all of them; ZAP 0 failures |

**Owner sign-off:** MVP signed off 2026-10-19.

## M6 — Audio (after the MVP)

- [x] M6.1 Owner decides the audio approach (generated or CC0 pack): generated in code with the Web Audio API (ADR-NW09, owner 2026-10-20)
- [x] M6.2 Sound effects for launches, blasts, city hits, wave bonus and game over; mute setting. First a sound sampler page for the owner to hear and approve the sounds, then they are wired into the game. Sampler approved 2026-10-20, with two extras (an "empty" click when no missile can fire, and a bonus-city jingle)

**Acceptance criteria:** owner approves the sound on staging.
