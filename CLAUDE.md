# Ascend Academy Learning Hub — Architecture Notes

> For future Claude Code sessions. This is a working reference doc, not user-facing.
> Live at **learn.ascendacademy.org** (Vercel, deployed via GitHub push to `master`).

---

## 1. Stack

- **Vanilla HTML/CSS/JS** — no framework, no build step
- **Supabase** (project `jbiqzdavkwioxhtwchiy`, org "Ascend Speech & Debate", shared with AscendChat and the camp dashboard)
- **Brevo** for transactional email (welcome email + Supabase Auth SMTP)
- **Vercel** for hosting (auto-deploys on push to `master`)
- **PWA** via `manifest.json` (no service worker — relies on browser HTTP cache)
- **Eruda** for in-page mobile debugging (gated on `?debug=1` URL flag)
- **canvas-confetti** for badge celebrations

---

## 2. Repo Structure

```
/
├── index.html                  # Homepage (the "hub")
├── manifest.json               # PWA manifest
├── privacy.html, terms.html    # Legal pages
├── Pictures/                   # Logo, hero, badge graphics
├── shared/                     # All shared code lives here
│   ├── hub.js                  # Module registry, rendering, completion handling
│   ├── hub.css                 # Hub styles
│   ├── auth.js                 # Supabase client, signup/signin, profile forms
│   ├── auth.css                # Auth modal styles
│   ├── module.js               # Per-module logic (quizzes, progress, completion)
│   ├── module.css              # Module page styles
│   └── hub-events.js           # Telemetry events (logins, errors, heartbeats)
└── modules/                    # 32 module HTMLs + 5 unit exams
    ├── what-is-congress.html
    ├── how-chamber-works.html
    ├── ... (all 32)
    └── unit-1-exam.html ...
```

Module files are self-contained HTML — each includes `shared/module.css` and `shared/module.js`, sets `MODULE_ID` and `TOTAL_STEPS` globals, and defines lesson sections inline.

---

## 3. Database Schema (Supabase `public` schema)

| Table | Purpose |
|---|---|
| `hub_profiles` | User profiles (one row per signed-up user). Created at signup. Columns: `id` (FK to auth.users), `first_name`, `last_name`, `email`, `role` (student/parent/educator), `school`, `state`, `grade`, parent contact info, marketing flags |
| `hub_progress` | One row per completed module. PK `(user_id, module_id)` — upsert on conflict |
| `hub_badges` | One row per earned badge. PK `(user_id, badge_id)` |
| `hub_referrals` | Tracks invite-a-friend signups (Squad badge) |
| `hub_module_starts` | Telemetry — fires when a user opens a module |
| `hub_quiz_attempts` | Telemetry — per-question correct/incorrect |
| `hub_events` | Generic event log (login, session_start, heartbeat, module_started, error). Used by `hub-events.js` |
| `admin_users` | Shared with AscendChat/dashboard. NOT tied to `auth.users.id` — uses `email` to match. Quest is in here with a different id than his learning-hub auth.users row |
| `dq_hub_missing_email` | Data-quality view |
| `hub_synthetic_runs` | Synthetic monitoring runs |

**RLS:** Most tables enforce auth-only access. Admin reads go through `is_admin()` SECURITY DEFINER function (uses `admin_users.email` match).

**Edge functions:**
- `hub-welcome-email` (v4, Brevo-based) — fires on signup
- `hub-delete-orphan-auth` (verify_jwt:true, 10-min safety window) — cleans up auth.users rows that have no matching hub_profiles

---

## 4. Module Registry (`shared/hub.js`)

The `MODULES` array is the single source of truth for module metadata:

```js
{
  id: 'what-is-congress',     // matches modules/<id>.html
  unit: 1,
  num: '1.1',
  title: 'What Is Congressional Debate?',
  icon: '🏛️',
  duration: '25 min',
  activities: 3,              // shown in side panel; must match TOTAL_STEPS in the HTML
  badge: 'first-step' | null, // module-specific badge ID
  videoId: 'youtube-id',      // optional — adds hover preview on desktop
  desc: 'Short description…',
  file: 'modules/what-is-congress.html',
  lessons: [ {icon, text}, … ] // shown in side panel
}
```

Exam modules have `exam: true`. Unit exams award `unit-N-complete` badges.

**Badges** (the `BADGES` array): 16 badges total. Each has `id`, `emoji`, `name`, `how` (earn criteria string shown in hover tooltip).

**When adding a module:** update the array AND verify `activities` matches the actual `TOTAL_STEPS` in the module HTML (we got bit by this on Unit 1 Exam — said 15 questions when it had 10).

---

## 5. Module Page Pattern

Each `modules/*.html` is structured like:

