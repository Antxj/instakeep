# InstaKeep

A tiny Firefox extension that keeps Instagram videos playing when you switch tabs or windows.

Instagram pauses posts, Reels and Stories as soon as the page loses focus or becomes hidden. InstaKeep stops that, while still respecting every pause you make yourself.

## Features

- 🔄 **Smart Detection** – pauses you trigger (click, tap, keyboard, media keys) are always respected; only automatic pauses caused by leaving the page are prevented.
- ⚡ **Lightweight** – no background script, no polling, no dependencies. Just a few event listeners.
- 🎯 **Instagram Only** – runs exclusively on `instagram.com`.
- 🔧 **Easy Toggle** – one on/off switch in the toolbar popup, applied instantly without reloading.
- 🎨 **Modern UI** – clean popup with automatic light and dark themes.

## How it works

| File | Role |
| --- | --- |
| `src/inject.js` | Runs in the page context at `document_start`. Makes `document.hidden`, `visibilityState` and `hasFocus()` always report "visible / focused", swallows `visibilitychange` / window `blur` / `focus` events, and blocks or reverts automatic pauses. |
| `src/bridge.js` | Isolated content script that mirrors the on/off setting from `storage.local` to a `data-instakeep` attribute on `<html>`, which `inject.js` watches. |
| `src/popup/` | Toolbar popup with the toggle and status. |

**Smart detection.** A pause is treated as yours when it happens within one second of a real input (pointer, touch, key, wheel or media key) made *after* the page was last active. Any other pause while the page is hidden or unfocused is ignored, or resumed if it already happened. Media that ended, was removed from the page, or was replaced by another playing video is left alone.

## Development

Requirements: Firefox 128 or newer, Node.js (only for the optional `web-ext` tooling).

```bash
npm install
npm start        # launches a clean Firefox profile with the extension loaded
npm run lint     # validates the extension with web-ext
npm run build    # creates a .zip in web-ext-artifacts/
```

Without Node: open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**, and pick `manifest.json`.

### Manual test checklist

- [ ] Play a feed post, a Reel and a Story, then switch tab → keeps playing.
- [ ] Same, switching to another window or minimizing Firefox → keeps playing.
- [ ] Pause a video yourself, then switch tab → stays paused.
- [ ] Pause with a hardware media key → stays paused.
- [ ] Scroll a playing video out of view → Instagram's normal pause still works.
- [ ] Turn the toggle off → Instagram behaves normally again (no reload needed).

## Installing permanently

Release builds of Firefox only install signed extensions. Upload the zip from `npm run build` to [addons.mozilla.org](https://addons.mozilla.org/developers/) – either *listed* (public) or *unlisted* (self-distributed, signed automatically). The store listing copy lives in [`AMO_LISTING.md`](AMO_LISTING.md).

## Privacy

InstaKeep collects no data, makes no network requests, and stores a single setting (`enabled`) locally.

## Disclaimer

InstaKeep is an independent project and is not affiliated with, endorsed by, or sponsored by Instagram or Meta.

## License

[MIT](LICENSE)
