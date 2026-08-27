import './style.css';
import { amplitude, initAmplitude, sha256Hex, SUBMISSION_STORAGE_KEY } from './amplitude.js';

// Optional Web Experiment flag. If a flag with this key exists in the Amplitude
// project, its variant drives the subtitle text; otherwise we fall back gracefully.
const EXPERIMENT_FLAG_KEY = 'welcome-demo-cta';

const statusList = document.getElementById('sdk-status');

function logStatus(message) {
  const li = document.createElement('li');
  li.textContent = message;
  statusList?.appendChild(li);
}

// Initialize WITHOUT a userId: events on the home screen are intentionally anonymous
// until the user submits the form.
initAmplitude();

logStatus('Analytics initialized — all autocapture events enabled');
logStatus('Session Replay initialized — 100% sample rate');
logStatus('Web Experiment client initialized');
logStatus('Guides & Surveys (engagement) initialized');
logStatus('userId: not set (populated only after form submit)');

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
const submitBtn = document.getElementById('submit-btn');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitBtn) submitBtn.disabled = true;

  const name = document.getElementById('name')?.value ?? '';
  const phone = document.getElementById('phone')?.value ?? '';
  const address = document.getElementById('address')?.value ?? '';

  // Derive the userId as the SHA-256 hash of the name input, and identify the user.
  // From this point on, analytics events carry this userId.
  const userId = await sha256Hex(name);
  amplitude.setUserId(userId);

  // Demo app: track the actual field values as event properties (no PII scrubbing).
  amplitude.track('Form Submitted', { name, phone, address });

  // Stash the submission so the confirmation page can read it back after navigation.
  sessionStorage.setItem(
    SUBMISSION_STORAGE_KEY,
    JSON.stringify({ name, phone, address, userId }),
  );

  // Flush so the event isn't lost to the page navigation, then redirect.
  try {
    await amplitude.flush?.();
  } catch (err) {
    console.warn('[demo] flush failed:', err);
  }
  window.location.assign(`${import.meta.env.BASE_URL}confirmation.html`);
});
