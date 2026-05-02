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
  restoreModuleProgress();
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
  document.getElementById('topSteps').textContent = stepsCompleted + ' / ' + TOTAL_STEPS;
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

function notifyComplete() {
  if (window.opener) {
    window.opener.postMessage(MODULE_ID + '-complete', '*');
  }
  // Module is fully done and synced to Supabase — clear the local resume
  // flag so a fresh re-open of the module doesn't drop the user straight
  // onto the completion screen.
  clearModuleProgress();
  window.close();
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

// Auto-attach tap handlers on touch devices
document.addEventListener('DOMContentLoaded', function() {
  if ('ontouchstart' in window) {
    // Add tap handlers to all drag chips
    document.querySelectorAll('.drag-chip').forEach(function(chip) {
      chip.removeAttribute('draggable');
      chip.addEventListener('click', function() { tapChip(this); });
    });
    // Add tap handlers to all drag targets
    document.querySelectorAll('.drag-target').forEach(function(target) {
      var qId = target.parentElement.id.replace('-targets', '');
      target.addEventListener('click', function() { tapTarget(this, qId); });
    });
  }
});

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
