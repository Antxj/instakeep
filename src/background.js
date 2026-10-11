// InstaKeep — event page. Its only job: show a grey toolbar icon while disabled.
'use strict';

const ICON_ON = 'icons/icon.svg';
const ICON_OFF = 'icons/icon-off.svg';

const updateIcon = (enabled) => {
  const off = enabled === false;
  browser.action.setIcon({ path: off ? ICON_OFF : ICON_ON });
  browser.action.setTitle({ title: off ? 'InstaKeep (off)' : 'InstaKeep (on)' });
};

const refresh = () =>
  browser.storage.local.get({ enabled: true }).then(({ enabled }) => updateIcon(enabled));

browser.runtime.onStartup.addListener(refresh);
browser.runtime.onInstalled.addListener(refresh);
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'enabled' in changes) updateIcon(changes.enabled.newValue);
});