```html
<head>
  <link rel="stylesheet" href="../shared/module.css?v=N">
  <script src="../shared/hub-events.js?v=N"></script>
  <script>
    var MODULE_ID = 'what-is-congress';
    var TOTAL_STEPS = 8;
  </script>
</head>
<body>
  <div class="topbar">
    <div class="topbar-logo">…</div>
    <div class="progress-row">
      <div class="top-progress-track"><div class="top-progress-fill" id="topFill"></div></div>
      <div class="progress-steps" id="topSteps">0 / 8</div>
    </div>
  </div>
  <!-- mod-hero with title, eyebrow, desc -->
  <!-- N sections (step1…stepN), each .section with eyebrow, title, body, quiz, .next-btn -->
  <div class="section hidden" id="completionSection">
    <div class="completion">
      <div class="completion-title">…</div>
      …
      <button class="back-btn" onclick="notifyComplete()">← Return to Learning Hub</button>
    </div>
  </div>
  <script src="../shared/module.js?v=N"></script>
</body>
```

**Quiz types** (all in `module.js`):
- `mc(qId, btn, 'correct'|'wrong')` — multiple choice
- `tf(qId, btn, 'correct'|'wrong')` — true/false
- `drag` — drag-and-drop via `.drag-source` + `.drag-target` with `data-val`/`data-correct`

Drag-and-drop has a **touch event polyfill** (`attachTouchDrag`) for iOS — HTML5 drag-drop doesn't fire on touch. Don't remove it.

---

## 6. Completion Flow — Critical, Many Layered Fallbacks

This has bitten us repeatedly. Current state (v=39+):

**On completion (`showCompletion()` in `module.js`):**
1. Reveal completion section, update progress bar
2. `saveModuleProgress()` to localStorage (resume-on-reload)
3. `postMessage(MODULE_ID + '-complete', '*')` to `window.opener` (the hub)
4. Write to `ascend_learn_state` localStorage key directly (shared with hub if same context)
5. **`syncCompletionDirectToSupabase(MODULE_ID)`** — REST POST to `/rest/v1/hub_progress` using the user's bearer token from `sb-jbiqzdavkwioxhtwchiy-auth-token` in localStorage. **This is the only path guaranteed to work in iOS PWA.**
6. Visible "Saved ✓" pill on the screen showing sync result (yellow → green/red)
7. `injectShareButtons()` wrapped in try/catch (used to throw NotFoundError and abort everything below it — fixed by walking up to the direct-child anchor)

**On the hub (`hub.js`):**
- Message listener catches `<moduleId>-complete` postMessages → renders + Supabase upsert
- `pageshow` event re-reads localStorage and syncs any new completions to Supabase

### The iOS PWA Gotcha (read this!)

When the hub is installed as a PWA (`display: standalone` in manifest.json), iOS Safari renders module links in **a separate Safari window**, NOT inside the PWA. That separate window has:
- A **different localStorage context** from the PWA
- `window.opener === null`

So **localStorage hand-off and postMessage both fail silently** in this configuration. The only thing that crosses the boundary is the network — which is why `syncCompletionDirectToSupabase()` exists. Don't rely on the postMessage / localStorage paths alone.

### Backfilling lost data

If a user reports a completion that didn't register, check `hub_events` for their `error` events first — that's how we found the `injectShareButtons` NotFoundError. Then INSERT into `hub_progress` directly with `ON CONFLICT (user_id, module_id) DO NOTHING`.

---

## 7. Auth Flow (`shared/auth.js`)

- `initAuth()` runs on every page that loads `auth.js` (currently only `index.html`)
- Listens for `SIGNED_IN`, `SIGNED_OUT`, `PASSWORD_RECOVERY`
- `checkProfileAndUpdateUI()` decides what to render based on `hub_profiles` row
- Google sign-in flow: stash form data in `ascend_pending_profile` localStorage → redirect to Google → on return, upsert the profile
- Email signup: form first, then create auth user with password
- **`bounceUnregisteredUser()`** handles the case where a user has an `auth.users` row but no `hub_profiles` row (e.g. existing session from another Ascend product). Calls the `hub-delete-orphan-auth` edge function then signs out and shows an error directing them to Create Account. **Known issue:** Ascend admins (Quest, etc.) with sessions from AscendChat will hit this bounce when visiting the hub for the first time — see `WORKING_NOTES.md` if it exists or handle case-by-case.
- Password reset: tracks `recoveryInProgress` flag to distinguish recovery from a normal sign-in (both fire `SIGNED_IN`)

---

## 8. State Management

