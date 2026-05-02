// ─── MOBILE DEBUG CONSOLE (Eruda) ───
// Load Eruda (a Chrome-DevTools-like in-page console) when the user has
// enabled debug mode by visiting any page with ?debug=1 once. The flag
// persists in localStorage so module pages opened in new tabs inherit it.
(function () {
  try {
    if (location.search.indexOf('debug=1') !== -1) localStorage.setItem('ascend_debug', '1');
    if (location.search.indexOf('debug=0') !== -1) localStorage.removeItem('ascend_debug');
    if (localStorage.getItem('ascend_debug') === '1') {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/eruda';
      s.onload = function () { try { eruda.init(); } catch (e) {} };
      document.head.appendChild(s);
    }
  } catch (e) {}
})();

/*  Ascend Academy — Shared Module Quiz Engine
    Used by all module HTML files. Provides:
    - Multiple choice (mc)
    - True/false (tf)
    - Drag-and-drop (dragStart, dragOver, drop, checkDrag)
    - Step progression (advance, showCompletion, notifyComplete)
    - Top progress bar (updateTopProgress)

    Each module must define:
      MODULE_ID        — string, e.g. 'block-format'
      TOTAL_STEPS      — number of lessons
      CORRECT_MSGS     — { qId: 'msg', ... }
      WRONG_MSGS       — { qId: 'msg', ... }
      UNLOCK_MAP       — { qId: 'nextElementId', ... }
*/

let stepsCompleted = 0;
let dragData = null;

// Notify the hub (window.opener) about lifecycle events.
// The hub listens for these and writes to Supabase.
function notifyOpener(payload) {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, '*');
    }
  } catch (e) { /* fail silently — tracking is best-effort */ }
}

// Tell the hub the user opened this module page (one row per visit).
// Fires once per page load.
window.addEventListener('DOMContentLoaded', function () {
  if (typeof MODULE_ID !== 'undefined') {
    notifyOpener({ type: 'module-started', moduleId: MODULE_ID });
    // Telemetry: also log to the OS dashboard via hub-events.
    try { window.HubEvents && window.HubEvents.moduleStarted(MODULE_ID); } catch (e) {}
  }
  injectLessonNav();
  restoreModuleProgress();
});

// ─── PREVENT BACKSPACE NAVIGATION ───
// Safari (and some Firefox setups) navigate back when Backspace is pressed
// outside an input — that triggers a re-load of the module and discards the
// user's place in the lesson. Swallow the key when no editable element is
// focused.
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Backspace' && e.keyCode !== 8) return;
  var t = e.target;
  if (!t) { e.preventDefault(); return; }
  var tag = (t.tagName || '').toUpperCase();
  var editable = tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable;
  if (!editable) e.preventDefault();
});

// ─── PARTIAL-PROGRESS RESUME (per module, per device) ───
// Saves stepsCompleted in localStorage after each advance() so closing
// the tab mid-module and re-opening picks up where you left off instead
// of restarting at lesson 1. Cleared once the module is fully completed.

function saveModuleProgress() {
  if (typeof MODULE_ID === 'undefined') return;
  try { localStorage.setItem('mod_step_' + MODULE_ID, String(stepsCompleted)); } catch (e) {}
}

function clearModuleProgress() {
  if (typeof MODULE_ID === 'undefined') return;
  try { localStorage.removeItem('mod_step_' + MODULE_ID); } catch (e) {}
}

