# Design: One-Click Share/Publish + Remix (P2 item 3)

- **Status:** PROPOSED — implementation-ready; builder needs no further product decisions except items in §8.
- **Author:** product-planner (strategy lane, acting CEO task 2026-08-25)
- **Branch:** `design/share-publish` (off `main` `1fa1e96`)
- **Inputs:**
  - `docs/market-research-2026-08.md` implication **6**: share links must work from a no-auth local project, paired with remix; feeds with play counts are how Websim/Astrocade grew; remix lineage is their retention loop; our wedge is real Phaser TS export (takeaway #8).
  - `docs/product/roadmap-2026H2.md` P2 item 3: "One-click share/publish path (static export hosting or downloadable bundle with clear instructions)."
  - `docs/design/no-auth-onboarding.md` (shipped slices 1b/2/2d): landing gallery, template launch, guided mock edit, storage-only funnel (`clawgame.events.v1`) — the activation baseline that gates this lane per research implication 5.
- **Scope guard:** v1 = one-click share link + recipient play + one-click remix into an editable local copy. NO feed/discovery surface, NO accounts, NO QR codes, NO custom domains, NO comment/social features. Feed with play counts is v2 once links exist to count.

---

## 1. User stories & acceptance criteria

### US-1: Creator shares a game

**Story:** As a creator I finished (or mock-edited) a game in the preview and want a link I can paste anywhere — one click, no deploy knowledge, no account.

**Acceptance criteria:**
1. A **Share** button is visible in the Game Preview top bar (primary) and in the Editor toolbar (same handler). One click opens the share popover; a second confirms ("Create link"). Total 2 clicks to a copied link.
2. Share always exports **fresh** (`phaser-html`, `exportService.exportToPhaserHTML`) then hosts it — never re-hosts a stale artifact from a previous edit.
3. Success state shows: the link, Copy (writes to clipboard, confirmed by toast), Open (new tab), and the honest availability note (§2 S3).
4. Link works in a fresh browser profile with no account, no install: game boots and plays.
5. Failure states are explicit: export failure and host failure each show a distinct error toast; no silent dead link is ever put on the clipboard.
6. Works logged-out against fresh clone + `pnpm dev` (dev-first rule): web :5173/:5174 + API :3000, no env vars required beyond defaults.

### US-2: Friend opens a shared link (no account, no install)

**Story:** As a recipient I click a link in a chat and am playing the game within seconds — no signup, no download, no editor UI around it.

**Acceptance criteria:**
1. Opening `<HOSTED_BASE_URL>/api/hosted/<hostedId>/view` boots the game immediately (canvas visible ≤ ~3 s on localhost; template-size games) — instant play, zero interstitials.
2. A slim injected top bar shows: game name, **"🎮 Remix this game"** button, "Made with ClawGame" label. No fake/dead links (current `https://clawgame.dev` injection must be replaced — see §3.4).
3. The bar never blocks play: dismissible (session-only), canvas remains fully interactive either way.
4. Unknown/expired/deleted `hostedId` → clean 404/410 HTML page, not a stack trace.
5. Zero console errors during boot for template games (parity with `e2e/export-smoke.spec.ts` standard).

### US-3: Remixer forks an editable copy

**Story:** As a recipient who clicked Remix I get my own editable copy of this game inside ClawGame and can immediately change something and play it — without an account.

**Acceptance criteria:**
1. Clicking "Remix this game" opens `<SHARE_WEB_ORIGIN>/remix/<hostedId>`; the page auto-imports (no form): shows progress, then lands on `/project/<newId>/preview`.
2. The remix is a **new project id**, fully independent: editing/removing the original later does not affect it; re-sharing it creates a new hosted copy.
3. The remixed copy appears in the landing "Continue building" strip (localStorage recent index) with lineage recorded (`remixedFrom`).
4. After remix, Start Game plays the imported scene; applying any first-run recipe chip or manual save works exactly as on a native project (scene JSON path).
5. Remix of a payload >25 MB fails with a clear message (size cap, §7 risk 4), not a browser hang.
6. Remixing a legacy share (pre-payload, no `.share.json`) hides the Remix button and returns a clear error from the endpoint — graceful degradation, not a crash.

---

## 2. UX flow

**S1 — Creator: Share entry points (existing surfaces, small additions)**
- `GamePreviewPage` top bar (back · title · status · device picker): add **Share** icon-button at the right end. This is the primary entry — the preview is where the P2 activation loop ends, so the viral loop starts there.
- `EditorPage` toolbar: same Share button, same handler (component reused).
- `ExportPage` Publish step stays as-is for power users (download + host already wired there); the Share button is the shortcut that skips the wizard.

**S2 — Creator: SharePopover (new component, ⭕)**
Click Share → popover card:
1. If no fresh export for current scene state: single primary action **"Create share link"** → runs export→host chain (~seconds, inline spinner).
2. On success the card flips to result state: read-only link field, [Copy] [Open] buttons, meta line: "Anyone with the link can play and remix your game."
3. Availability note (honesty rule, matches research "edits don't stick kills trust"): *"Your link works while your ClawGame server is running."* (Wording TBD-final; CEO may amend, see §8 Q1.)
4. Existing hosted links for this project listed below (from `GET /api/projects/:id/hosted`), newest first, each with copy + delete.

**S3 — Recipient: landing experience (modify existing injection)**
The link serves the standalone phaser-html instantly (no redirect, no app shell). The only chrome is the injected slim bar (already exists via `hostedService.enhanceForHosting`, reworked):
- Left: game title (static, baked at host time).
- Right: **Remix this game** → `${SHARE_WEB_ORIGIN}/remix/${hostedId}` · "Made with ClawGame" (plain text or link to real domain once CEO picks one — currently `https://clawgame.dev` is a dead placeholder and MUST NOT ship).
- Bar is position:fixed, ~32 px tall, semi-transparent; game container offset preserved as today.

**S4 — Remixer: import transition (new route, ⭕)**
`/remix/:hostedId` renders outside `AppLayout` (full-screen, minimal): centered spinner + step text ("Fetching game…" → "Creating your copy…" → redirect). On success: `navigate('/project/<newId>/preview', { replace: true })`. On failure: error card with [Try again] + explanation. No forms, no naming step — auto-name `<original> remix` (collision-safe enough locally; id is the real key).

**Cross-links back into existing sections:** remixed project lands in the exact same preview surface native projects use — first-run recipe chips (slice-2d), replay controls, Share button (closing the loop: remixers become creators). Recent strip shows it with a subtle "remix" tag when `remixedFrom` is set.

---

## 3. Technical approach

### 3.1 What already exists (build on these; do not duplicate)

| Capability | Location | Status |
|---|---|---|
| Standalone single-file Phaser 4 export w/ embedded data-URI assets | `apps/api/src/services/exportService.ts` (`exportToPhaserHTML`) | Proven: `e2e/export-smoke.spec.ts` boots all 3 templates headless, zero errors |
| Self-hosted static serving of exports | `apps/api/src/services/hostedService.ts` + `routes/hostedRoutes.ts` (registered `index.ts:55`) | Working: `POST /api/projects/:projectId/exports/:filename/host` → copies to `HOSTED_DIR` (`./data/hosted`), injects nav+metadata, `GET /api/hosted/:hostedId/view` serves HTML |
| Hosted metadata sidecar + expiry + cleanup + list/delete/health | `hostedService.ts` (`<id>.meta.json`, default 30 d expiry) | Working; expiry default is wrong for virality (§3.4) |
| ExportPage Configure→Export→Publish wizard incl. host + copy-link | `apps/web/src/pages/ExportPage.tsx`, `api/client.ts:464–482` | Working |
| File-based project store + create-with-fresh-id | `projectService.ts` (`PROJECTS_DIR`, `createDefaultProject` generates new id) | Working |
| File write API (used by template launch + AI apply) | `PUT /api/projects/:id/files/*` → `fileService.writeFileContent` | Working |
| Assets on disk per project | `assetService.ts:18` — `ASSETS_DIR ./data/assets/<projectId>` | Working |
| Local recent-projects index | `apps/web/src/utils/recentProjects.ts` (`clawgame.recent-projects.v1`) | Working |
| Storage-only funnel events | `apps/web/src/utils/activationEvents.ts` | Working |

**Implication:** option (b) below is not a proposal — it is shipped infrastructure. v1 work is: creator-side one-click wiring, share payload, remix endpoint/route, injection rework, counters.

### 3.2 Options evaluated

**(a) Static bundle download + manual host.** Already exists (ExportPage download). Zero new infra; recipient friction is maximal (download → find host → upload → configure) — fails market implication 6 ("one-click publish/share links are table stakes"). Verdict: keep as secondary action only. Not the v1 path.

**(b) Self-hosted static serving route from the API.** Shipped (§3.1). One click creator-side; recipient gets instant play; remix possible because server holds source. Tradeoffs: link lives only while the API runs (structural self-host reality — must be stated honestly in UI, §8 Q1); serving user HTML on the API origin is stored-XSS surface (mitigation §7 risk 2); flat-dir storage scales to thousands, not millions of shares (fine for v1; scaling notes §3.5).

**(c) Link encodes project (URL payload) vs server-stored share tokens.**
- *URL payload* (project JSON in fragment `#...`): pros — no server storage, works from any static file host, privacy (nothing stored). Cons — fatal size math: template scenes alone are multi-KB JSON and exported games embed every asset as base64 data URI (a single sprite pushes a URL far past the ~2k-char practical limit; chat apps truncate aggressively); no recipient-side play counting without a beacon server anyway; unshareable-by-accident breakage class. Verdict: rejected for v1. Revisit only if a pure-static deployment target (no API) becomes a requirement.
- *Server-stored capability token*: the existing `hostedId` IS the token — opaque id → stored artifact. Pros: short clean links, works today, enables counters + remix payload + later feed. Cons: requires running server (same as b), privacy = anyone with the link plays (capability-URL model — acceptable, matches Websim; unguessability required, §3.4).

**Recommendation (v1): (b) + server-stored tokens + remix payload sidecar.** Rationale: both halves are proven in-repo (export e2e-proven; hosting routes registered and ExportPage-wired); token model is the only variant that supports play counts and remix within current architecture; URL-payload fails on size physics, not taste.

### 3.3 v1 architecture (delta on what exists)

```
Creator                          Server (API :3000)                     Recipient
───────                          ─────────────────                      ─────────
Share button (preview/editor)
  └─ POST /api/projects/:id/export {format:'phaser-html'}   (fresh, always)
  └─ POST /api/projects/:id/exports/:filename/host
       expiresAt: null (v1 default change)
       writes data/hosted/<id>.html          ─── link ───────────────►  GET /api/hosted/<id>/view
       writes data/hosted/<id>.share.json        (chat/sms/whatever)      instant play + injected bar
       writes data/hosted/<id>.meta.json                                     └─ Remix button ──► /remix/<id>
                                                                               (web origin)
                                                                             GET  /api/hosted/<id>/source
POST /api/hosted/<id>/events  ◄──────── counters ○──────────────────────    POST /api/hosted/<id>/remix
{type:'play'|'remix'}                                                        └─► new project id, files copied,
▲                                                                                navigate /project/<newId>/preview
└─ activationEvents.log('share_created', …) (browser-local)
```

New/changed endpoints (all inside existing routes files):
1. `hostedRoutes`: `GET /api/hosted/:hostedId/source` → `.share.json` (404 if absent → legacy-share case, US-3 AC 6).
2. `hostedRoutes`: `POST /api/hosted/:hostedId/remix` → creates the editable copy server-side (see §4), returns `{ id }`.
3. `hostedRoutes`: `POST /api/hosted/:hostedId/events` body `{ type: 'play' | 'remix' }` → increments counters in `.meta.json` (no PII, fire-and-forget from client).
4. `HostedOptions.expiresInDays` semantics: `null/0` = never expires; share-path calls pass non-expiring; ExportPage power path keeps its 30-day default unless CEO says otherwise (§8 Q3). `cleanupExpired` untouched (only cleans entries that HAVE expiry).
5. Web: `/remix/:hostedId` route (outside AppLayout) + `ShareButton`/`SharePopover` components mounted in `GamePreviewPage` top bar and `EditorPage` toolbar.

### 3.4 Required fixes in existing code (small, in-scope)

1. **`generateHostedId()`** (`hostedService.ts`): `game_${Date.now()}_${Math.random()…}` is time-structured and weakly random — capability URLs must be unguessable. Replace with `crypto.randomUUID()` (node ≥20 baseline). Old ids keep resolving (lookup is filename-based).
2. **`enhanceForHosting()`**: remove dead `https://clawgame.dev` link (defensibility rule — no fake claims); add Remix button (href baked at host time from new env `SHARE_WEB_ORIGIN`, default `http://localhost:5173` — TODO-verify actual dev port in this checkout before merging slice 2); keep expiry line only when expiry exists (non-expiring shares must not print "Expires: Invalid Date").
3. **Play-event hook into served HTML:** extend the injected script so game start posts `POST /api/hosted/<id>/events {type:'play'}` once per page load (`navigator.sendBeacon` fallback fetch, try/catch silent — recipient browsers must never see errors if counters fail).

### 3.5 Scaling & privacy implications (recorded, actionable later)

- **Storage:** each share ≈ 2× asset bytes (compiled html + `.share.json`). Flat dir + `readdir` listing degrades ~O(10⁴ shares). Later: object storage + hashed subdirs + CDN in front of `/view`; no schema change needed (ids already opaque).
- **XSS surface:** `/view` serves arbitrary user-generated HTML on the API origin. Today: no auth cookies exist (no-auth stack), so session theft is N/A — but the moment auth lands anywhere on this origin, this becomes an account-theft vector. Mitigations now: `Content-Security-Policy: sandbox allow-scripts allow-pointer-lock` header on `/view` responses (breaks nothing we ship; blocks same-origin reads), plus `X-Content-Type-Options: nosniff`. Later: serve games from a separate origin/domain.
- **Privacy posture:** capability URL = anyone holding it can play AND view full source (that is the wedge, but make it explicit — §8 Q2). Counters store aggregate numbers only, no IPs, no fingerprints. Deletion: creator deletes share → html + meta + share.json all removed (delete endpoint extended to remove `.share.json` too).
- **Abuse:** unauthenticated host endpoint = free static hosting for whoever reaches the API. Local/self-host reality keeps this low-risk; rate-limit + total-size cap noted as pre-public-host requirement (§8 Q1).

---

## 4. Remix mechanics

**Payload (written at host time):** `data/hosted/<hostedId>.share.json`

```jsonc
{
  "schema": 1,
  "originProjectId": "<creator's projectId>",
  "originHostedId": "<hostedId>",
  "sharedAt": "ISO-8601",
  "project": {                       // verbatim clawgame.project.json content
    "name": "...", "genre": "...", "artStyle": "...", "description": "...",
    "settings": { "width": 1280, "height": 720, "backgroundColor": "#1a1a2e", "gravity": {"x":0,"y":0.5} }
  },
  "scene": { … },                    // verbatim scenes/main-scene.json
  "scripts": { "scripts/game.ts": "…", "scripts/player.ts": "…" },  // present project files only
  "assets": [ { "id": "…", "name": "…", "mimeType": "image/png", "dataUri": "data:…" } ]  // [] for template projects
}
```
Built from the same sources `exportToPhaserHTML` already reads (`projectService.getProjectDetail`, `scenes/main-scene.json`, `assetService.listAssets` + `getAssetFile` → base64). Size cap 25 MB serialized (reject host with clear error; typical template shares ≪ 1 MB — TODO-verify real numbers in slice 2 QA).

**Import (server-side, one endpoint):** `POST /api/hosted/:hostedId/remix`
1. Load `.share.json` (404 → legacy-share error per US-3 AC 6).
2. `projectService.createProject({ name: '<name> remix', genre, artStyle, description })` → fresh id from `createDefaultProject` (reuse, do NOT hand-roll ids).
3. Overwrite the new project's `clawgame.project.json` `settings` block with payload settings; **rewrite `project.project.id` to the NEW id before writing** — the dir-name/id/cache-key invariant (`projectService` cache + list rely on dirname === `project.project.id`) is the #1 trap here; mandate a unit test asserting it.
4. Write `scenes/main-scene.json` and each `scripts/*` via direct fs under `projectService.getProjectDir(newId)` (server-side copy — do not shuttle MBs through the web client).
5. Assets: write each `assets[]` entry into `ASSETS_DIR/<newId>/` using the same filename conventions `assetService` derives metadata from (TODO-verify exact convention in `assetService.getAssets` during slice 2; template projects have zero assets, which is the tested primary path).
6. Lineage: set `project.project.remixedFrom = originHostedId` (schema addition below), persist.
7. Return `{ id }`.

**Schema addition (@clawgame/shared):** optional `remixedFrom?: string` on `ClawGameProject['project']` and pass-through on `CreateProjectRequest` (set by the remix endpoint post-create; other callers unaffected). Additive + optional = no migration concerns with existing on-disk projects.

**Client route:** `/remix/:hostedId` → `POST /api/hosted/:id/remix` → `recordRecentProject({ id, name, remixedFrom })` (extend `RecentProjectEntry` with optional `remixedFrom`) → `navigate('/project/<id>/preview')`. Everything downstream (chips, replay, Share) works unchanged because it is a normal project.

**Lineage depth:** chain is recoverable by following `remixedFrom` → hosted meta → its `originProjectId`; v1 stores the chain implicitly, displays only "Remixed from <name>" one-liner. No tree UI until a feed exists.

---

## 5. Data model summary

| Artifact | Location | Writer | Freshness |
|---|---|---|---|
| Compiled game (single-file html) | `EXPORTS_DIR/<projectId>-<name>-phaser-<ts>.html` | `exportToPhaserHTML` at share time | Always regenerated on Share (never stale) |
| Hosted playable copy | `HOSTED_DIR/<hostedId>.html` | `hostExport` at share time | Immutable snapshot; re-share after edits creates a new hostedId (versioning by proliferation, no update-in-place in v1) |
| Share payload | `HOSTED_DIR/<hostedId>.share.json` | `hostExport` (extended) | Same snapshot semantics |
| Hosted meta + counters | `HOSTED_DIR/<hostedId>.meta.json` | `hostExport` + events endpoint | Counters monotonic; expiry nullable |
| Remix copy | `PROJECTS_DIR/<newId>/` + `ASSETS_DIR/<newId>/` | remix endpoint | Independent from origin from t₀ |
| Creator funnel events | localStorage `clawgame.events.v1` | `activationEvents.trackEvent` | Browser-local, ring buffer 500 |
| Recipient counters | `.meta.json` `counts: { plays, remixes }` | events endpoint | Aggregate only |

Source-of-truth rule: every spec claim above maps to a named file/function in §3.1 or is marked TODO-verify (two instances: dev port default; asset filename convention).

---

## 6. Build sequence (3 slices, each independently shippable)

**Slice 1 — Creator one-click share (~1 session)**
Files: `ShareButton.tsx` + `SharePopover.tsx` (+css), mount in `GamePreviewPage.tsx` top bar + `EditorPage.tsx` toolbar, `api/client.ts` (no new endpoints needed — existing export+host suffice), `hostedService.ts` (uuid ids, nullable expiry, `.share.json` writer stubbed OK to write empty-schema payload), delete-endpoint removes `.share.json`, unit tests.
AC (qa-auditor script):
- Preview top bar shows Share; 2 clicks → clipboard contains working `/api/hosted/<id>/view` URL; opening it in fresh context plays the current edited scene (verify an applied recipe edit is IN the shared build).
- Second share of the same project yields a different hostedId; old link still plays its own snapshot.
- Delete from popover removes html+meta+share.json; link then 404s cleanly.
- No "Expires:" text on new shares; legacy 30-day shares still show theirs.
- New ids contain no timestamp structure (uuid format).

**Slice 2 — Remix path (~1 session)**
Files: `hostedService.ts` (payload writer real impl + size cap), `hostedRoutes.ts` (`/source`, `/remix`), `enhanceForHosting` rework (Remix button, dead-link removal, SHARE_WEB_ORIGIN env), `packages/shared` (`remixedFrom`), `apps/web/src/routes` addition in `App.tsx` (`/remix/:hostedId`, outside AppLayout), `recentProjects.ts` extension, api tests (incl. id-rewrite invariant test), e2e happy path.
AC:
- Share → open link → Remix button visible → click → land in preview of a NEW project id; Start Game plays identical scene; original project untouched.
- Edit remixed copy (apply a recipe chip) → re-share → new link reflects the edit; origin link unchanged.
- `project.project.id === dirname` holds for remixed project (unit test); project appears in `GET /api/projects` list and landing Continue strip.
- Legacy share (delete `.share.json` manually) → Remix button hidden, `/source` 404, `/remix` returns typed error; play still fine.
- Payload >25 MB → host-time rejection with clear toast; no partial artifacts left.

**Slice 3 — Counters + instrumentation + e2e hardening (~½ session)**
Files: `hostedRoutes.ts` (`/events`), injected-script play beacon, `activationEvents.ts` (`share_created`, `share_link_copied`), Settings diagnostics unchanged (events already visible there), `e2e/share-remix.spec.ts`.
AC:
- Playing a shared link increments `counts.plays` exactly once per page load; remix increments `counts.remixes`; malformed event bodies rejected; no PII in meta file (inspect).
- Creator log shows `share_created`/`share_link_copied` with correct props; network tab shows zero instrumentation egress besides the two counter beacons.
- E2E: create→edit→share→fetch view html (assert canvas boot like export-smoke)→remix via API→assert new project scene contains the edit. All green headless.

Dependency note: Slice 1 has no upstream dependency. Slice 2's e2e reuses export-smoke harness patterns (`e2e/export-smoke.config.ts` hermetic Phaser fulfillment). Baseline activation metrics from the onboarding funnel exist (slice-2d shipped) — share-rate denominators come from there.

---

## 7. Risks

1. **Links die when the creator's server sleeps** (highest, structural). Self-host reality: laptop closes → friend's link 404s. Mitigation: honest UI note (S2/S3); real fix is a public host — CEO decision (§8 Q1), interacts with DEPLOY-POLICY release-batch topology (ClawGame is not in any prod rotation today).
2. **Stored-XSS on API origin** via `/view`. No cookies today = low blast radius, but mandatory CSP-sandbox header in slice 1 and a standing rule: no auth/session cookies may be introduced on the API origin while it serves user HTML (flag to CEO when accounts ever land).
3. **Full source exposure in shares** (scene JSON, scripts, assets readable by any recipient). Aligned with the inspectable-code wedge but must be a conscious, labeled choice (§8 Q2); play-only share variant is the fallback if CEO rules otherwise (payload omitted, Remix hidden — one flag).
4. **Payload duplication & size.** Assets embedded twice per share (html + share.json); 25 MB cap protects the host endpoint; TODO-verify typical asset sizes in slice 2 QA before finalizing cap.
5. **Id-rewrite trap in remix** (dirname === `project.project.id` invariant). Mandated unit test (§4 step 3); failure mode otherwise is silently broken project listing/cache.
6. **Phaser CDN dependency in exported html** — offline recipients get a blank page. Known accepted tradeoff from the export-smoke design (hermetic test fulfills CDN locally); self-host bundling of phaser dist into the html is a future optimization, out of scope.
7. **Legacy hosted exports** lack payloads → graceful degradation specified (US-3 AC 6); no migration needed.
8. **Counter abuse** (POST /events spam inflates counts). Aggregates only, vanity metric in v1 — accepted; rate-limit arrives with public-host work.

## 8. Open questions for CEO

1. **Public hosting target/timeline.** Viral loop quality is capped by "link works while my server runs." Do we schedule a always-on ClawGame host (and into which deploy topology — note Amendment-10 batch/relay policy), or is v1 explicitly local-demo grade? Recommendation: ship v1 as designed now (all code is host-agnostic), decide public host after share-rate data exists.
2. **Source exposure default.** Shares include full editable source (scene JSON + scripts + assets) — this IS the remix wedge and the "real code" differentiator. Confirm include-by-default with visible "source included" labeling, or split play-only vs remixable links (adds a toggle + two UX states; my recommendation: don't split in v1).
3. **Expiry.** Current hosted default is 30 days; for a viral loop, dying links are worse than disk usage. Confirm: share-path links never expire (manual delete only), ExportPage power-path keeps 30-day default.
4. **Server-side counters vs storage-only principle.** The onboarding funnel is strictly browser-local; recipient play/remix counts require tiny server writes (aggregate integers, no PII). Confirm acceptable exception (my recommendation: yes — counts are the seed of the v2 feed and the share-loop success metric).
5. **Branding link.** Injected bar needs a real "Made with ClawGame" destination; `clawgame.dev` is a dead placeholder. Provide domain (or rule: plain text until public host exists).
6. **Remix naming.** Auto-name `<original> remix` OK, or different convention?

— product-planner, 2026-08-25
