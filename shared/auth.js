/*  Ascend Academy — Auth System
    Supabase auth, registration forms, progress sync.
    Flow: Form first → then choose Google or email/password.
*/

var SUPABASE_URL = 'https://jbiqzdavkwioxhtwchiy.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiaXF6ZGF2a3dpb3hodHdjaGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDEwMTUsImV4cCI6MjA5MDk3NzAxNX0.se1MOm_Rl8KOi_0lRN3JDrcv9eNqpWDrfOdHDgKVM_E';

var sb;
var currentUser = null;

// ─── INIT ───
function initAuth() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  sb.auth.getSession().then(function(res) {
    if (res.data.session) {
      currentUser = res.data.session.user;
      // Check if we have pending profile data from a Google signup
      var pending = localStorage.getItem('ascend_pending_profile');
      if (pending) {
        var profileData = JSON.parse(pending);
        profileData.id = currentUser.id;
        profileData.email = currentUser.email || profileData.email;
        sb.from('hub_profiles').upsert(profileData, { onConflict: 'id' }).then(function() {
          localStorage.removeItem('ascend_pending_profile');
          checkProfileAndUpdateUI();
        });
      } else {
        checkProfileAndUpdateUI();
      }
    } else {
      updateNavForGuest();
    }
  });

  sb.auth.onAuthStateChange(function(event, session) {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      checkProfileAndUpdateUI();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      updateNavForGuest();
      state.completed = [];
      state.badges = [];
      saveState();
      renderModuleCards();
      renderBadgeShelf();
      updateProgress();
      // Reset personalized text
      var badgeTitle = document.querySelector('.badge-section-title');
      if (badgeTitle) badgeTitle.textContent = '🏅 Your Badges';
      var progressLabel = document.querySelector('.progress-label');
      if (progressLabel) progressLabel.textContent = 'Your Progress';
      localStorage.removeItem('ascend_user_first');
      var homePromo = document.getElementById('homePromoHeader');
      if (homePromo) homePromo.textContent = 'Ready to take the next step?';
    }
  });
}

// ─── PROFILE CHECK ───
function checkProfileAndUpdateUI(retries) {
  if (retries === undefined) retries = 0;
  sb.from('hub_profiles').select('*').eq('id', currentUser.id).maybeSingle().then(function(res) {
    if (res.data) {
      updateNavForUser(res.data);
      hydrateFromSupabase();
      closeAuthModal();
    } else if (retries < 2) {
      // Session token may not be propagated yet — retry after a short delay
      setTimeout(function() { checkProfileAndUpdateUI(retries + 1); }, 1000);
    } else {
      // No profile after retries — new user needs to complete profile
      showProfileForm();
    }
  });
}

// ─── NAV UI ───
function updateNavForGuest() {
  var navRight = document.querySelector('.nav-right');
  var authArea = document.getElementById('navAuthArea');
  if (!authArea) {
    authArea = document.createElement('div');
    authArea.id = 'navAuthArea';
    navRight.appendChild(authArea);
  }
  authArea.innerHTML = '<button class="nav-auth-btn" onclick="showAuthModal()">Sign In</button>';
}

function updateNavForUser(profile) {
  var navRight = document.querySelector('.nav-right');
  var authArea = document.getElementById('navAuthArea');
  if (!authArea) {
    authArea = document.createElement('div');
    authArea.id = 'navAuthArea';
    navRight.appendChild(authArea);
  }
  var name = profile.first_name || currentUser.email;
  authArea.innerHTML =
    '<div class="nav-user">' +
      '<span class="nav-user-name">' + name + '</span>' +
      '<button class="nav-auth-btn nav-logout" onclick="handleLogout()">Log Out</button>' +
    '</div>';

  // Personalize UI
  var badgeTitle = document.querySelector('.badge-section-title');
  if (badgeTitle) badgeTitle.textContent = '🏅 ' + name + "'s Badges";
  var progressLabel = document.querySelector('.progress-label');
  if (progressLabel) progressLabel.textContent = name + "'s Progress";
  // Store name for module pages
  localStorage.setItem('ascend_user_first', name);
  // Personalize homepage promo header
  var homePromo = document.getElementById('homePromoHeader');
  if (homePromo) homePromo.textContent = name + ', are you ready to take the next step?';
}

