# Nuclear Winter — Project

> **Status:** APPROVED by owner 2026-10-18.

## 1. Summary

Nuclear Winter is a browser arcade game in the spirit of Missile Command. Nuclear warheads rain down on six cities. The player taps or clicks to launch counter-missiles from three bases, and their blasts destroy anything they touch. It keeps the retro feel (pixel art, chunky font, glowing vector trails) with a modern finish: light bloom, particles, screen shake, and a sky that darkens with falling ash as cities are lost.

## 2. Goals

- A complete, replayable arcade game on the Soncrant Arcade portal.
- Plays well on desktop, phone and tablet, with mouse or touch.
- Built and released with the same stack, checks and pipeline as the other Soncrant Arcade games.

## 3. Users

Casual players visiting `games.soncrant.com`, on any current browser and device. No accounts and no personal data.

## 4. Scope

### In scope (version 1.0, the MVP)

| Area | Decision |
|---|---|
| Genre and camera | Fixed-screen, landscape arcade defense (Missile Command style) |
| Controls | Tap or click where a counter-missile should explode; the nearest base with ammo fires. Optional desktop keys pick a specific base. Pause button. |
| Defenses | 6 cities and 3 missile bases. Each base has limited ammo per wave and is restored between waves. |
| Enemies | Introduced as waves progress: plain warheads, warheads that split mid-flight (MIRVs), bombers and satellites that launch missiles, and smart bombs that dodge blasts |
| Waves | Endless. The first few are tuned by hand, then a formula raises warhead count, speed and the enemy mix. |
| Scoring | Points per kill, multiplied by a wave multiplier that rises every two waves up to a cap (as in the arcade game); end-of-wave bonus for leftover ammo and surviving cities, multiplied the same way; a bonus city every 10,000 points. Game over when all cities are lost. High score in localStorage. |
| Theme | Falling ash and a darkening sky that thicken as cities are lost; a nuclear flash when a city is hit, kept under the photosensitive-safe limit; a "reduce flashing" setting |
| Look | Pixel art at native resolution with whole-number scaling, plus glowing missile trails, bloom where performance allows, particles and screen shake |
| Screens | Title, game, wave-bonus tally, game over with high score, pause |
| Platforms | Desktop, phone and tablet browsers. Landscape only; portrait shows a "rotate your device" message. |
| Art | Shared art pack (`legacy/`, CC0): city skylines (Warped Synth City / Urban Landscape), explosion packs, space or night-sky backgrounds. Gaps (bases) are filled with pack props or our own simple pixel sprites. |
| Font | Press Start 2P (SIL OFL 1.1), as in Star Destroyer and the portal |
| Daily challenge | A mode where everyone gets the same waves each day (seed from the UTC date), with its own best score saved on the device |
| Vibration | Short phone vibration when a city is hit, on devices that support it (Android browsers; Safari has no Vibration API); off when "reduce flashing" is on or vibration is turned off in settings |

### Out of scope for 1.0

- Audio. It is planned for after the MVP (milestone M6); the approach (generated sound effects or a CC0 pack) will be decided with the owner then.
- Online leaderboards, accounts, multiplayer, analytics.
- Installing as an app and offline play (dropped 2026-10-18: service workers need HTTPS and the games host stays on HTTP, ADR-010).
- Portrait-mode layout.

## 5. Constraints (shared by every Soncrant Arcade game)

- Browser only, single player.
- No accounts, payments, analytics, cookies or third-party requests. localStorage holds only the high scores (normal and daily challenge) and the settings (reduce flashing, vibration).
- Art keeps its native pixel style; whole-number scaling only.
- Served at `games.soncrant.com/nuclearwinter/` over HTTP (ADR-010), behind the security headers in the portal's Apache config.

## 6. Non-functional requirements

- 60 fps on a mid-range laptop; playable frame rate on a mid-range phone (quality drops automatically when needed).
- Loads in under 2 seconds on the local network.
- Passes every CI check, CodeQL, gitleaks and the ZAP baseline scan.

## 7. Definition of success

A complete, replayable game, live on the portal, playable on desktop, phone and tablet, meeting the requirements above.

## 8. Decisions confirmed by the owner

| Date | Decision |
|---|---|
| 2026-10-18 | Slug `nuclearwinter`, repo `soncsec/nuclearwinter` (public, from `game-template`) |
| 2026-10-18 | Ports: dev 5177, preview 6177, Playwright 6178 |
| 2026-10-18 | Desktop, phone and tablet; mouse or touch |
| 2026-10-18 | Gameplay defaults: 6 cities, 3 bases, four enemy types, endless waves, scoring as above, ash and darkening sky theme |
| 2026-10-18 | Audio after the MVP; options to be discussed then |
| 2026-10-18 | Press Start 2P font, reused from Star Destroyer |
| 2026-10-18 | "Reduce flashing" setting; city-hit flash kept under the safe limit |
| 2026-10-18 | Standing approval for production releases after each merge |
| 2026-10-18 | Added to scope: daily challenge, phone vibration |
| 2026-10-18 | Install as an app and offline play: dropped (would need HTTPS; the games host stays on HTTP) |
| 2026-10-18 | Wave score multiplier added to the scoring rules |
| 2026-10-18 | Daily challenge moved after the enemies (M3), so the roster is final before the waves are fixed by date |
| 2026-10-18 | WebKit added to the Playwright matrix (iPhones only run WebKit) |
| 2026-10-18 | GitHub auto-merge turned on: the owner approves and enables it per PR; the PR merges when CI passes |
| 2026-10-18 | Portal releases for this game's card need no approval per release |

## 9. Open questions

1. Audio approach (before M6).
