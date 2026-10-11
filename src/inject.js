// InstaKeep — runs in the page's own context (world: MAIN) at document_start,
// before Instagram's scripts, so every override is in place when they load.
(() => {
  'use strict';

  const ATTR = 'data-instakeep';
  const GESTURE_WINDOW_MS = 1000; // a pause this soon after a user gesture is the user's
  const INACTIVE_GRACE_MS = 1500; // pauses right after leaving the page are the site's
  const MAX_RESUMES = 3;          // per element, per RESUME_WINDOW_MS (loop guard)
  const RESUME_WINDOW_MS = 5000;

  // ---- On/off state (set by bridge.js through an attribute on <html>) ----
  const root = document.documentElement;
  let enabled = root.getAttribute(ATTR) !== 'off';
  new MutationObserver(() => {
    enabled = root.getAttribute(ATTR) !== 'off';
  }).observe(root, { attributes: true, attributeFilter: [ATTR] });

  // ---- Real page state, kept before we override it ----
  const docProto = Document.prototype;
  const realHidden = Object.getOwnPropertyDescriptor(docProto, 'hidden').get;
  const realVisibilityState = Object.getOwnPropertyDescriptor(docProto, 'visibilityState').get;
  const realHasFocus = docProto.hasFocus;
  const realPause = HTMLMediaElement.prototype.pause;

  const pageInactive = () => realHidden.call(document) || !realHasFocus.call(document);

  // ---- Make the page always look visible and focused ----
  Object.defineProperty(docProto, 'hidden', {
    configurable: true,
    enumerable: true,
    get() { return enabled ? false : realHidden.call(this); },
  });
  Object.defineProperty(docProto, 'visibilityState', {
    configurable: true,
    enumerable: true,
    get() { return enabled ? 'visible' : realVisibilityState.call(this); },
  });
  docProto.hasFocus = function hasFocus() {
    return enabled ? true : realHasFocus.call(this);
  };

  // ---- Swallow the events Instagram uses to detect leaving the page ----
  let lastInactiveAt = 0;
  let lastGestureAt = 0;

  const onPageStateEvent = (e) => {
    if ((e.type === 'blur' || e.type === 'focus') && e.target !== window) return;
    if (e.type === 'blur' || (e.type === 'visibilitychange' && realHidden.call(document))) {
      lastInactiveAt = Date.now();
    }
    if (enabled) e.stopImmediatePropagation();
  };
  for (const type of ['visibilitychange', 'blur', 'focus']) {
    window.addEventListener(type, onPageStateEvent, true);
  }

  // ---- Smart detection: remember the user's own interactions ----
  const markGesture = () => { lastGestureAt = Date.now(); };
  const onGesture = (e) => {
    if (!e.isTrusted) return;
    // Browser shortcuts (Ctrl+Tab, Ctrl+T, Alt+Tab…) are about leaving, not pausing.
    if (e.type === 'keydown' && (e.ctrlKey || e.metaKey || e.altKey)) return;
    markGesture();
  };
  for (const type of ['pointerdown', 'touchstart', 'keydown', 'wheel']) {
    window.addEventListener(type, onGesture, { capture: true, passive: true });
  }

  // A gesture counts only if it happened recently AND after the page was last left,
  // so "click a link that opens a new tab" is not mistaken for a pause.
  const isUserAction = () =>
    Date.now() - lastGestureAt < GESTURE_WINDOW_MS && lastGestureAt > lastInactiveAt;

  const otherMediaPlaying = (el) => {
    for (const m of document.querySelectorAll('video, audio')) {
      if (m !== el && !m.paused && !m.ended) return true;
    }
    return false;
  };

  const shouldKeepPlaying = (el) =>
    enabled &&
    el.isConnected &&
    !el.ended &&
    !isUserAction() &&
    (pageInactive() || Date.now() - lastInactiveAt < INACTIVE_GRACE_MS) &&
    !otherMediaPlaying(el);

  // 1st line of defence: ignore pause() calls the site makes while you're away.
  HTMLMediaElement.prototype.pause = function pause() {
    if (!this.paused && shouldKeepPlaying(this)) return;
    return realPause.call(this);
  };

  // 2nd line of defence: if something still paused the media, resume it.
  const resumes = new WeakMap();
  document.addEventListener('pause', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLMediaElement) || !shouldKeepPlaying(el)) return;

    const now = Date.now();
    const recent = (resumes.get(el) || []).filter((t) => now - t < RESUME_WINDOW_MS);
    if (recent.length >= MAX_RESUMES) return;
    recent.push(now);
    resumes.set(el, recent);

    el.play().catch(() => {});
  }, true);

  // ---- Hardware media keys / OS media controls count as user pauses ----
  if ('mediaSession' in navigator && typeof MediaSession !== 'undefined') {
    const realSetActionHandler = MediaSession.prototype.setActionHandler;
    const USER_ACTIONS = new Set(['play', 'pause', 'stop']);

    MediaSession.prototype.setActionHandler = function setActionHandler(action, handler) {
      const wrapped = typeof handler === 'function' && USER_ACTIONS.has(action)
        ? function (...args) { markGesture(); return handler.apply(this, args); }
        : handler;
      return realSetActionHandler.call(this, action, wrapped);
    };

    const pauseAll = () => {
      markGesture();
      for (const m of document.querySelectorAll('video, audio')) {
        if (!m.paused) realPause.call(m);
      }
    };
    for (const action of ['pause', 'stop']) {
      try { realSetActionHandler.call(navigator.mediaSession, action, pauseAll); } catch {}
    }
  }
})();