// ─── AUTH MODAL ───
function showAuthModal() {
  var overlay = document.getElementById('authOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.className = 'auth-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeAuthModal(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = getSignInHTML();
  overlay.classList.add('open');
}

function closeAuthModal() {
  var overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.remove('open');
}

function getSignInHTML() {
  return '<div class="auth-panel">' +
    '<button class="auth-close" onclick="closeAuthModal()">&times;</button>' +
    '<div class="auth-header">' +
      '<img src="Pictures/compressed_image.jpg" alt="Ascend" class="auth-logo">' +
      '<div class="auth-title">Welcome to Ascend Academy</div>' +
      '<div class="auth-subtitle">Sign in to save your progress and earn badges</div>' +
    '</div>' +
    '<div class="auth-tabs">' +
      '<button class="auth-tab active" onclick="switchAuthTab(this,\'signin\')">Sign In</button>' +
      '<button class="auth-tab" onclick="switchAuthTab(this,\'signup\')">Create Account</button>' +
    '</div>' +
    '<div id="authTabContent">' + getSignInForm() + '</div>' +
  '</div>';
}

function switchAuthTab(btn, tab) {
  document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  var content = document.getElementById('authTabContent');
  content.innerHTML = tab === 'signin' ? getSignInForm() : getRoleSelection();
}

function getSignInForm() {
  return '<div class="auth-form">' +
    '<button class="auth-google-btn" onclick="handleGoogleLogin()">' +
      googleSVG() + 'Continue with Google' +
    '</button>' +
    '<div class="auth-divider"><span>or</span></div>' +
    '<input type="email" id="authEmail" class="auth-input" placeholder="Email address" required>' +
    '<input type="password" id="authPassword" class="auth-input" placeholder="Password" required>' +
    '<div class="auth-error hidden" id="authError"></div>' +
    '<button class="auth-submit-btn" onclick="handleEmailLogin()">Sign In</button>' +
    '<button class="auth-link-btn" style="width:100%;text-align:center;margin-top:8px;" onclick="showForgotPassword()">Forgot password?</button>' +
  '</div>';
}

function googleSVG() {
  return '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
}

// ─── ROLE SELECTION ───
function getRoleSelection() {
  return '<div class="auth-role-select">' +
    '<div class="auth-role-prompt">I am a...</div>' +
    '<div class="auth-role-cards">' +
      '<div class="auth-role-card" onclick="showRoleForm(\'student\')">' +
        '<div class="auth-role-icon">🎓</div>' +
        '<div class="auth-role-name">Student</div>' +
      '</div>' +
      '<div class="auth-role-card" onclick="showRoleForm(\'parent\')">' +
        '<div class="auth-role-icon">👨‍👩‍👧</div>' +
        '<div class="auth-role-name">Parent / Guardian</div>' +
      '</div>' +
      '<div class="auth-role-card" onclick="showRoleForm(\'educator\')">' +
        '<div class="auth-role-icon">📚</div>' +
        '<div class="auth-role-name">Educator</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// ─── DROPDOWNS ───
var US_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','Outside U.S.'];
var GRADES = ['12th','11th','10th','9th','8th','7th','6th','5th','4th','Other'];

function stateOptions() {
  return '<option value="">Select state...</option>' + US_STATES.map(function(s) {
    return '<option value="' + s + '">' + s + '</option>';
  }).join('');
}
function gradeOptions() {
  return '<option value="">Select grade...</option>' + GRADES.map(function(g) {
    return '<option value="' + g + '">' + g + '</option>';
  }).join('');
}

// ─── REGISTRATION FORMS (form first, auth method last) ───
function showRoleForm(role) {
  var content = document.getElementById('authTabContent');
  if (role === 'student') content.innerHTML = getStudentForm();
  else if (role === 'parent') content.innerHTML = getParentForm();
  else if (role === 'educator') content.innerHTML = getEducatorForm();
}

function getStudentForm() {
  return '<div class="auth-form auth-reg-form">' +
    '<div class="auth-form-title">Student Registration</div>' +
    '<div class="auth-row">' +
      '<input type="text" id="regFirst" class="auth-input" placeholder="First name *" required>' +
      '<input type="text" id="regLast" class="auth-input" placeholder="Last name *" required>' +
    '</div>' +
    '<input type="email" id="regEmail" class="auth-input" placeholder="Email address *" required>' +
    '<input type="tel" id="regPhone" class="auth-input" placeholder="Phone number">' +
    '<div class="auth-row">' +
      '<input type="text" id="regSchool" class="auth-input" placeholder="School">' +
      '<select id="regState" class="auth-input">' + stateOptions() + '</select>' +
    '</div>' +
    '<div class="auth-row">' +
      '<select id="regGrade" class="auth-input">' + gradeOptions() + '</select>' +
      '<label class="auth-checkbox"><input type="checkbox" id="regLeader"> Team leadership?</label>' +
    '</div>' +
    '<div class="auth-section-label">Parent / Guardian 1</div>' +
    '<div class="auth-row">' +
      '<input type="text" id="regP1First" class="auth-input" placeholder="First name">' +
      '<input type="text" id="regP1Last" class="auth-input" placeholder="Last name">' +
    '</div>' +
    '<div class="auth-row">' +
      '<input type="email" id="regP1Email" class="auth-input" placeholder="Email">' +
      '<input type="tel" id="regP1Phone" class="auth-input" placeholder="Phone">' +
    '</div>' +
    '<div id="parent2Section" class="hidden">' +
      '<div class="auth-section-label">Parent / Guardian 2</div>' +
      '<div class="auth-row">' +
        '<input type="text" id="regP2First" class="auth-input" placeholder="First name">' +
        '<input type="text" id="regP2Last" class="auth-input" placeholder="Last name">' +
      '</div>' +
      '<div class="auth-row">' +
        '<input type="email" id="regP2Email" class="auth-input" placeholder="Email">' +
        '<input type="tel" id="regP2Phone" class="auth-input" placeholder="Phone">' +
      '</div>' +
    '</div>' +
    '<button class="auth-link-btn" onclick="document.getElementById(\'parent2Section\').classList.toggle(\'hidden\')">+ Add second parent/guardian</button>' +
    '<label class="auth-checkbox"><input type="checkbox" id="regCamps"> I\'m interested in learning more about Ascend\'s summer camps</label>' +
    '<div class="auth-divider"><span>How would you like to sign in?</span></div>' +
    '<div class="auth-error hidden" id="authError"></div>' +
    '<button class="auth-google-btn" onclick="handleRoleGoogleSignup(\'student\')">' + googleSVG() + ' Sign up with Google</button>' +
    '<div style="text-align:center;font-size:12px;color:#999;margin:12px 0;">or</div>' +
    '<input type="password" id="regPassword" class="auth-input" placeholder="Create password (min 6 characters) *">' +
    '<button class="auth-submit-btn" onclick="handleStudentSignup()">Create Account with Email</button>' +
    '<button class="auth-back-btn" onclick="switchAuthTab(document.querySelectorAll(\'.auth-tab\')[1],\'signup\')">← Back to role selection</button>' +
  '</div>';
}

function getParentForm() {
  return '<div class="auth-form auth-reg-form">' +
    '<div class="auth-form-title">Parent / Guardian Registration</div>' +
    '<div class="auth-row">' +
      '<input type="text" id="regFirst" class="auth-input" placeholder="First name *" required>' +
      '<input type="text" id="regLast" class="auth-input" placeholder="Last name *" required>' +
    '</div>' +
    '<input type="email" id="regEmail" class="auth-input" placeholder="Email address *" required>' +
    '<input type="tel" id="regPhone" class="auth-input" placeholder="Phone number">' +
    '<div class="auth-row">' +
      '<input type="text" id="regSchool" class="auth-input" placeholder="Student\'s school">' +
      '<select id="regState" class="auth-input">' + stateOptions() + '</select>' +
    '</div>' +
    '<select id="regStudentGrade" class="auth-input">' + gradeOptions() + '</select>' +
    '<label class="auth-checkbox"><input type="checkbox" id="regCamps"> I\'m interested in learning more about Ascend\'s summer camps</label>' +
    '<div class="auth-divider"><span>How would you like to sign in?</span></div>' +
    '<div class="auth-error hidden" id="authError"></div>' +
    '<button class="auth-google-btn" onclick="handleRoleGoogleSignup(\'parent\')">' + googleSVG() + ' Sign up with Google</button>' +
    '<div style="text-align:center;font-size:12px;color:#999;margin:12px 0;">or</div>' +
    '<input type="password" id="regPassword" class="auth-input" placeholder="Create password (min 6 characters) *">' +
    '<button class="auth-submit-btn" onclick="handleParentSignup()">Create Account with Email</button>' +
    '<button class="auth-back-btn" onclick="switchAuthTab(document.querySelectorAll(\'.auth-tab\')[1],\'signup\')">← Back to role selection</button>' +
  '</div>';
}

function getEducatorForm() {
  return '<div class="auth-form auth-reg-form">' +
    '<div class="auth-form-title">Educator Registration</div>' +
    '<div class="auth-row">' +
      '<input type="text" id="regFirst" class="auth-input" placeholder="First name *" required>' +
      '<input type="text" id="regLast" class="auth-input" placeholder="Last name *" required>' +
    '</div>' +
    '<input type="email" id="regEmail" class="auth-input" placeholder="Email address *" required>' +
    '<input type="tel" id="regPhone" class="auth-input" placeholder="Phone number">' +
    '<div class="auth-row">' +
      '<input type="text" id="regSchool" class="auth-input" placeholder="School">' +
      '<select id="regState" class="auth-input">' + stateOptions() + '</select>' +
    '</div>' +
    '<label class="auth-checkbox"><input type="checkbox" id="regSupport"> I\'m interested in exploring ways Ascend can support my team</label>' +
    '<div class="auth-divider"><span>How would you like to sign in?</span></div>' +
    '<div class="auth-error hidden" id="authError"></div>' +
    '<button class="auth-google-btn" onclick="handleRoleGoogleSignup(\'educator\')">' + googleSVG() + ' Sign up with Google</button>' +
    '<div style="text-align:center;font-size:12px;color:#999;margin:12px 0;">or</div>' +
    '<input type="password" id="regPassword" class="auth-input" placeholder="Create password (min 6 characters) *">' +
    '<button class="auth-submit-btn" onclick="handleEducatorSignup()">Create Account with Email</button>' +
    '<button class="auth-back-btn" onclick="switchAuthTab(document.querySelectorAll(\'.auth-tab\')[1],\'signup\')">← Back to role selection</button>' +
  '</div>';
}

// ─── PROFILE FORM (for Google users redirected back without pending data) ───
function showProfileForm() {
  var overlay = document.getElementById('authOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.className = 'auth-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = '<div class="auth-panel">' +
    '<div class="auth-header">' +
      '<img src="Pictures/compressed_image.jpg" alt="Ascend" class="auth-logo">' +
      '<div class="auth-title">Complete Your Profile</div>' +
      '<div class="auth-subtitle">Tell us a bit about yourself to get started</div>' +
    '</div>' +
    '<div id="authTabContent">' + getRoleSelection() + '</div>' +
  '</div>';
  overlay.classList.add('open');
}

// ─── VALIDATION ───
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showAuthError(msg) {
  var el = document.getElementById('authError');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function clearAuthError() {
  var el = document.getElementById('authError');
  if (el) el.classList.add('hidden');
}

// ─── COLLECT FORM DATA ───
function collectStudentData() {
  var first = document.getElementById('regFirst').value.trim();
  var last = document.getElementById('regLast').value.trim();
  var email = document.getElementById('regEmail').value.trim();

  if (!first || !last || !email) { showAuthError('Please fill in all required fields (*).'); return null; }
  if (!validateEmail(email)) { showAuthError('Please enter a valid email address.'); return null; }

  var p1email = document.getElementById('regP1Email').value.trim();
  if (p1email && !validateEmail(p1email)) { showAuthError('Please enter a valid email for Parent/Guardian 1.'); return null; }
  var p2email = document.getElementById('regP2Email') ? document.getElementById('regP2Email').value.trim() : '';
  if (p2email && !validateEmail(p2email)) { showAuthError('Please enter a valid email for Parent/Guardian 2.'); return null; }

  return {
    role: 'student',
    first_name: first, last_name: last, email: email,
    phone: document.getElementById('regPhone').value.trim(),
    school: document.getElementById('regSchool').value.trim(),
    state: document.getElementById('regState').value,
    grade: document.getElementById('regGrade').value,
    is_team_leader: document.getElementById('regLeader').checked,
    parent1_first: document.getElementById('regP1First').value.trim(),
    parent1_last: document.getElementById('regP1Last').value.trim(),
    parent1_email: p1email,
    parent1_phone: document.getElementById('regP1Phone').value.trim(),
    parent2_first: document.getElementById('regP2First') ? document.getElementById('regP2First').value.trim() : null,
    parent2_last: document.getElementById('regP2Last') ? document.getElementById('regP2Last').value.trim() : null,
    parent2_email: p2email || null,
    parent2_phone: document.getElementById('regP2Phone') ? document.getElementById('regP2Phone').value.trim() : null,
    interested_camps: document.getElementById('regCamps').checked
  };
}

function collectParentData() {
  var first = document.getElementById('regFirst').value.trim();
  var last = document.getElementById('regLast').value.trim();
  var email = document.getElementById('regEmail').value.trim();

  if (!first || !last || !email) { showAuthError('Please fill in all required fields (*).'); return null; }
  if (!validateEmail(email)) { showAuthError('Please enter a valid email address.'); return null; }

  return {
    role: 'parent',
    first_name: first, last_name: last, email: email,
    phone: document.getElementById('regPhone').value.trim(),
    school: document.getElementById('regSchool').value.trim(),
    state: document.getElementById('regState').value,
    student_grade: document.getElementById('regStudentGrade').value,
    student_school: document.getElementById('regSchool').value.trim(),
    interested_camps: document.getElementById('regCamps').checked
  };
}

function collectEducatorData() {
  var first = document.getElementById('regFirst').value.trim();
  var last = document.getElementById('regLast').value.trim();
  var email = document.getElementById('regEmail').value.trim();

  if (!first || !last || !email) { showAuthError('Please fill in all required fields (*).'); return null; }
  if (!validateEmail(email)) { showAuthError('Please enter a valid email address.'); return null; }

  return {
    role: 'educator',
    first_name: first, last_name: last, email: email,
    phone: document.getElementById('regPhone').value.trim(),
    school: document.getElementById('regSchool').value.trim(),
    state: document.getElementById('regState').value,
    interested_ascend_support: document.getElementById('regSupport').checked
  };
}

// ─── AUTH HANDLERS ───
function handleGoogleLogin() {
  sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
}

function handleRoleGoogleSignup(role) {
  clearAuthError();
  var data = null;
  if (role === 'student') data = collectStudentData();
  else if (role === 'parent') data = collectParentData();
  else if (role === 'educator') data = collectEducatorData();

  if (!data) return; // validation failed

  // Store profile data — will be saved after Google redirect
  localStorage.setItem('ascend_pending_profile', JSON.stringify(data));

  sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
}

function showForgotPassword() {
  var content = document.getElementById('authTabContent');
  content.innerHTML = '<div class="auth-form">' +
    '<div class="auth-form-title">Reset Your Password</div>' +
    '<p style="font-size:13px;color:#666;margin-bottom:16px;text-align:center;">Enter your email and we\'ll send you a link to reset your password.</p>' +
    '<input type="email" id="resetEmail" class="auth-input" placeholder="Email address" required>' +
    '<div class="auth-error hidden" id="authError"></div>' +
    '<div class="auth-success hidden" id="authSuccess"></div>' +
    '<button class="auth-submit-btn" onclick="handleForgotPassword()">Send Reset Link</button>' +
    '<button class="auth-back-btn" onclick="switchAuthTab(document.querySelectorAll(\'.auth-tab\')[0],\'signin\')">← Back to Sign In</button>' +
  '</div>';
}

function handleForgotPassword() {
  clearAuthError();
  var el = document.getElementById('authSuccess');
  if (el) el.classList.add('hidden');

  var email = document.getElementById('resetEmail').value.trim();
  if (!email) { showAuthError('Please enter your email address.'); return; }
  if (!validateEmail(email)) { showAuthError('Please enter a valid email address.'); return; }

  sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    var el = document.getElementById('authSuccess');
    if (el) {
      el.textContent = 'Reset link sent! Check your email inbox.';
      el.classList.remove('hidden');
    }
  });
}

function showAccountCreated(firstName) {
  var overlay = document.getElementById('authOverlay');
  if (!overlay) return;
  overlay.innerHTML = '<div class="auth-panel">' +
    '<div style="text-align:center;padding:48px 32px;">' +
      '<img src="Pictures/compressed_image.jpg" alt="Ascend" style="width:64px;margin-bottom:20px;">' +
      '<div style="font-size:48px;margin-bottom:16px;">🎉</div>' +
      '<div style="font-family:Playfair Display,serif;font-size:24px;font-weight:900;color:#111;margin-bottom:8px;">Account Created!</div>' +
      '<div style="font-size:15px;color:#666;margin-bottom:28px;">Welcome to Ascend Academy' + (firstName ? ', ' + firstName : '') + '. You\'re ready to start learning.</div>' +
      '<button class="auth-submit-btn" onclick="closeAuthModal()" style="max-width:280px;margin:0 auto;">Start Learning →</button>' +
    '</div>' +
  '</div>';
}

function handleEmailLogin() {
  clearAuthError();
  var email = document.getElementById('authEmail').value.trim();
  var password = document.getElementById('authPassword').value;

  if (!email || !password) { showAuthError('Please enter email and password.'); return; }
  if (!validateEmail(email)) { showAuthError('Please enter a valid email address.'); return; }

  sb.auth.signInWithPassword({ email: email, password: password }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    closeAuthModal();
  });
}

function handleStudentSignup() {
  clearAuthError();
  var data = collectStudentData();
  if (!data) return;

  var password = document.getElementById('regPassword').value;
  if (!password || password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }

  sb.auth.signUp({ email: data.email, password: password }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return Promise.reject(); }
    currentUser = res.data.user;
    data.id = currentUser.id;
    return sb.from('hub_profiles').insert(data);
  }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    showAccountCreated(data.first_name);
    checkProfileAndUpdateUI();
  }).catch(function() {});
}

