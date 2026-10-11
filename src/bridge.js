// InstaKeep — isolated content script. The page-context script (inject.js) can't
// read extension storage, so this one mirrors the on/off setting onto <html>.
(() => {
  'use strict';

  const ATTR = 'data-instakeep';

  const apply = (enabled) => {
    document.documentElement?.setAttribute(ATTR, enabled === false ? 'off' : 'on');
  };

  browser.storage.local.get({ enabled: true }).then(({ enabled }) => apply(enabled));

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'enabled' in changes) apply(changes.enabled.newValue);
  });
})();
