'use strict';

const toggle = document.getElementById('toggle');
const status = document.getElementById('status');
const statusText = document.getElementById('status-text');

const INSTAGRAM_URL = /^https?:\/\/([^/]+\.)?instagram\.com(\/|$)/;
let onInstagram = false;

function render() {
  if (!toggle.checked) {
    status.dataset.state = 'off';
    statusText.textContent = 'Disabled — videos pause as usual';
  } else if (onInstagram) {
    status.dataset.state = 'on';
    statusText.textContent = 'Active on this tab';
  } else {
    status.dataset.state = 'idle';
    statusText.textContent = 'Enabled — open Instagram to use it';
  }
}

async function init() {
  const { enabled } = await browser.storage.local.get({ enabled: true });
  toggle.checked = enabled;

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    onInstagram = INSTAGRAM_URL.test(tab?.url ?? '');
  } catch {
    onInstagram = false;
  }

  render();
  // Enable transitions only after the initial state is drawn (no flicker on open).
  requestAnimationFrame(() => document.body.classList.add('ready'));
}

toggle.addEventListener('change', () => {
  browser.storage.local.set({ enabled: toggle.checked });
  render();
});

init();