function handleParentSignup() {
  clearAuthError();
  var data = collectParentData();
  if (!data) return;

  var password = document.getElementById('regPassword').value;
  if (!password || password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }

  sb.auth.signUp({ email: data.email, password: password }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return Promise.reject(); }
    currentUser = res.data.user;
    data.id = currentUser.id;
    return sb.from('hub_profiles').insert(data);
  }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    showAccountCreated(data.first_name);
    checkProfileAndUpdateUI();
  }).catch(function() {});
}

function handleEducatorSignup() {
  clearAuthError();
  var data = collectEducatorData();
  if (!data) return;

  var password = document.getElementById('regPassword').value;
  if (!password || password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }

  sb.auth.signUp({ email: data.email, password: password }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return Promise.reject(); }
    currentUser = res.data.user;
    data.id = currentUser.id;
    return sb.from('hub_profiles').insert(data);
  }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    showAccountCreated(data.first_name);
    checkProfileAndUpdateUI();
  }).catch(function() {});
}

function handleLogout() {
  sb.auth.signOut();
}

// ─── PROGRESS SYNC ───
function hydrateFromSupabase() {
  if (!currentUser) return;

  Promise.all([
    sb.from('hub_progress').select('module_id').eq('user_id', currentUser.id),
    sb.from('hub_badges').select('badge_id').eq('user_id', currentUser.id)
  ]).then(function(results) {
    if (results[0].data) {
      state.completed = results[0].data.map(function(r) { return r.module_id; });
    }
    if (results[1].data) {
      state.badges = results[1].data.map(function(r) { return r.badge_id; });
    }
    saveState();
    renderModuleCards();
    renderBadgeShelf();
    updateProgress();
  });
}

function syncCompletionToSupabase(moduleId) {
  if (!currentUser) return;
  sb.from('hub_progress').upsert({
    user_id: currentUser.id,
    module_id: moduleId
  }, { onConflict: 'user_id,module_id' });
}

function syncBadgeToSupabase(badgeId) {
  if (!currentUser) return;
  sb.from('hub_badges').upsert({
    user_id: currentUser.id,
    badge_id: badgeId
  }, { onConflict: 'user_id,badge_id' });
}

// ─── MODULE GATE ───
function requireAuth(callback) {
  if (currentUser) {
    callback();
  } else {
    showAuthModal();
  }
}
