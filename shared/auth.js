/*  Ascend Academy — Auth System
    Supabase auth, registration forms, progress sync.
    Flow: Form first → then choose Google or email/password.
*/

var SUPABASE_URL = 'https://jbiqzdavkwioxhtwchiy.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiaXF6ZGF2a3dpb3hodHdjaGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDEwMTUsImV4cCI6MjA5MDk3NzAxNX0.se1MOm_Rl8KOi_0lRN3JDrcv9eNqpWDrfOdHDgKVM_E';

var sb;
var currentUser = null;
var loginInProgress = false;

// ─── INIT ───
function initAuth() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // Check for existing session
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
      // Skip if email login is handling this
      if (loginInProgress) return;
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
      localStorage.removeItem('ascend_profile_cache');
      var homePromo = document.getElementById('homePromoHeader');
      if (homePromo) homePromo.textContent = 'Ready to take the next step?';
    }
  });
}

// ─── PROFILE CHECK ───
function checkProfileAndUpdateUI() {
  // Check localStorage first (instant)
  var cachedName = localStorage.getItem('ascend_user_first');
  if (cachedName) {
    updateNavForUser({ id: currentUser.id, first_name: cachedName });
    closeAuthModal();
    document.body.classList.remove('auth-pending');
    document.body.classList.add('auth-ready');
    hydrateFromSupabase();
    return;
  }

  // No cache — must wait for DB query before showing anything
  sb.from('hub_profiles').select('*').eq('id', currentUser.id).maybeSingle().then(function(res) {
    if (res.data && res.data.first_name) {
      localStorage.setItem('ascend_user_first', res.data.first_name);
      localStorage.setItem('ascend_profile_cache', JSON.stringify(res.data));
      updateNavForUser(res.data);
    } else {
      // Try auth metadata as last resort
      var metaName = (currentUser.user_metadata && currentUser.user_metadata.first_name) ||
        (currentUser.user_metadata && currentUser.user_metadata.full_name && currentUser.user_metadata.full_name.split(' ')[0]);
      if (metaName) {
        localStorage.setItem('ascend_user_first', metaName);
        updateNavForUser({ id: currentUser.id, first_name: metaName });
      } else {
        updateNavForGuest();
      }
    }
    closeAuthModal();
    document.body.classList.remove('auth-pending');
    document.body.classList.add('auth-ready');
    hydrateFromSupabase();
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
  document.body.classList.remove('auth-pending');
  document.body.classList.add('auth-ready');
}

function updateNavForUser(profile) {
  // Close any open dropdown first
  var oldDropdown = document.getElementById('userDropdown');
  if (oldDropdown) oldDropdown.classList.add('hidden');

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
      '<div class="nav-user-menu-wrap">' +
        '<span class="nav-user-name" onclick="toggleUserMenu()">' + name + ' ▾</span>' +
        '<div class="nav-user-dropdown hidden" id="userDropdown">' +
          '<button onclick="showSettingsModal(\'profile\')">Edit Profile</button>' +
          '<button onclick="showSettingsModal(\'password\')">Change Password</button>' +
          '<button onclick="showSettingsModal(\'reset\')">Reset Progress</button>' +
          '<button onclick="toggleDarkModeFromMenu()">Dark Mode</button>' +
          (('ontouchstart' in window) ? '<button onclick="showInstallInstructions()">Add to Home Screen</button>' : '') +
          '<hr>' +
          '<button onclick="handleLogout()">Log Out</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  // Personalize UI (skip if fallback name)
  var badgeTitle = document.querySelector('.badge-section-title');
  var progressLabel = document.querySelector('.progress-label');
  if (name && name !== 'Your') {
    if (badgeTitle) badgeTitle.textContent = '🏅 ' + name + "'s Badges";
    if (progressLabel) progressLabel.textContent = name + "'s Progress";
    localStorage.setItem('ascend_user_first', name);
  } else {
    if (badgeTitle) badgeTitle.textContent = '🏅 Your Badges';
    if (progressLabel) progressLabel.textContent = 'Your Progress';
  }
  // Personalize homepage promo header
  var homePromo = document.getElementById('homePromoHeader');
  if (homePromo && name && name !== 'Your') {
    homePromo.textContent = name + ', are you ready to take the next step?';
  }
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
  var dd = document.getElementById('userDropdown');
  if (dd) dd.classList.add('hidden');
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
    '<div class="auth-phone-row"><select id="regCountryCode" class="auth-input auth-country-code"><option value="+1">+1 (US)</option><option value="+44">+44 (UK)</option><option value="+91">+91 (IN)</option><option value="+86">+86 (CN)</option><option value="+81">+81 (JP)</option><option value="+82">+82 (KR)</option><option value="+61">+61 (AU)</option><option value="+49">+49 (DE)</option><option value="+33">+33 (FR)</option><option value="+52">+52 (MX)</option><option value="+55">+55 (BR)</option></select><input type="tel" id="regPhone" class="auth-input" placeholder="555-123-4567" oninput="formatPhone(this)"></div>' +
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
      '<input type="tel" id="regP1Phone" class="auth-input" placeholder="Phone" oninput="formatPhone(this)">' +
    '</div>' +
    '<div id="parent2Section" class="hidden">' +
      '<div class="auth-section-label">Parent / Guardian 2</div>' +
      '<div class="auth-row">' +
        '<input type="text" id="regP2First" class="auth-input" placeholder="First name">' +
        '<input type="text" id="regP2Last" class="auth-input" placeholder="Last name">' +
      '</div>' +
      '<div class="auth-row">' +
        '<input type="email" id="regP2Email" class="auth-input" placeholder="Email">' +
        '<input type="tel" id="regP2Phone" class="auth-input" placeholder="Phone" oninput="formatPhone(this)">' +
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
    '<div class="auth-phone-row"><select id="regCountryCode" class="auth-input auth-country-code"><option value="+1">+1 (US)</option><option value="+44">+44 (UK)</option><option value="+91">+91 (IN)</option><option value="+86">+86 (CN)</option><option value="+81">+81 (JP)</option><option value="+82">+82 (KR)</option><option value="+61">+61 (AU)</option><option value="+49">+49 (DE)</option><option value="+33">+33 (FR)</option><option value="+52">+52 (MX)</option><option value="+55">+55 (BR)</option></select><input type="tel" id="regPhone" class="auth-input" placeholder="555-123-4567" oninput="formatPhone(this)"></div>' +
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
    '<div class="auth-phone-row"><select id="regCountryCode" class="auth-input auth-country-code"><option value="+1">+1 (US)</option><option value="+44">+44 (UK)</option><option value="+91">+91 (IN)</option><option value="+86">+86 (CN)</option><option value="+81">+81 (JP)</option><option value="+82">+82 (KR)</option><option value="+61">+61 (AU)</option><option value="+49">+49 (DE)</option><option value="+33">+33 (FR)</option><option value="+52">+52 (MX)</option><option value="+55">+55 (BR)</option></select><input type="tel" id="regPhone" class="auth-input" placeholder="555-123-4567" oninput="formatPhone(this)"></div>' +
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
    '<button class="auth-close" onclick="closeAuthModal()">&times;</button>' +
    '<div class="auth-header">' +
      '<img src="Pictures/compressed_image.jpg" alt="Ascend" class="auth-logo">' +
      '<div class="auth-title">Complete Your Profile</div>' +
      '<div class="auth-subtitle">Tell us a bit about yourself to get started</div>' +
    '</div>' +
    '<div id="authTabContent">' + getRoleSelection() + '</div>' +
    '<div style="text-align:center;padding:0 32px 24px;">' +
      '<button class="auth-back-btn" onclick="closeAuthModal()">Skip for now</button>' +
    '</div>' +
  '</div>';
  overlay.classList.add('open');
}

// ─── VALIDATION ───
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatPhone(input) {
  var digits = input.value.replace(/\D/g, '');
  if (digits.length > 10) digits = digits.substring(0, 10);
  if (digits.length >= 7) {
    input.value = digits.substring(0,3) + '-' + digits.substring(3,6) + '-' + digits.substring(6);
  } else if (digits.length >= 4) {
    input.value = digits.substring(0,3) + '-' + digits.substring(3);
  } else {
    input.value = digits;
  }
}

function validatePhone(phone) {
  if (!phone) return true; // optional field
  var digits = phone.replace(/\D/g, '');
  return digits.length === 10;
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

  var phone = document.getElementById('regPhone').value.trim();
  var school = document.getElementById('regSchool').value.trim();
  var stateVal = document.getElementById('regState').value;
  var grade = document.getElementById('regGrade').value;
  var p1first = document.getElementById('regP1First').value.trim();
  var p1last = document.getElementById('regP1Last').value.trim();
  var p1email = document.getElementById('regP1Email').value.trim();
  var p1phone = document.getElementById('regP1Phone').value.trim();

  if (!first || !last || !email || !phone || !school || !stateVal || !grade || !p1first || !p1last || !p1email || !p1phone) {
    showAuthError('Please fill in all required fields.'); return null;
  }
  if (!validateEmail(email)) { showAuthError('Please enter a valid email address.'); return null; }
  if (!validatePhone(phone)) { showAuthError('Please enter a valid 10-digit phone number.'); return null; }
  if (!validateEmail(p1email)) { showAuthError('Please enter a valid email for Parent/Guardian 1.'); return null; }
  if (!validatePhone(p1phone)) { showAuthError('Please enter a valid phone for Parent/Guardian 1.'); return null; }

  var p2email = document.getElementById('regP2Email') ? document.getElementById('regP2Email').value.trim() : '';
  if (p2email && !validateEmail(p2email)) { showAuthError('Please enter a valid email for Parent/Guardian 2.'); return null; }

  return {
    role: 'student',
    first_name: first, last_name: last, email: email,
    phone: (document.getElementById('regCountryCode').value + ' ' + phone),
    school: school,
    state: stateVal,
    grade: grade,
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
  var phone = document.getElementById('regPhone').value.trim();
  var school = document.getElementById('regSchool').value.trim();
  var stateVal = document.getElementById('regState').value;
  var studentGrade = document.getElementById('regStudentGrade').value;

  if (!first || !last || !email || !phone || !school || !stateVal || !studentGrade) {
    showAuthError('Please fill in all required fields.'); return null;
  }
  if (!validateEmail(email)) { showAuthError('Please enter a valid email address.'); return null; }
  if (!validatePhone(phone)) { showAuthError('Please enter a valid 10-digit phone number.'); return null; }

  return {
    role: 'parent',
    first_name: first, last_name: last, email: email,
    phone: (document.getElementById('regCountryCode').value + ' ' + phone),
    school: school,
    state: stateVal,
    student_grade: document.getElementById('regStudentGrade').value,
    student_school: document.getElementById('regSchool').value.trim(),
    interested_camps: document.getElementById('regCamps').checked
  };
}

function collectEducatorData() {
  var first = document.getElementById('regFirst').value.trim();
  var last = document.getElementById('regLast').value.trim();
  var email = document.getElementById('regEmail').value.trim();
  var phone = document.getElementById('regPhone').value.trim();
  var school = document.getElementById('regSchool').value.trim();
  var stateVal = document.getElementById('regState').value;

  if (!first || !last || !email || !phone || !school || !stateVal) {
    showAuthError('Please fill in all required fields.'); return null;
  }
  if (!validateEmail(email)) { showAuthError('Please enter a valid email address.'); return null; }
  if (!validatePhone(phone)) { showAuthError('Please enter a valid 10-digit phone number.'); return null; }

  return {
    role: 'educator',
    first_name: first, last_name: last, email: email,
    phone: (document.getElementById('regCountryCode').value + ' ' + phone),
    school: school,
    state: stateVal,
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

  loginInProgress = true;
  sb.auth.signInWithPassword({ email: email, password: password }).then(function(res) {
    if (res.error) { loginInProgress = false; showAuthError(res.error.message); return; }
    currentUser = res.data.user;
    // signInWithPassword returns a fully authenticated session, query immediately
    return sb.from('hub_profiles').select('*').eq('id', currentUser.id).maybeSingle();
  }).then(function(profileRes) {
    loginInProgress = false;
    if (!profileRes) return;
    if (profileRes.data) {
      localStorage.setItem('ascend_user_first', profileRes.data.first_name);
      localStorage.setItem('ascend_profile_cache', JSON.stringify(profileRes.data));
      updateNavForUser(profileRes.data);
      hydrateFromSupabase();
    } else {
      // No profile found after login. Show "Account" not email prefix.
      updateNavForUser({ id: currentUser.id, first_name: 'Your' });
    }
    closeAuthModal();
  });
}

function handleStudentSignup() {
  clearAuthError();
  var data = collectStudentData();
  if (!data) return;

  var password = document.getElementById('regPassword').value;
  if (!password || password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }

  // Cache name immediately so nav updates instantly after signup
  localStorage.setItem('ascend_user_first', data.first_name);

  sb.auth.signUp({ email: data.email, password: password, options: { data: { first_name: data.first_name } } }).then(function(res) {
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

  localStorage.setItem('ascend_user_first', data.first_name);

  sb.auth.signUp({ email: data.email, password: password, options: { data: { first_name: data.first_name } } }).then(function(res) {
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

  localStorage.setItem('ascend_user_first', data.first_name);

  sb.auth.signUp({ email: data.email, password: password, options: { data: { first_name: data.first_name } } }).then(function(res) {
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
    if (typeof renderContinueCard === 'function') renderContinueCard();
    if (typeof renderUnitProgressRings === 'function') renderUnitProgressRings();
    if (typeof addHoverPreviews === 'function') addHoverPreviews();
    if (typeof animateNewBadges === 'function') animateNewBadges();
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

// ─── ADD TO HOME SCREEN ───
var deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredInstallPrompt = e;
});

function showInstallInstructions() {
  toggleUserMenu();

  // Android: use native install prompt if available
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt = null;
    return;
  }

  // iOS/fallback: show instructions modal
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  var overlay = document.getElementById('authOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.className = 'auth-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeAuthModal(); };
    document.body.appendChild(overlay);
  }

  var instructions = isIOS
    ? '<p style="font-size:14px;color:#666;line-height:1.8;text-align:left;">' +
        '<strong>1.</strong> Tap the <strong>Share</strong> button (the square with an arrow) at the bottom of Safari<br>' +
        '<strong>2.</strong> Scroll down and tap <strong>"Add to Home Screen"</strong><br>' +
        '<strong>3.</strong> Tap <strong>"Add"</strong> in the top right' +
      '</p>'
    : '<p style="font-size:14px;color:#666;line-height:1.8;text-align:left;">' +
        '<strong>1.</strong> Tap the <strong>⋮ menu</strong> (three dots) in your browser<br>' +
        '<strong>2.</strong> Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong><br>' +
        '<strong>3.</strong> Tap <strong>"Add"</strong> to confirm' +
      '</p>';

  overlay.innerHTML = '<div class="auth-panel">' +
    '<button class="auth-close" onclick="closeAuthModal()">&times;</button>' +
    '<div class="auth-header">' +
      '<img src="Pictures/compressed_image.jpg" alt="Ascend" class="auth-logo">' +
      '<div class="auth-title">Add to Home Screen</div>' +
      '<div class="auth-subtitle">Access Ascend Academy like a native app</div>' +
    '</div>' +
    '<div style="padding:20px 32px 32px;">' +
      instructions +
    '</div>' +
  '</div>';
  overlay.classList.add('open');
}

// ─── USER DROPDOWN MENU ───
function toggleUserMenu() {
  var dd = document.getElementById('userDropdown');
  if (dd) dd.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  var dd = document.getElementById('userDropdown');
  if (dd && !dd.classList.contains('hidden') && !e.target.closest('.nav-user-menu-wrap')) {
    dd.classList.add('hidden');
  }
});

function toggleDarkModeFromMenu() {
  document.body.classList.toggle('dark-mode');
  var isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('ascend_dark_mode', isDark);
  var btn = document.querySelector('.dark-toggle');
  if (btn) btn.innerHTML = isDark ? '☀️' : '🌙';
  toggleUserMenu();
}

// ─── SETTINGS MODAL ───
function showSettingsModal(tab) {
  toggleUserMenu();
  var overlay = document.getElementById('authOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.className = 'auth-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeAuthModal(); };
    document.body.appendChild(overlay);
  }

  if (tab === 'profile') overlay.innerHTML = getEditProfileHTML();
  else if (tab === 'password') overlay.innerHTML = getChangePasswordHTML();
  else if (tab === 'reset') overlay.innerHTML = getResetProgressHTML();

  overlay.classList.add('open');
}

function getEditProfileHTML() {
  // Fetch current profile to populate
  var cached = localStorage.getItem('ascend_profile_cache');
  var p = cached ? JSON.parse(cached) : {};

  return '<div class="auth-panel">' +
    '<button class="auth-close" onclick="closeAuthModal()">&times;</button>' +
    '<div class="auth-header">' +
      '<div class="auth-title">Edit Profile</div>' +
      '<div class="auth-subtitle">Update your information</div>' +
    '</div>' +
    '<div class="auth-form" style="padding:24px 32px 32px;">' +
      '<div class="auth-row">' +
        '<input type="text" id="editFirst" class="auth-input" placeholder="First name" value="' + (p.first_name || '') + '">' +
        '<input type="text" id="editLast" class="auth-input" placeholder="Last name" value="' + (p.last_name || '') + '">' +
      '</div>' +
      '<input type="tel" id="editPhone" class="auth-input" placeholder="Phone" value="' + (p.phone || '') + '">' +
      '<div class="auth-row">' +
        '<input type="text" id="editSchool" class="auth-input" placeholder="School" value="' + (p.school || '') + '">' +
        '<select id="editState" class="auth-input">' + stateOptions() + '</select>' +
      '</div>' +
      (p.role === 'student' ? '<select id="editGrade" class="auth-input">' + gradeOptions() + '</select>' +
        '<label class="auth-checkbox"><input type="checkbox" id="editLeader"' + (p.is_team_leader ? ' checked' : '') + '> Team leadership?</label>' +
        '<div class="auth-section-label">Parent / Guardian 1</div>' +
        '<div class="auth-row">' +
          '<input type="text" id="editP1First" class="auth-input" placeholder="First name" value="' + (p.parent1_first || '') + '">' +
          '<input type="text" id="editP1Last" class="auth-input" placeholder="Last name" value="' + (p.parent1_last || '') + '">' +
        '</div>' +
        '<div class="auth-row">' +
          '<input type="email" id="editP1Email" class="auth-input" placeholder="Email" value="' + (p.parent1_email || '') + '">' +
          '<input type="tel" id="editP1Phone" class="auth-input" placeholder="Phone" value="' + (p.parent1_phone || '') + '">' +
        '</div>' +
        '<label class="auth-checkbox"><input type="checkbox" id="editCamps"' + (p.interested_camps ? ' checked' : '') + '> Interested in Ascend summer camps</label>'
      : '') +
      (p.role === 'parent' ? '<select id="editStudentGrade" class="auth-input">' + gradeOptions() + '</select>' +
        '<label class="auth-checkbox"><input type="checkbox" id="editCamps"' + (p.interested_camps ? ' checked' : '') + '> Interested in Ascend summer camps</label>'
      : '') +
      (p.role === 'educator' ? '<label class="auth-checkbox"><input type="checkbox" id="editSupport"' + (p.interested_ascend_support ? ' checked' : '') + '> Interested in Ascend team support</label>'
      : '') +
      '<div class="auth-error hidden" id="authError"></div>' +
      '<div class="auth-success hidden" id="authSuccess"></div>' +
      '<button class="auth-submit-btn" onclick="saveProfile()">Save Changes</button>' +
    '</div>' +
  '</div>';
}

function saveProfile() {
  clearAuthError();
  var first = document.getElementById('editFirst').value.trim();
  var last = document.getElementById('editLast').value.trim();
  if (!first || !last) { showAuthError('Name is required.'); return; }

  var updates = {
    first_name: first,
    last_name: last,
    phone: document.getElementById('editPhone').value.trim(),
    school: document.getElementById('editSchool').value.trim(),
    state: document.getElementById('editState').value
  };

  // Student fields
  if (document.getElementById('editGrade')) updates.grade = document.getElementById('editGrade').value;
  if (document.getElementById('editLeader')) updates.is_team_leader = document.getElementById('editLeader').checked;
  if (document.getElementById('editP1First')) {
    updates.parent1_first = document.getElementById('editP1First').value.trim();
    updates.parent1_last = document.getElementById('editP1Last').value.trim();
    updates.parent1_email = document.getElementById('editP1Email').value.trim();
    updates.parent1_phone = document.getElementById('editP1Phone').value.trim();
  }
  // Camp interest
  if (document.getElementById('editCamps')) updates.interested_camps = document.getElementById('editCamps').checked;
  // Parent student grade
  if (document.getElementById('editStudentGrade')) updates.student_grade = document.getElementById('editStudentGrade').value;
  // Educator support
  if (document.getElementById('editSupport')) updates.interested_ascend_support = document.getElementById('editSupport').checked;

  sb.from('hub_profiles').update(updates).eq('id', currentUser.id).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    // Update caches
    localStorage.setItem('ascend_user_first', first);
    sb.auth.updateUser({ data: { first_name: first } });
    var cached = localStorage.getItem('ascend_profile_cache');
    if (cached) {
      var profile = JSON.parse(cached);
      Object.assign(profile, updates);
      localStorage.setItem('ascend_profile_cache', JSON.stringify(profile));
    }
    updateNavForUser({ id: currentUser.id, first_name: first });
    var el = document.getElementById('authSuccess');
    if (el) { el.textContent = 'Profile updated!'; el.classList.remove('hidden'); }
  });
}

function getChangePasswordHTML() {
  return '<div class="auth-panel">' +
    '<button class="auth-close" onclick="closeAuthModal()">&times;</button>' +
    '<div class="auth-header">' +
      '<div class="auth-title">Change Password</div>' +
      '<div class="auth-subtitle">Enter your new password</div>' +
    '</div>' +
    '<div class="auth-form" style="padding:24px 32px 32px;">' +
      '<input type="password" id="newPassword" class="auth-input" placeholder="New password (min 6 characters)">' +
      '<input type="password" id="confirmPassword" class="auth-input" placeholder="Confirm new password">' +
      '<div class="auth-error hidden" id="authError"></div>' +
      '<div class="auth-success hidden" id="authSuccess"></div>' +
      '<button class="auth-submit-btn" onclick="changePassword()">Update Password</button>' +
    '</div>' +
  '</div>';
}

function changePassword() {
  clearAuthError();
  var pw = document.getElementById('newPassword').value;
  var confirm = document.getElementById('confirmPassword').value;
  if (!pw || pw.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  if (pw !== confirm) { showAuthError('Passwords do not match.'); return; }

  sb.auth.updateUser({ password: pw }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    var el = document.getElementById('authSuccess');
    if (el) { el.textContent = 'Password updated!'; el.classList.remove('hidden'); }
  });
}

function getResetProgressHTML() {
  return '<div class="auth-panel">' +
    '<button class="auth-close" onclick="closeAuthModal()">&times;</button>' +
    '<div class="auth-header">' +
      '<div class="auth-title">Reset Progress</div>' +
      '<div class="auth-subtitle">This will erase all completed modules and badges</div>' +
    '</div>' +
    '<div class="auth-form" style="padding:24px 32px 32px; text-align:center;">' +
      '<p style="font-size:14px;color:#666;margin-bottom:20px;">Are you sure? This action cannot be undone. All your completed modules and earned badges will be reset to zero.</p>' +
      '<div class="auth-error hidden" id="authError"></div>' +
      '<div class="auth-success hidden" id="authSuccess"></div>' +
      '<button class="auth-submit-btn" style="background:#b91c1c;" onclick="resetProgress()">Yes, Reset Everything</button>' +
      '<button class="auth-back-btn" onclick="closeAuthModal()">Cancel</button>' +
    '</div>' +
  '</div>';
}

function resetProgress() {
  Promise.all([
    sb.from('hub_progress').delete().eq('user_id', currentUser.id),
    sb.from('hub_badges').delete().eq('user_id', currentUser.id)
  ]).then(function(results) {
    if (results[0].error || results[1].error) {
      showAuthError('Failed to reset. Try again.');
      return;
    }
    state.completed = [];
    state.badges = [];
    saveState();
    renderModuleCards();
    renderBadgeShelf();
    updateProgress();
    if (typeof renderContinueCard === 'function') renderContinueCard();
    if (typeof renderUnitProgressRings === 'function') renderUnitProgressRings();
    var el = document.getElementById('authSuccess');
    if (el) { el.textContent = 'Progress reset! Starting fresh.'; el.classList.remove('hidden'); }
  });
}

// ─── MODULE GATE ───
function requireAuth(callback) {
  if (currentUser) {
    callback();
  } else {
    showAuthModal();
  }
}
