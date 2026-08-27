import './style.css';
import { amplitude, initAmplitude, SUBMISSION_STORAGE_KEY } from './amplitude.js';

// Read the submission stashed by the home page before it redirected here.
let submission = null;
try {
  const raw = sessionStorage.getItem(SUBMISSION_STORAGE_KEY);
  if (raw) submission = JSON.parse(raw);
} catch (err) {
  console.warn('[demo] could not read submission from sessionStorage:', err);
}

// Initialize Amplitude. If the user submitted, initialize WITH the userId (the SHA-256
// hash of their name) so this page's very first event — the autocapture page view —
// already carries the userId. If the page was opened directly with no submission,
// initialize without a userId so events stay anonymous.
initAmplitude(submission?.userId ? { userId: submission.userId } : {});

// Passing userId into init above means the page-view autocapture event carries it from the
// first event. Also set it explicitly so the SDK's identity reflects it immediately for any
// subsequent events on this post-submit page.
if (submission?.userId) {
  amplitude.setUserId(submission.userId);
}

const details = document.getElementById('submission-details');
const noSubmission = document.getElementById('no-submission');

if (submission) {
  document.getElementById('detail-name').textContent = submission.name || '(blank)';
  document.getElementById('detail-phone').textContent = submission.phone || '(blank)';
  document.getElementById('detail-address').textContent = submission.address || '(blank)';
  document.getElementById('detail-userid').textContent = submission.userId || '(none)';
  if (details) details.hidden = false;
} else {
  if (noSubmission) noSubmission.hidden = false;
}