function restoreModuleProgress() {
  if (typeof MODULE_ID === 'undefined' || typeof TOTAL_STEPS === 'undefined') return;
  var saved = 0;
  try { saved = parseInt(localStorage.getItem('mod_step_' + MODULE_ID) || '0', 10); } catch (e) {}
  if (!saved || saved < 1) return;
  saved = Math.min(saved, TOTAL_STEPS);

  // Silently re-create the post-advance UI state: hide next-buttons
  // for completed steps, reveal subsequent step sections.
  for (var i = 1; i <= saved; i++) {
    var nextBtn = document.getElementById('next' + i);
    if (nextBtn) nextBtn.classList.add('hidden');
    if (i < TOTAL_STEPS) {
      var stepEl = document.getElementById('step' + (i + 1));
      if (stepEl) stepEl.classList.remove('hidden');
    }
  }
  stepsCompleted = saved;
  updateTopProgress();

  // If they reached the end before, surface the completion screen again so
  // they can finish the module (which writes to hub_progress).
  if (saved >= TOTAL_STEPS) {
    showCompletion();
    return;
  }

  // Otherwise scroll the user to the step they were last on, without animation
  // (instant feels less disorienting than smooth-scroll on page load).
  setTimeout(function () {
    var target = document.getElementById('step' + (saved + 1));
    if (target) target.scrollIntoView({ block: 'start' });
  }, 50);
}

// Track a single quiz answer attempt.
function trackQuizAttempt(questionId, wasCorrect) {
  if (typeof MODULE_ID === 'undefined') return;
  notifyOpener({
    type: 'quiz-attempt',
    moduleId: MODULE_ID,
    questionId: questionId,
    wasCorrect: !!wasCorrect
  });
}

function getUserName() {
  return localStorage.getItem('ascend_user_first') || '';
}

