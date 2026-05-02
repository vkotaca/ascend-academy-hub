/*  Ascend Academy — Hub events logger.
    Posts learning-platform telemetry to the OS dashboard's hub-event-log
    edge function. Runs on every page; auto-fires session_start, heartbeats,
    page_view, errors. Auth + module callers fire login / login_failed /
    module_started explicitly.

    Vanilla. No imports/exports. Exposes window.HubEvents.
*/
(function () {
  var SUPABASE_URL = 'https://jbiqzdavkwioxhtwchiy.supabase.co';
  // Matches the anon key already used by auth.js — public, safe to ship.
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiaXF6ZGF2a3dpb3hodHdjaGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDEwMTUsImV4cCI6MjA5MDk3NzAxNX0.se1MOm_Rl8KOi_0lRN3JDrcv9eNqpWDrfOdHDgKVM_E';
  var ENDPOINT = SUPABASE_URL + '/functions/v1/hub-event-log';
  var HEARTBEAT_MS = 60000;
  var QUEUE_FLUSH_MS = 1500;

  var _sessionId = null;
  var _queue = [];
  var _flushTimer = null;
  var _heartbeatTimer = null;
  var _initialized = false;

  function getSessionId() {
    if (_sessionId) return _sessionId;
    try {
      var s = sessionStorage.getItem('hub_session_id');
      if (!s) {
        s = 'sess_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
        sessionStorage.setItem('hub_session_id', s);
      }
      _sessionId = s;
    } catch (e) {
      _sessionId = 'sess_ephemeral_' + Date.now();
    }
    return _sessionId;
  }

  // We pull user_id from the global currentUser if it exists (auth.js sets
  // this), or from the cached profile in localStorage as a fallback.
  function getUserId() {
    try {
      if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) return currentUser.id;
      var raw = localStorage.getItem('ascend_profile_cache');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed.id;
      }
    } catch (e) {}
    return null;
  }

  function enqueue(eventType, metadata) {
    var userId = getUserId();
    var ev = {
      event_type: eventType,
      session_id: getSessionId(),
      occurred_at: new Date().toISOString()
    };
    if (userId) ev.user_id = userId;
    if (metadata) ev.metadata = metadata;
    _queue.push(ev);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (_flushTimer) return;
    _flushTimer = setTimeout(flush, QUEUE_FLUSH_MS);
  }

  function flush() {
    _flushTimer = null;
    if (_queue.length === 0) return;
    var batch = _queue.splice(0, 50);
    var payload = JSON.stringify({ events: batch });
    try {
      // sendBeacon when the page is unloading — guarantees delivery.
      if (navigator && navigator.sendBeacon && document.visibilityState === 'hidden') {
        var blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(ENDPOINT, blob);
        return;
      }
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: payload,
        keepalive: true
      }).catch(function () {});
    } catch (e) { /* analytics must never break the page */ }
  }

  function init() {
    if (_initialized) return;
    _initialized = true;

    // session_start fires once per page load. Followed by a heartbeat every
    // 60s while the tab is visible. heartbeats keep the live-now counter
    // accurate and the WAU/MAU set populated.
    enqueue('session_start', { url: location.pathname + location.search });

    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    _heartbeatTimer = setInterval(function () {
      if (document.visibilityState === 'visible') enqueue('heartbeat');
    }, HEARTBEAT_MS);

    // Catch uncaught frontend errors so the OS errors-in-1h KPI sees them.
    window.addEventListener('error', function (e) {
      enqueue('error', {
        message: String(e.message || '').slice(0, 500),
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 1000) : null
      });
    });
    window.addEventListener('unhandledrejection', function (e) {
      var reason = e.reason;
      enqueue('error', {
        message: 'unhandledrejection: ' + ((reason && reason.message) || String(reason)).slice(0, 500),
        stack: (reason && reason.stack) ? String(reason.stack).slice(0, 1000) : null
      });
    });

    // Flush on visibility change so we don't lose the tail of a session.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('beforeunload', flush);
  }

  window.HubEvents = {
    login:         function (userId)         { enqueue('login', userId ? { user_id: String(userId) } : null); },
    loginFailed:   function (metadata)       { enqueue('login_failed', metadata || null); },
    pageView:      function (path)           { enqueue('page_view', { url: path || (location.pathname + location.search) }); },
    moduleStarted: function (moduleId)       { enqueue('module_started', { module_id: String(moduleId) }); },
    error:         function (metadata)       { enqueue('error', metadata || null); },
    flush:         flush
  };

  // Auto-init as soon as the DOM is ready (or immediately if it already is).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
