import './style.css';
import * as amplitude from '@amplitude/unified';
import { initAll } from '@amplitude/unified';

const AMPLITUDE_API_KEY = 'c1efd7cc6f8506e760254e4e9342652f';

// Expose the Unified SDK for easy console access during the demo (e.g. amplitude.track(...)).
window.amplitude = amplitude;

// Optional Web Experiment flag. If a flag with this key exists in the Amplitude
// project, its variant drives the subtitle text; otherwise we fall back gracefully.
const EXPERIMENT_FLAG_KEY = 'welcome-demo-cta';

const statusList = document.getElementById('sdk-status');

function logStatus(message) {
  const li = document.createElement('li');
  li.textContent = message;
  statusList?.appendChild(li);
}

/**
 * Initialize the Amplitude Unified SDK: Analytics (with ALL autocapture events),
 * Session Replay, Web Experiment, and Guides & Surveys — all on one API key.
 */
initAll(AMPLITUDE_API_KEY, {
  analytics: {
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

logStatus('Analytics initialized — all autocapture events enabled');
logStatus('Session Replay initialized — 100% sample rate');
logStatus('Web Experiment client initialized');
logStatus('Guides & Surveys (engagement) initialized');

// --- Web Experiment demonstration ------------------------------------------
// Read a variant and let it drive the subtitle. The <h1> stays "Welcome, Natalie".
(async function applyExperiment() {
  const subtitle = document.getElementById('subtitle');
  try {
    // Fetch the latest variants if the client exposes fetch() (no-op if unavailable).
    if (typeof amplitude.experiment?.fetch === 'function') {
      await amplitude.experiment.fetch();
    }
    const variant = amplitude.experiment?.variant?.(EXPERIMENT_FLAG_KEY);
    const payloadText =
      (variant && (variant.payload?.subtitle || variant.value)) || null;

    if (payloadText && subtitle) {
      subtitle.textContent = payloadText;
      logStatus(`Experiment "${EXPERIMENT_FLAG_KEY}" applied variant: ${variant.value ?? 'payload'}`);
    } else {
      logStatus(`Experiment "${EXPERIMENT_FLAG_KEY}" not configured — showing default subtitle`);
    }
  } catch (err) {
    logStatus('Experiment lookup skipped (no flag configured)');
    // Non-fatal: the demo works with or without an experiment flag.
    console.warn('[demo] experiment lookup failed:', err);
  }
})();

// --- Form submission --------------------------------------------------------
const form = document.getElementById('demo-form');
const confirmation = document.getElementById('form-confirmation');

form?.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('name')?.value ?? '';
  const phone = document.getElementById('phone')?.value ?? '';
  const address = document.getElementById('address')?.value ?? '';

  // Demo app: track the actual field values as event properties (no PII scrubbing).
  amplitude.track('Form Submitted', {
    name,
    phone,
    address,
  });

  if (confirmation) {
    confirmation.hidden = false;
  }
});
