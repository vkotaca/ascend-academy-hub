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
  document.getElementById('step' + (step + 1)).classList.remove('hidden');
  stepsCompleted = Math.max(stepsCompleted, step);
  updateTopProgress();
  setTimeout(function () {
    document.getElementById('step' + (step + 1)).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function showCompletion() {
  var lastNext = document.getElementById('next' + TOTAL_STEPS);
  if (lastNext) lastNext.classList.add('hidden');
  var section = document.getElementById('completionSection');
  section.classList.remove('hidden');
  stepsCompleted = TOTAL_STEPS;
  updateTopProgress();

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
  window.close();
}

// --- Multiple Choice ---
function mc(qId, btn, result) {
  var quiz = document.getElementById(qId);
  var btns = quiz.querySelectorAll('.option');
  btns.forEach(function (b) { b.disabled = true; });
  var fb = document.getElementById(qId + '-fb');

  if (result === 'correct') {
    btn.classList.add('correct');
    fb.className = 'feedback show correct-fb';
    fb.textContent = correctPrefix() + (CORRECT_MSGS[qId] || '');
    unlockAfter(qId);
  } else {
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

  if (isCorrect) {
    btn.classList.add('correct');
    fb.className = 'feedback show correct-fb';
    fb.textContent = correctPrefix() + (CORRECT_MSGS[qId] || '');
    unlockAfter(qId);
  } else {
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

  var fb = document.getElementById(qId + '-fb');
  if (allCorrect) {
    fb.className = 'feedback show correct-fb';
    fb.textContent = correctPrefix() + (CORRECT_MSGS[qId] || '');
    unlockAfter(qId);
  } else {
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
