import './style.css';
import {
  amplitude,
  getSdkStatus,
  initAmplitude,
  sha256Hex,
  startFeatureExperiment,
  SUBMISSION_STORAGE_KEY,
} from './amplitude.js';

// Optional Feature Experiment flag. If a flag with this key exists in the Amplitude
// project, its variant drives the subtitle text; otherwise we fall back gracefully.
const EXPERIMENT_FLAG_KEY = 'welcome-demo-cta';

const statusList = document.getElementById('sdk-status');

function renderStatus(rows) {
  if (!statusList) return;
  statusList.replaceChildren(
    ...rows.map(({ name, state, detail }) => {
      const li = document.createElement('li');
      li.className = `status-${state}`;
      const label = document.createElement('strong');
      label.textContent = `${name}: `;
      li.append(label, detail);
      return li;
    }),
  );
}

renderStatus([{ name: 'Checking', state: 'info', detail: 'waiting for the Unified SDK to initialize…' }]);

// Initialize WITHOUT a userId: events on the home screen are intentionally anonymous
// until the user submits the form.
const sdkReady = initAmplitude();

// Wait for every plugin, start Feature Experiment, then report what is actually running.
(async function bootAndReport() {
  try {
    await sdkReady;
  } catch (err) {
    console.warn('[demo] initAll failed:', err);
  }

  const experimentResult = await startFeatureExperiment();
  if (experimentResult.error) {
    console.warn('[demo] Feature Experiment start failed:', experimentResult.error);
  }

  // Let the experiment variant (if any) drive the subtitle. The <h1> stays "Welcome, Natalie".
  const variant = experimentResult.client?.variant(EXPERIMENT_FLAG_KEY);
  const subtitleText = variant?.payload?.subtitle || variant?.value;
  const subtitle = document.getElementById('subtitle');
  if (subtitleText && subtitle) subtitle.textContent = subtitleText;

  const rows = getSdkStatus(experimentResult);
  rows.push({
    name: `Flag "${EXPERIMENT_FLAG_KEY}"`,
    state: 'info',
    detail: variant?.value ? `variant "${variant.value}" applied to subtitle` : 'no variant — showing default subtitle',
  });
  renderStatus(rows);
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
