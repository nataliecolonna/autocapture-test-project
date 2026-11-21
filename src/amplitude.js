import * as amplitude from '@amplitude/unified';
import { initAll } from '@amplitude/unified';

export const AMPLITUDE_API_KEY = 'c1efd7cc6f8506e760254e4e9342652f';

// Key under which the submitted form payload (incl. the hashed userId) is stashed
// so the confirmation page can read it back after the redirect.
export const SUBMISSION_STORAGE_KEY = 'demoSubmission';

// Event property Session Replay attaches when the current session is being recorded.
const SESSION_REPLAY_ID_PROPERTY = '[Amplitude] Session Replay ID';

// How long to wait for Feature Experiment to fetch before reporting it as failed.
const EXPERIMENT_START_TIMEOUT_MS = 10000;

// Expose the Unified SDK for easy console access during the demo (e.g. amplitude.track(...)).
window.amplitude = amplitude;

// Guides & Surveys loads its real SDK by injecting a <script> from Amplitude's CDN. Until then,
// window.engagement is a catch-all proxy stub (every property is a function), so it can't be used
// to tell whether G&S really loaded. Instead, watch for that script and record its load/error.
const engagementBundle = { state: 'pending' };
const engagementObserver = new MutationObserver((mutations) => {
  for (const { addedNodes } of mutations) {
    for (const node of addedNodes) {
      if (node.tagName === 'SCRIPT' && node.src.includes('/engagement-browser/')) {
        engagementObserver.disconnect();
        node.addEventListener('load', () => (engagementBundle.state = 'loaded'));
        node.addEventListener('error', () => (engagementBundle.state = 'error'));
        return;
      }
    }
  }
});
engagementObserver.observe(document.documentElement, { childList: true, subtree: true });

/**
 * Initialize the Amplitude Unified SDK. initAll() adds, in order: Analytics (with ALL autocapture
 * events), Session Replay, Feature Experiment, and Guides & Surveys. Web Experiment is NOT part of
 * the npm package — it's loaded by the `<API_KEY>.experiment.js` script tag in each page's <head>.
 *
 * @param {{ userId?: string }} [opts] Pass a userId to identify events from the first
 *   event onward. Omit it (the home page's pre-submit state) to send events with no userId.
 * @returns {Promise<void>} Resolves once every plugin has been added and initialized.
 */
export function initAmplitude({ userId } = {}) {
  return initAll(AMPLITUDE_API_KEY, {
    analytics: {
      // userId is only set once the user has submitted the form; undefined here means
      // events carry no userId.
      userId,
      // Every autocapture event type enabled explicitly (AutocaptureOptions).
      autocapture: {
        attribution: true,
        fileDownloads: true,
        formInteractions: true,
        pageViews: true,
        sessions: true,
        elementInteractions: true,
        frustrationInteractions: true, // rage clicks / dead clicks
        networkTracking: true,
        webVitals: true,
        performanceTracking: true,
      },
    },
    // Session Replay: request 100% capture. Note the project's Session Replay settings (remote
    // config) take precedence over this local value.
    sessionReplay: {
      sampleRate: 1,
    },
    // Feature Experiment: the plugin creates the client (deployment key defaults to the API key)
    // but does not fetch — startFeatureExperiment() does that. throwOnError makes start() reject
    // when the flag/variant fetch fails, instead of silently succeeding, so the status is honest.
    experiment: {
      throwOnError: true,
    },
    // Guides & Surveys (engagement): boots and auto-renders anything targeted to this project.
    engagement: {},
  });
}

/**
 * Start the Feature Experiment client: fetches flag configs + variants for the current user.
 * Must be called after initAmplitude() resolves. Note `amplitude.experiment` is a METHOD in the
 * Unified SDK, not a property.
 *
 * @returns {Promise<{ client: object|undefined, error?: Error }>}
 */