**localStorage keys:**
| Key | What | Owner |
|---|---|---|
| `ascend_learn_state` | `{completed: [], badges: []}` — main progress state | hub + module pages |
| `ascend_user_first` | First name cache for fast nav render | hub |
| `ascend_profile_cache` | Full profile object | hub |
| `ascend_pending_profile` | Stashed registration form data during OAuth redirect | hub |
| `ascend_pending_referral` | Referral code captured from `?ref=<uuid>` | hub |
| `ascend_module_progress_<MODULE_ID>` | Per-module resume state (last step reached) | module pages |
| `ascend_debug` | If `'1'`, loads Eruda on every page | both |
| `sb-jbiqzdavkwioxhtwchiy-auth-token` | Supabase session (managed by SDK) | SDK |

**Hydration:**
- On hub load: instant from localStorage, then `hydrateFromSupabase()` overlays server state
- On `visibilitychange` and `pageshow`: re-read localStorage + re-sync newly-seen completions to Supabase

---

## 9. Cache-Busting Convention

**Critical, do not skip.** All shared CSS/JS in HTML is loaded with `?v=N`. Every change to a shared file must bump `N` everywhere it's referenced.

Current versions (as of last edit):
- `shared/hub.js` → `?v=37`
- `shared/hub.css` → `?v=32`
- `shared/auth.js` → `?v=31` (verify)
- `shared/auth.css` → `?v=31`
- `shared/module.js` → `?v=39`
- `shared/module.css` → `?v=35`
- `shared/hub-events.js` → `?v=1`

When bumping `module.js` or `module.css`, you must update ALL 32 module HTMLs:
```bash
find modules -name "*.html" -exec sed -i 's/module\.js?v=39/module.js?v=40/g' {} +
```

When bumping `hub.js`/`hub.css`/`auth.*`, update `index.html`.

---

## 10. Telemetry (`shared/hub-events.js`)

Captures generic events into `hub_events`:
- `session_start` (every page load)
- `login` (Supabase SIGNED_IN)
- `module_started` (module page DOMContentLoaded)
- `heartbeat` (every 60s while page is visible)
- `error` (window.onerror)

For inspecting issues: query `hub_events` filtered by `user_id` and `occurred_at`. The `error` events have full stack traces in `metadata`. Use this as the first stop when a user reports a problem.

---

## 11. Common Gotchas

- **Cache-busting:** when fixes don't appear on the live site after deploy, the user is probably on an old cached HTML. Tell them to hard-refresh. Or bump the cache-buster on the parent HTML that references the file.
- **iOS PWA vs Safari context split:** see Section 6.
- **Drag-and-drop on mobile:** uses a custom touch polyfill. If it breaks, check `attachTouchDrag()`.
- **`insertBefore` requires a direct child** as the reference node — descendants throw NotFoundError. Walk up to the direct-child ancestor first. (Bit us in `injectShareButtons`.)
- **`launchModule()` opens in new tab** on desktop, falls back to same-tab on PWA / when popup is blocked.
- **Grid/flex children default to `min-width: auto`** — wide unbroken text overflows. Add `min-width: 0` to the child (bit us on AscendChat channel list and the mobile progress row).
- **Quest's account:** has an `auth.users` row but no `hub_profiles` row because his session from AscendChat auto-loads on the hub and `bounceUnregisteredUser()` bounces him before the form appears. Either backfill manually or implement an admin-aware path.
- **Email confirmation is disabled** in Supabase Auth (auto-confirms). Decide before scaling whether to flip on.
- **Brevo SMTP** is wired for transactional + Supabase Auth.

---

## 12. Deployment

1. Edit files
2. Bump cache-busters on any HTML referencing changed shared files
3. `git add -A && git commit -m "…" && git push`
4. Vercel auto-deploys from `master`
5. Verify with `curl -s https://learn.ascendacademy.org/shared/module.js?v=N | grep <distinctive-string-from-the-edit>`

`Last-Modified` and `X-Vercel-Cache` headers tell you if the change is live and whether the CDN is serving it.

---

## 13. Debugging Workflow

When a user reports a problem:

1. **Find their user_id** in Supabase via `auth.users` lookup by email
2. **Check `hub_events`** for recent `error` events with that user_id — the stack trace usually points directly at the bug
3. **Check `hub_progress`, `hub_badges`, `hub_module_starts`** to see what data they DO have
4. **Check their user_agent** to know what platform they're on (Safari vs PWA matters!)
5. **Have them enable Eruda** with `?debug=1` for in-page console
6. **If data is missing but they're sure they completed it**, backfill the row and fix the underlying bug

---

## 14. Open Items / Known Issues

- Quest's missing `hub_profiles` row (admin-aware bounce path needed)
- Email confirmation flag in Supabase Auth (decide before scale)
- No dynamic OG images per badge (deferred)
- Service worker would help PWA caching but isn't implemented (cache-bust query params work fine for now)
