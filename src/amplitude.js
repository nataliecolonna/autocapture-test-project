import * as amplitude from '@amplitude/unified';
import { initAll } from '@amplitude/unified';

export const AMPLITUDE_API_KEY = 'c1efd7cc6f8506e760254e4e9342652f';

// Key under which the submitted form payload (incl. the hashed userId) is stashed
// so the confirmation page can read it back after the redirect.
export const SUBMISSION_STORAGE_KEY = 'demoSubmission';

// Expose the Unified SDK for easy console access during the demo (e.g. amplitude.track(...)).
window.amplitude = amplitude;

/**
 * Initialize the Amplitude Unified SDK: Analytics (with ALL autocapture events),
 * Session Replay, Web Experiment, and Guides & Surveys — all on one API key.
 *
 * @param {{ userId?: string }} [opts] Pass a userId to identify events from the first
 *   event onward. Omit it (the home page's pre-submit state) to send events with no userId.
 */
export function initAmplitude({ userId } = {}) {
  initAll(AMPLITUDE_API_KEY, {
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
    // Session Replay: capture 100% of sessions for the demo.
    sessionReplay: {
      sampleRate: 1,
    },
    // Web Experiment: boots the experiment client on the same key.
    experiment: {},
    // Guides & Surveys (engagement): boots and auto-renders anything targeted to this project.
    engagement: {},
  });
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