export async function startFeatureExperiment() {
  const client = amplitude.experiment();
  if (!client) {
    return { client, error: new Error('Experiment plugin not found') };
  }
  try {
    await Promise.race([
      client.start(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`start() timed out after ${EXPERIMENT_START_TIMEOUT_MS / 1000}s`)),
          EXPERIMENT_START_TIMEOUT_MS,
        ),
      ),
    ]);
    return { client };
  } catch (error) {
    return { client, error };
  }
}

/**
 * Inspect each product and report what is ACTUALLY running (nothing here is hardcoded).
 *
 * @param {{ client?: object, error?: Error }} experimentResult Result of startFeatureExperiment().
 * @returns {Array<{ name: string, state: 'ok'|'warn'|'fail'|'info', detail: string }>}
 */
export function getSdkStatus(experimentResult = {}) {
  const rows = [];

  // Analytics
  const deviceId = amplitude.getDeviceId();
  const sessionId = amplitude.getSessionId();
  rows.push(
    deviceId && sessionId
      ? { name: 'Analytics', state: 'ok', detail: `running (session ${sessionId}) — all autocapture events enabled` }
      : { name: 'Analytics', state: 'fail', detail: 'no device/session ID — analytics did not initialize' },
  );

  // Session Replay
  const sr = amplitude.sessionReplay();
  if (!sr) {
    rows.push({ name: 'Session Replay', state: 'fail', detail: 'plugin not found' });
  } else {
    const replayId = sr.getSessionReplayProperties?.()[SESSION_REPLAY_ID_PROPERTY];
    rows.push(
      replayId
        ? { name: 'Session Replay', state: 'ok', detail: `recording (replay ID ${replayId})` }
        : {
            name: 'Session Replay',
            state: 'warn',
            detail:
              'loaded but NOT recording — capture is disabled or the sample rate excludes this session in the ' +
              "project's Session Replay settings, or its remote config couldn't be fetched",
          },
    );
  }

  // Feature Experiment
  const { client: exp, error: expError } = experimentResult;
  if (!exp) {
    rows.push({ name: 'Feature Experiment', state: 'fail', detail: expError?.message ?? 'client not found' });
  } else if (expError) {
    rows.push({ name: 'Feature Experiment', state: 'fail', detail: `client created but fetch failed: ${expError.message}` });
  } else {
    const count = Object.keys(exp.all?.() ?? {}).length;
    rows.push({
      name: 'Feature Experiment',
      state: 'ok',
      detail: `started — ${count} flag variant${count === 1 ? '' : 's'} assigned to this user`,
    });
  }

  // Web Experiment (loaded by the <API_KEY>.experiment.js script tag, which defines window.webExperiment)
  rows.push(
    window.webExperiment
      ? { name: 'Web Experiment', state: 'ok', detail: 'script loaded' }
      : { name: 'Web Experiment', state: 'fail', detail: 'experiment.js script did not load (network / ad blocker?)' },
  );

  // Guides & Surveys (see engagementBundle above).
  if (engagementBundle.state === 'loaded') {
    rows.push({ name: 'Guides & Surveys', state: 'ok', detail: 'engagement SDK loaded from CDN and booted' });
  } else if (engagementBundle.state === 'error') {
    rows.push({
      name: 'Guides & Surveys',
      state: 'fail',
      detail: 'engagement SDK bundle failed to load from the CDN (network / ad blocker?)',
    });
  } else {
    rows.push({ name: 'Guides & Surveys', state: 'warn', detail: 'engagement SDK bundle has not loaded yet' });
  }

  // Identity (informational)
  const userId = amplitude.getUserId();
  rows.push({
    name: 'userId',
    state: 'info',
    detail: userId ? `set (${userId.slice(0, 12)}…)` : 'not set — populated only after form submit',
  });

  return rows;
}

/**
 * SHA-256 hash of `text`, returned as a lowercase hex string, via the Web Crypto API.
 * Requires a secure context (https or localhost) — satisfied by GitHub Pages and local dev.
 */
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export { amplitude };
