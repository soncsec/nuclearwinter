Read `PROJECT.md` (scope), `ARCHITECTURE.md` (decisions), and `ROADMAP.md` (current task) before starting work.

## Roles

- **Owner (GitHub `soncsec`):** approves scope, architecture, merges, and production deployments.
- **Claude:** implements approved tasks, writes tests, runs checks, prepares PRs, and keeps the docs current.

## Owner priorities (2026-10-18)

- **Security is the top priority.** Never deploy anything that could be exploited, expose data that isn't meant to be reachable, let unwanted commands run, or carry any other security risk. If in doubt, don't ship it; ask.
- **Ask when anything is unclear**, including the owner's own requests. Don't guess.
- The font, the legacy art and the release pipeline work well in the other games. Keep using them, but do suggest ideas that would make the product better.
- **Get to a playable game early** so the owner can give feedback sooner. Prefer putting something playable on staging over finishing a layer completely.
- **Remind the owner** of unanswered questions and of PRs waiting for review, at the start of each response until they are handled.

## Scope boundary (other Claude sessions may be building other games)

- Change files only inside this repo. Never edit another game's folder, the portal repo, or shared assets.
- `legacy/` (the art pack) is read-only. It is a link to the shared `~/dev/games/_assets/legacy/`. Copy what you need into `public/assets/`.
- Changes another repo needs (for example, this game's portal card) go through a PR or issue on that repo, made from a separate clone (never another session's folder).
- This game's portal entry is `games/nuclearwinter.json` in `soncsec/games-portal`. Change it only by PR.
- On the production server, this game may only write to its release folder `/srv/games-releases/nuclearwinter/` and its symlink `/var/www/html/soncrant.com/pub/games/nuclearwinter` (enforced by `scripts/release-remote.sh`).
- Ports: dev **5177**, preview **6177**, Playwright **6178**. Other games use other ports.
- Other games' sessions share this machine. Stop only processes you started, by PID or by your own port. Never stop processes by name (`pkill -f vite`, `killall node`).

## Always ask the owner before

- Changing the architecture or any ADR, or adding a dependency not listed in ARCHITECTURE.md
- Changing scope (adding or dropping features)
- Destructive operations: deleting files or branches, force-pushing, rewriting history, deleting repos
- Any change on the production server or its Apache configuration
- Security decisions: CSP and header policy, HTTP vs HTTPS, SSH keys, secrets handling, permissions, CI tokens
- Adding new third-party assets (art, audio, fonts)

## Git workflow

- Never commit or push directly to `main`, and never merge PRs. The owner merges.
- One task per branch, named `feature/<roadmap-id>-<short-name>` (e.g. `feature/M1.5-player-movement`).
- Small PRs, one roadmap task each. The PR description includes:
  - a summary of the change (what and why)
  - test evidence: commands run and results, plus screenshots or GIFs for visual changes
  - the roadmap task ID and its acceptance criteria, each marked met or not met
- Commit messages are short and in the imperative mood.
- Never commit `legacy/`, `node_modules/`, `dist/`, secrets, or `.env` files.

## Quality rules

- A task is **not done** until its acceptance criteria are verified against the running game, not just because code exists.
- Never weaken, skip, or delete a test to make it pass. If a test seems wrong, explain why in the PR and ask.
- Every PR must pass: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, `npm audit --audit-level=high` (`npm run check` runs all but the audit, plus the release-script tests).
- Game rules go in `src/logic/` as plain TypeScript (no Phaser imports) with unit tests.
- Gameplay numbers go in `src/config/tuning.ts`. No magic numbers in scenes.
- Use the seeded RNG for anything random in gameplay.
- Reuse pooled objects for bullets, enemies and effects.
- The game must work on desktop, phone and tablet, with mouse or touch. Check phone-sized viewports in e2e tests.

## Security rules

- No runtime requests to third-party hosts. Everything is bundled and served from our own origin.
- Pin exact dependency versions, at least two weeks old, and commit the lockfile.
- Run static checks (CodeQL, ESLint, `npm audit`, Gitleaks) and a dynamic check (OWASP ZAP baseline) before any deployment or configuration change, and report the results.
- No personal data is collected. localStorage holds only the high score (and the "reduce flashing" setting, approved 2026-10-18).
- Never put credentials in code, the chat, or CI logs; use GitHub Actions secrets.

## Releasing

- Standing approval (owner, 2026-10-18): release to production after each merge to `main` with `scripts/release.sh deploy`. It refuses unless HEAD is `origin/main`, the tree is clean and CI (including the ZAP scan of staging) passed on that commit.
- Report the static and dynamic check results and the smoke-test result with every release.

## Environment

- Node.js comes from nvm. Run `export NVM_DIR=$HOME/.nvm; . $NVM_DIR/nvm.sh` before using `node` or `npm` in a fresh shell.
- The GitHub CLI is at `~/.local/bin/gh`.

## Docs

- Shared decisions (ADR-001 to ADR-011) live in `soncsec/star-destroyer` ARCHITECTURE.md. This game's own decisions are ADR-NW01 onward in ARCHITECTURE.md.
- Update `ROADMAP.md` checkboxes and status as tasks complete.
- Record new or changed decisions as ADRs in `ARCHITECTURE.md`, after approval.
- Update `PROJECT.md` when the owner approves scope changes.
- After changing any of the four docs, run `python3 tools/docs-page/build.py` and publish the output to this game's own docs artifact (https://claude.ai/artifact/SjPJNXMrW6PMb2P2u4iKpE, pass it as `url`). Never publish to another game's docs artifact.

## Assets

- Source pack: `legacy/` (Ansimuz Legacy Collection, CC0). Copy only the files used into `public/assets/` and list them in `CREDITS.md`.
- Keep native pixel resolution. Render with `pixelArt: true` and integer scaling.
- Font: Press Start 2P (SIL OFL 1.1), the same file Star Destroyer and the portal use (approved for this game 2026-10-18).
