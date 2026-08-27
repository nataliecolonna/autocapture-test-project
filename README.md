# Amplitude Unified SDK — Demo App

A deliberately tiny web app (a "Welcome, Natalie" screen plus a name / phone / address form)
whose real purpose is to demonstrate a **full [Amplitude Unified SDK](https://amplitude.com/docs)
integration**:

| Product | Package (bundled by `@amplitude/unified`) | Where it's wired |
| --- | --- | --- |
| **Analytics + autocapture** | `@amplitude/analytics-browser` | `analytics.autocapture` in `src/main.js` |
| **Session Replay** | `@amplitude/plugin-session-replay-browser` | `sessionReplay` in `src/main.js` |
| **Web Experiment** | `@amplitude/plugin-experiment-browser` | `experiment` in `src/main.js` |
| **Guides & Surveys** | `@amplitude/engagement-browser` | `engagement` in `src/main.js` |

Everything boots from a single call:

```js
import { initAll } from '@amplitude/unified';

initAll('c1efd7cc6f8506e760254e4e9342652f', {
  analytics: { autocapture: { /* all event types true */ } },
  sessionReplay: { sampleRate: 1 },
  experiment: {},
  engagement: {},
});
```

## All autocapture events enabled

Every autocapture event type is turned on explicitly in `src/main.js`:

`attribution`, `fileDownloads`, `formInteractions`, `pageViews`, `sessions`,
`elementInteractions`, `frustrationInteractions` (rage/dead clicks), `networkTracking`,
`webVitals`, and `performanceTracking`.

A custom `Form Submitted` event is also sent on submit. **This is a demo, so the actual form
values (name, phone, address) are sent as event properties with no PII scrubbing.**

## Pages & identity flow

- **Home** (`index.html` / `src/main.js`) initializes the SDK with **no `userId`** — home-screen
  events are anonymous.
- On **Submit**, the app computes `userId = SHA-256(name)` (Web Crypto), calls
  `amplitude.setUserId(...)`, sends the `Form Submitted` event, stashes the submission in
  `sessionStorage`, flushes, and redirects to the confirmation page.
- **Confirmation** (`confirmation.html` / `src/confirmation.js`) initializes the SDK **with** that
  `userId` (so its first autocapture page-view already carries it) and displays the submitted
  name / phone / address plus the hashed `userId`.

So the `userId` is populated in analytics events **only after** the form is submitted. Shared SDK
setup lives in `src/amplitude.js` (`initAmplitude`, `sha256Hex`).

## Run locally

Requires Node 18+.

```bash
npm install
npm run dev      # start the dev server (Vite prints the local URL)
npm run build    # production build into dist/
npm run preview  # preview the production build
```

Open the app in a real browser to see events flow into Amplitude.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds the app and publishes `dist/` to GitHub Pages on every
push to `claude/demo-app-amplitude-sdk-u6e88d`.

**One-time setup:** in the repo, go to **Settings → Pages → Build and deployment → Source** and
select **GitHub Actions**. After that, each push deploys automatically. The site is served at
`https://<owner>.github.io/autocapture-test-project/` — which is why `vite.config.js` sets
`base: '/autocapture-test-project/'`.

## Notes

- **Guides & Surveys** and **Web Experiment** content is authored in the Amplitude UI against
  this project. The code boots the SDKs so any configured guide, survey, or flag renders. The
  app references an optional experiment flag `welcome-demo-cta` to drive the subtitle text, and
  falls back cleanly to the default when no such flag exists — the `Welcome, Natalie` heading is
  always shown.