function correctPrefix() {
  var name = getUserName();
  if (!name) return '\u2713 Correct! ';
  var phrases = [
    '\u2713 Great job, ' + name + '! ',
    '\u2713 Nailed it, ' + name + '! ',
    '\u2713 Exactly right, ' + name + '! ',
    '\u2713 You got it, ' + name + '! ',
    '\u2713 Nice work, ' + name + '! ',
    '\u2713 Spot on, ' + name + '! ',
    '\u2713 That\'s it, ' + name + '! ',
    '\u2713 Well done, ' + name + '! '
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function updateTopProgress() {
  const pct = (stepsCompleted / TOTAL_STEPS) * 100;
  document.getElementById('topFill').style.width = pct + '%';
  // Counter shows the lesson the user is currently on (clamped to TOTAL_STEPS),
  // not the number of completed quizzes — clearer for students. The fill bar
  // itself still represents completion.
  var pos = Math.min(Math.max(currentLesson || 1, 1), TOTAL_STEPS);
  document.getElementById('topSteps').textContent = pos + ' / ' + TOTAL_STEPS;
}

function advance(step) {
  document.getElementById('next' + step).classList.add('hidden');
  var nextStep = document.getElementById('step' + (step + 1));
  nextStep.classList.remove('hidden');
  // Trigger the reveal animation. Force reflow then add the class so the
  // animation actually runs even if the class was already present.
  nextStep.classList.remove('reveal');
  // eslint-disable-next-line no-unused-expressions
  void nextStep.offsetWidth;
  nextStep.classList.add('reveal');
  stepsCompleted = Math.max(stepsCompleted, step);
  updateTopProgress();
  saveModuleProgress();
  // Newly-revealed step is now "current"; refresh nav arrow enable state.
  currentLesson = step + 1;
  updateLessonNavButtons();
  setTimeout(function () {
    nextStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function showCompletion() {
  var lastNext = document.getElementById('next' + TOTAL_STEPS);
  if (lastNext) lastNext.classList.add('hidden');
  var section = document.getElementById('completionSection');
  section.classList.remove('hidden');
  stepsCompleted = TOTAL_STEPS;
  updateTopProgress();
  saveModuleProgress();

  // CRITICAL: persist + signal completion BEFORE any UI helpers that could
  // throw (injectShareButtons has historically crashed on insertBefore in
  // some module layouts). If we crash later, the data is already saved.
  if (window.opener && !window.opener.closed) {
    try { window.opener.postMessage(MODULE_ID + '-complete', '*'); } catch (e) {}
  }
  try {
    var STATE_KEY = 'ascend_learn_state';
    var s = JSON.parse(localStorage.getItem(STATE_KEY) || '{"completed":[],"badges":[]}');
    if (!s.completed) s.completed = [];
    if (!s.completed.includes(MODULE_ID)) {
      s.completed.push(MODULE_ID);
      localStorage.setItem(STATE_KEY, JSON.stringify(s));
    }
  } catch (e) {}

  // UI helpers — wrapped in try/catch so a stray DOM error never blocks
  // the completion path again.
  try { injectShareButtons(); } catch (e) {
    try { console.error('injectShareButtons failed:', e); } catch (_) {}
  }

  // Personalize completion screen
  var name = getUserName();
  if (name) {
    var title = section.querySelector('.completion-title');
    if (title) title.textContent = name + ', ' + title.textContent;
    var badgeLabel = section.querySelector('.completion-badge-label');
    if (badgeLabel) badgeLabel.textContent = name + ', you just earned a badge!';
  }

  setTimeout(function () {
    section.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// Build share buttons on the completion screen so students can broadcast
// the moment they finish a module (WhatsApp / iMessage / X / copy link).
function injectShareButtons() {
  var section = document.getElementById('completionSection');
  if (!section || section.querySelector('.completion-share')) return;
  var moduleTitle = document.querySelector('.mod-title');
  var moduleName = moduleTitle ? moduleTitle.textContent.trim() : 'a module';
  var hubUrl = 'https://learn.ascendacademy.org';
  var msg = 'I just finished "' + moduleName + '" on Ascend Academy. Free Congressional Debate training, you should check it out!';
  var encoded = encodeURIComponent(msg + ' ' + hubUrl);
  var encodedTextOnly = encodeURIComponent(msg);
  var encodedUrl = encodeURIComponent(hubUrl);

  var wrap = document.createElement('div');
  wrap.className = 'completion-share';
  wrap.innerHTML =
    '<div class="completion-share-label">Share your progress</div>' +
    '<div class="completion-share-btns">' +
      '<a class="share-btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encoded + '">' +
        '<span class="share-icon">' + whatsappIcon() + '</span>WhatsApp</a>' +
      '<a class="share-btn" href="sms:&body=' + encoded + '">' +
        '<span class="share-icon">' + smsIcon() + '</span>iMessage</a>' +
      '<button class="share-btn share-copy-btn" type="button" onclick="copyShareLink(this,\'' + msg.replace(/'/g, "\\'") + '\')">' +
        '<span class="share-icon">' + linkIcon() + '</span><span class="share-copy-label">Copy Link</span></button>' +
    '</div>';
  // Insert before the existing Return button. .back-btn may be wrapped
  // in another element (e.g. <div class="completion-cta">), so insertBefore
  // needs the direct child of section that CONTAINS the back button —
  // otherwise insertBefore throws NotFoundError and aborts everything that
  // ran inside showCompletion below this line.
  var returnBtn = section.querySelector('.back-btn');
  var anchor = returnBtn;
  while (anchor && anchor.parentNode !== section) anchor = anchor.parentNode;
  if (anchor) section.insertBefore(wrap, anchor);
  else section.appendChild(wrap);
}

function copyShareLink(btn, msg) {
  var text = (msg || 'Ascend Academy Learning Platform') + ' https://learn.ascendacademy.org';
  var label = btn.querySelector('.share-copy-label');
  function show(t) { if (label) { label.textContent = t; setTimeout(function () { if (label) label.textContent = 'Copy Link'; }, 1800); } }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { show('Copied!'); }, function () { show('Press Cmd+C'); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); show('Copied!'); } catch (e) { show('Press Cmd+C'); }
    document.body.removeChild(ta);
  }
}

function whatsappIcon() { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>'; }
function smsIcon() { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>'; }
function xIcon() { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'; }
function linkIcon() { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'; }

function notifyComplete() {
  var hasOpener = false;
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(MODULE_ID + '-complete', '*');
      // Force the hub tab to reload so the just-completed module visually
      // updates to "Completed" regardless of bfcache or stale render state.
      window.opener.location.reload();
      hasOpener = true;
    } catch (e) {}
  }
  // Module is fully done and synced to Supabase — clear the local resume
  // flag so a fresh re-open of the module doesn't drop the user straight
  // onto the completion screen.
  clearModuleProgress();
  if (hasOpener) {
    // New-tab flow (desktop / mobile-browser): close this tab.
    window.close();
  } else {
    // PWA / same-tab flow: navigate this view back to the hub. Completion
    // is already persisted via localStorage write in showCompletion(), so
    // the hub will render it on load.
    window.location.href = '../index.html';
  }
}

// --- Multiple Choice ---
function mc(qId, btn, result) {
  var quiz = document.getElementById(qId);
  var btns = quiz.querySelectorAll('.option');
  btns.forEach(function (b) { b.disabled = true; });
  var fb = document.getElementById(qId + '-fb');

  trackQuizAttempt(qId, result === 'correct');

  if (result === 'correct') {
    if (navigator.vibrate) navigator.vibrate(40);
    btn.classList.add('correct');
    fb.className = 'feedback show correct-fb';
    fb.textContent = correctPrefix() + (CORRECT_MSGS[qId] || '');
    unlockAfter(qId);
  } else {
    if (navigator.vibrate) navigator.vibrate([20, 60, 20]);
    btn.classList.add('wrong');
    fb.className = 'feedback show wrong-fb';
    fb.textContent = '\u2717 Not quite. ' + (WRONG_MSGS[qId] || 'Try again.');
    setTimeout(function () {
      btns.forEach(function (b) { b.disabled = false; b.classList.remove('wrong'); });
      fb.classList.remove('show');
    }, 1800);
  }
}

// --- True / False ---
function tf(qId, btn, isCorrect) {
  var quiz = document.getElementById(qId);
  var btns = quiz.querySelectorAll('.tf-btn');
  btns.forEach(function (b) { b.disabled = true; });
  var fb = document.getElementById(qId + '-fb');

  trackQuizAttempt(qId, !!isCorrect);

  if (isCorrect) {
    if (navigator.vibrate) navigator.vibrate(40);
    btn.classList.add('correct');
    fb.className = 'feedback show correct-fb';
    fb.textContent = correctPrefix() + (CORRECT_MSGS[qId] || '');
    unlockAfter(qId);
  } else {
    if (navigator.vibrate) navigator.vibrate([20, 60, 20]);
    btn.classList.add('wrong');
    fb.className = 'feedback show wrong-fb';
    fb.textContent = '\u2717 Not quite. ' + (WRONG_MSGS[qId] || 'Try again.');
    setTimeout(function () {
      btns.forEach(function (b) { b.disabled = false; b.classList.remove('wrong'); });
      fb.classList.remove('show');
    }, 1800);
  }
}

// --- Drag and Drop (desktop + mobile tap-to-place) ---
var selectedChip = null;

function dragStart(e) {
  dragData = { val: e.target.dataset.val, text: e.target.textContent, el: e.target };
  e.target.classList.add('dragging');
}

function dragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('over');
}

function drop(e, qId) {
  e.preventDefault();
  var target = e.currentTarget;
  target.classList.remove('over');
  if (!dragData) return;

  var contentEl = target.querySelector('.target-content');
  contentEl.textContent = dragData.text;
  target.classList.add('filled');
  target.dataset.placed = dragData.val;
  dragData.el.classList.remove('dragging');

  var targets = document.querySelectorAll('#' + qId + '-targets .drag-target');
  var allFilled = Array.from(targets).every(function (t) { return t.dataset.placed; });
  if (allFilled) checkDrag(qId, targets);

  dragData = null;
}

// Mobile: tap chip to select, tap target to place
function tapChip(el) {
  // Deselect previous
  document.querySelectorAll('.drag-chip.selected').forEach(function(c) { c.classList.remove('selected'); });
  selectedChip = { val: el.dataset.val, text: el.textContent, el: el };
  el.classList.add('selected');
}

function tapTarget(el, qId) {
  if (!selectedChip) return;

  var contentEl = el.querySelector('.target-content');
  contentEl.textContent = selectedChip.text;
  el.classList.add('filled');
  el.dataset.placed = selectedChip.val;
  selectedChip.el.classList.add('dragging');
  selectedChip.el.classList.remove('selected');
  selectedChip = null;

  var targets = document.querySelectorAll('#' + qId + '-targets .drag-target');
  var allFilled = Array.from(targets).every(function (t) { return t.dataset.placed; });
  if (allFilled) checkDrag(qId, targets);
}

// ─── LESSON NAVIGATOR (prev/next arrows in the topbar) ───
// Injects two arrow buttons into the topbar's progress-row. Lets students
// jump backward to review or forward into already-unlocked lessons. The
// "current" lesson is detected via IntersectionObserver as the user scrolls.
var currentLesson = 1;

function injectLessonNav() {
  if (typeof TOTAL_STEPS === 'undefined') return;
  var progressRow = document.querySelector('.progress-row');
  if (!progressRow || progressRow.querySelector('.lesson-nav-prev')) return;
  var prevSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  var nextSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  var prev = document.createElement('button');
  prev.className = 'lesson-nav-btn lesson-nav-prev';
  prev.setAttribute('aria-label', 'Previous lesson');
  prev.innerHTML = prevSvg;
  prev.addEventListener('click', function () { goToLesson(currentLesson - 1); });
  var next = document.createElement('button');
  next.className = 'lesson-nav-btn lesson-nav-next';
  next.setAttribute('aria-label', 'Next lesson');
  next.innerHTML = nextSvg;
  next.addEventListener('click', function () { goToLesson(currentLesson + 1); });
  progressRow.insertBefore(prev, progressRow.firstChild);
  progressRow.appendChild(next);
  updateLessonNavButtons();
  observeLessonScroll();
}

function goToLesson(n) {
  if (typeof TOTAL_STEPS === 'undefined') return;
  if (n < 1 || n > TOTAL_STEPS) return;
  var target = document.getElementById('step' + n);
  if (!target) return;
  // Don't jump forward into a locked lesson — only allow forward-into-unlocked.
  if (target.classList.contains('hidden')) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  currentLesson = n;
  updateLessonNavButtons();
  updateTopProgress();
}

function updateLessonNavButtons() {
  var prev = document.querySelector('.lesson-nav-prev');
  var next = document.querySelector('.lesson-nav-next');
  if (prev) prev.disabled = currentLesson <= 1;
  if (next) {
    if (typeof TOTAL_STEPS === 'undefined' || currentLesson >= TOTAL_STEPS) {
      next.disabled = true;
    } else {
      var nextStep = document.getElementById('step' + (currentLesson + 1));
      next.disabled = !nextStep || nextStep.classList.contains('hidden');
    }
  }
}

function observeLessonScroll() {
  if (!window.IntersectionObserver) return;
  var sections = document.querySelectorAll('.section[id^="step"]');
  if (!sections.length) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        var n = parseInt(id.replace('step', ''), 10);
        if (n && n !== currentLesson) {
          currentLesson = n;
          updateLessonNavButtons();
          updateTopProgress();
        }
      }
    });
  }, {
    rootMargin: '-30% 0px -50% 0px',  // section is "current" when its top crosses ~30% from viewport top
    threshold: 0
  });
  sections.forEach(function (s) { observer.observe(s); });
}

// Cross-platform tap handler using pointer events. On touch, pointerup only
// fires for genuine taps (the OS sends pointercancel if the gesture turns into
// a scroll). On mouse, pointerup behaves like click. Deduped against the
// regular click event to handle browsers that fire both.
var lastDragEnd = 0;
function attachTap(el, handler) {
  var lastFire = 0;
  function fire(source, e) {
    // Suppress tap events that fire immediately after a touch-drag ended,
    // so dropping a chip doesn't also trigger the tap-to-place handler.
    if (Date.now() - lastDragEnd < 400) return;
    var now = Date.now();
    if (now - lastFire < 250) return;
    lastFire = now;
    try { console.log('[ascend] tap fired via', source, 'on', el.className); } catch (err) {}
    handler.call(el, e);
  }
  // Pointer events: universal across mouse + touch + pen on modern browsers.
  el.addEventListener('pointerup', function (e) { fire('pointerup:' + (e.pointerType || '?'), e); });
  // Click: belt-and-suspenders fallback for any environment where pointer
  // events misbehave. Deduped above.
  el.addEventListener('click', function (e) { fire('click', e); });
}

// Real touch drag-and-drop on mobile. The HTML5 drag-and-drop API doesn't
// fire on touch devices, so we polyfill it: track touchstart -> touchmove
// (with a 'ghost' chip element following the finger) -> touchend (place
// where the finger releases). Tap-to-place still works as a coexisting
// alternate interaction (short press = tap; press-and-move = drag).
function attachTouchDrag(chip) {
  var dragMode = false;
  var ghost = null;
  var startX = 0, startY = 0;
  var data = null;
  var ghostW = 0, ghostH = 0;

  chip.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    dragMode = false;
    data = { val: chip.dataset.val, text: chip.textContent.trim() };
  }, { passive: true });

  chip.addEventListener('touchmove', function (e) {
    if (!data || e.touches.length !== 1) return;
    var t = e.touches[0];
    var dx = t.clientX - startX;
    var dy = t.clientY - startY;

    if (!dragMode) {
      // Wait for ~8px movement to distinguish drag from tap/scroll attempt.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      dragMode = true;
      // Build the ghost element that visually follows the finger.
      var rect = chip.getBoundingClientRect();
      ghostW = rect.width;
      ghostH = rect.height;
      ghost = chip.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.cssText = 'position:fixed;left:' + (t.clientX - ghostW / 2) + 'px;top:' + (t.clientY - ghostH / 2) + 'px;' +
        'width:' + ghostW + 'px;height:' + ghostH + 'px;margin:0;box-sizing:border-box;' +
        'opacity:0.92;z-index:9999;pointer-events:none;transform:rotate(-2deg) scale(1.03);transform-origin:center center;' +
        'box-shadow:0 8px 24px rgba(0,0,0,0.25);background:#fff;';
      document.body.appendChild(ghost);
      chip.classList.add('dragging');
      try { console.log('[ascend] touch drag start'); } catch (err) {}
    }

    if (dragMode) {
      e.preventDefault(); // suppress page scroll while dragging
      ghost.style.left = (t.clientX - ghostW / 2) + 'px';
      ghost.style.top = (t.clientY - ghostH / 2) + 'px';
      // Highlight whichever drag-target is under the finger.
      ghost.style.display = 'none';
      var below = document.elementFromPoint(t.clientX, t.clientY);
      ghost.style.display = '';
      var target = below ? below.closest && below.closest('.drag-target') : null;
      document.querySelectorAll('.drag-target.over').forEach(function (el) { el.classList.remove('over'); });
      if (target) target.classList.add('over');
    }
  }, { passive: false });

  chip.addEventListener('touchend', function (e) {
    if (!dragMode || !data) {
      data = null;
      dragMode = false;
      return;
    }
    var t = (e.changedTouches && e.changedTouches[0]) || { clientX: 0, clientY: 0 };
    if (ghost) ghost.style.display = 'none';
    var below = document.elementFromPoint(t.clientX, t.clientY);
    var target = below ? (below.closest && below.closest('.drag-target')) : null;
    document.querySelectorAll('.drag-target.over').forEach(function (el) { el.classList.remove('over'); });
    if (target) {
      // Place the chip on the target — same effect as drop()/tapTarget().
      var contentEl = target.querySelector('.target-content');
      if (contentEl) contentEl.textContent = data.text;
      target.classList.add('filled');
      target.dataset.placed = data.val;
      var qId = target.parentElement.id.replace('-targets', '');
      var allTargets = document.querySelectorAll('#' + qId + '-targets .drag-target');
      var allFilled = Array.prototype.slice.call(allTargets).every(function (t2) { return t2.dataset.placed; });
      try { console.log('[ascend] dropped', data.val, '->', target.dataset.correct); } catch (err) {}
      if (allFilled && typeof checkDrag === 'function') checkDrag(qId, allTargets);
    } else {
      // Released away from any target — return chip to source visually.
      chip.classList.remove('dragging');
    }
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    ghost = null;
    dragMode = false;
    data = null;
    lastDragEnd = Date.now();
  });

  chip.addEventListener('touchcancel', function () {
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    ghost = null;
    dragMode = false;
    data = null;
    chip.classList.remove('dragging');
    document.querySelectorAll('.drag-target.over').forEach(function (el) { el.classList.remove('over'); });
  });
}

// Wire chip + target tap handlers on every page. On touch devices we remove
// the native draggable attribute and add the touch drag polyfill so users
// can press-and-drag chips onto targets.
function wireDragHandlers(scope) {
  scope = scope || document;
  var isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  var chips = scope.querySelectorAll('.drag-chip');
  var targets = scope.querySelectorAll('.drag-target');
  try { console.log('[ascend] wiring', chips.length, 'chips and', targets.length, 'targets, isTouch=', isTouch); } catch (e) {}
  chips.forEach(function(chip) {
    if (chip.dataset.tapWired === '1') return;
    chip.dataset.tapWired = '1';
    if (isTouch) {
      chip.removeAttribute('draggable');
      attachTouchDrag(chip);
    }
    attachTap(chip, function () { tapChip(this); });
  });
  targets.forEach(function(target) {
    if (target.dataset.tapWired === '1') return;
    target.dataset.tapWired = '1';
    var qId = target.parentElement.id.replace('-targets', '');
    attachTap(target, function () { tapTarget(this, qId); });
  });
}
document.addEventListener('DOMContentLoaded', function () { wireDragHandlers(); });

function checkDrag(qId, targets) {
  var allCorrect = true;
  targets.forEach(function (t) {
    if (t.dataset.placed === t.dataset.correct) {
      t.classList.add('correct-drop');
    } else {
      t.classList.add('wrong-drop');
      allCorrect = false;
    }
  });

  trackQuizAttempt(qId, allCorrect);

  var fb = document.getElementById(qId + '-fb');
  if (allCorrect) {
    if (navigator.vibrate) navigator.vibrate(40);
    fb.className = 'feedback show correct-fb';
    fb.textContent = correctPrefix() + (CORRECT_MSGS[qId] || '');
    unlockAfter(qId);
  } else {
    if (navigator.vibrate) navigator.vibrate([20, 60, 20]);
    fb.className = 'feedback show wrong-fb';
    fb.textContent = "\u2717 Some items are in the wrong place. Let's try again.";
    setTimeout(function () {
      targets.forEach(function (t) {
        t.classList.remove('filled', 'correct-drop', 'wrong-drop');
        t.dataset.placed = '';
        t.querySelector('.target-content').textContent = '';
      });
      var sourceNum = qId.replace('q', '');
      var source = document.getElementById('drag-source-' + sourceNum);
      if (source) source.querySelectorAll('.drag-chip').forEach(function (c) { c.classList.remove('dragging'); });
      fb.classList.remove('show');
    }, 2000);
  }
}

// --- Unlock chaining ---
function unlockAfter(qId) {
  var nextId = UNLOCK_MAP[qId];
  if (nextId) {
    document.getElementById(nextId).classList.remove('hidden');
  }
}
