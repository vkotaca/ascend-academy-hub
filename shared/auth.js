/*  Ascend Academy — Auth System
    Supabase auth, registration forms, progress sync.
    Flow: Form first → then choose Google or email/password.
*/

var SUPABASE_URL = 'https://jbiqzdavkwioxhtwchiy.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiaXF6ZGF2a3dpb3hodHdjaGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDEwMTUsImV4cCI6MjA5MDk3NzAxNX0.se1MOm_Rl8KOi_0lRN3JDrcv9eNqpWDrfOdHDgKVM_E';

var sb;
var currentUser = null;
var loginInProgress = false;
var recoveryInProgress = false;

// ─── INIT ───
function initAuth() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // Capture a referral code if present (?ref=<user_id>) so signup can attribute.
  try {
    var refParams = new URLSearchParams(window.location.search);
    var refId = refParams.get('ref');
    if (refId && /^[0-9a-f-]{36}$/i.test(refId)) {
      localStorage.setItem('ascend_referrer', refId);
    }
  } catch (e) {}

  // Detect whether this page load came from a password-reset email link.
  // Supabase appends `#access_token=...&type=recovery` to the redirect URL.
  // We need to know this BEFORE getSession runs, because the SDK auto-creates
  // a session from the recovery token (we don't want to treat that as a normal sign-in).
  var inRecoveryFlow = (window.location.hash || '').indexOf('type=recovery') !== -1;
  if (inRecoveryFlow) recoveryInProgress = true;

  // Check for existing session
  sb.auth.getSession().then(function(res) {
    if (res.data.session) {
      currentUser = res.data.session.user;
      // If we landed here from a recovery link, force the user to set a new
      // password before they get into the platform.
      if (recoveryInProgress) {
        showSetNewPassword();
        return;
      }
      // Check if we have pending profile data from a Google signup
      var pending = localStorage.getItem('ascend_pending_profile');
      if (pending) {
        var profileData = null;
        try { profileData = JSON.parse(pending); } catch (e) { profileData = null; }
        if (profileData) {
          profileData.id = currentUser.id;
          profileData.email = currentUser.email || profileData.email;
          sb.from('hub_profiles').upsert(profileData, { onConflict: 'id' }).then(function(upsertRes) {
            localStorage.removeItem('ascend_pending_profile');
            if (upsertRes.error) {
              console.error('Profile upsert failed after Google signup:', upsertRes.error);
              // Couldn't save the profile, bounce them out and surface the issue.
              bounceUnregisteredUser();
              return;
            }
            // Cache full profile so Edit Profile renders correctly
            localStorage.setItem('ascend_profile_cache', JSON.stringify(profileData));
            localStorage.setItem('ascend_user_first', profileData.first_name);
            processPendingReferral();
            // Fire welcome email, fire-and-forget, identical to email signup path
            sendHubWelcomeEmail({
              email: profileData.email,
              first_name: profileData.first_name,
              last_name: profileData.last_name || '',
              role: profileData.role,
              parent_email: profileData.parent1_email || ''
            });
            checkProfileAndUpdateUI();
          });
          return;
        }
      }
      checkProfileAndUpdateUI();
    } else {
      updateNavForGuest();
    }
  });

  sb.auth.onAuthStateChange(function(event, session) {
    if (event === 'PASSWORD_RECOVERY') {
      // User clicked password reset email link. Show the set-new-password modal.
      recoveryInProgress = true;
      showSetNewPassword();
      return;
    }
    if (event === 'SIGNED_IN' && session) {
      // Skip if email login is handling this
      if (loginInProgress) return;
      // Skip if we're in a password-recovery flow. The recovery token creates
      // a session, but the user must set a new password before entering the app.
      if (recoveryInProgress) {
        currentUser = session.user;
        showSetNewPassword();
        return;
      }
      currentUser = session.user;
      // Telemetry: catches Google sign-in + persisted-session auto-login.
      // Email/password sign-in fires HubEvents.login() inline so it can
      // distinguish itself from a session-restore.
      try { window.HubEvents && window.HubEvents.login(session.user.id); } catch(e) {}
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
      closeAuthModal();
      document.body.classList.remove('auth-pending');
      document.body.classList.add('auth-ready');
      hydrateFromSupabase();
    } else {
      // No hub_profiles row: this user has an auth.users row (likely from a
      // Google sign-in attempt) but never went through the proper signup flow.
      // Bounce them out and tell them to create an account first.
      bounceUnregisteredUser();
    }
  });
}

// Sign out a user who's authenticated but has no hub_profiles row.
// Before signing out, calls hub-delete-orphan-auth to clean up the
// orphaned auth.users row Supabase created during the OAuth handshake,
// so the user can re-sign up cleanly with the same email.
// Reopens the auth modal with a clear error directing them to Create Account.
function bounceUnregisteredUser() {
  sb.auth.getSession().then(function(sessionRes) {
    var token = sessionRes && sessionRes.data && sessionRes.data.session
      ? sessionRes.data.session.access_token
      : null;

    var cleanup = token
      ? fetch('https://jbiqzdavkwioxhtwchiy.supabase.co/functions/v1/hub-delete-orphan-auth', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        }).catch(function() {})
      : Promise.resolve();

    cleanup.then(function() {
      // Sign out clears the cookie/session in this browser even if the
      // server-side auth row was deleted by the cleanup call above.
      return sb.auth.signOut().catch(function() {});
    }).then(function() {
      currentUser = null;
      localStorage.removeItem('ascend_user_first');
      localStorage.removeItem('ascend_profile_cache');
      document.body.classList.remove('auth-pending');
      document.body.classList.add('auth-ready');
      updateNavForGuest();
      showAuthModal();
      setTimeout(function() {
        showAuthError("We couldn't find an Ascend account for that email. Click \"Create Account\" above to sign up first.");
      }, 100);
    });
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
          '<button onclick="showInviteFriend()">Invite a Friend</button>' +
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
    pwInputWithToggle('authPassword', 'Password') +
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
var US_STATES = ['Alabama','Alaska','American Samoa','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Guam','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Northern Mariana Islands','Ohio','Oklahoma','Oregon','Pennsylvania','Puerto Rico','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','U.S. Virgin Islands','Utah','Vermont','Virginia','Washington','Washington, D.C.','West Virginia','Wisconsin','Wyoming','Outside U.S.'];
var GRADES = ['12th','11th','10th','9th','8th','7th','6th','5th','4th','Other'];

function stateOptions(selected, placeholder) {
  var ph = placeholder || 'Select state...';
  return '<option value="">' + ph + '</option>' + US_STATES.map(function(s) {
    return '<option value="' + s + '"' + (s === selected ? ' selected' : '') + '>' + s + '</option>';
  }).join('');
}
function gradeOptions(selected, placeholder) {
  var ph = placeholder || 'Select grade...';
  return '<option value="">' + ph + '</option>' + GRADES.map(function(g) {
    return '<option value="' + g + '"' + (g === selected ? ' selected' : '') + '>' + g + '</option>';
  }).join('');
}

// ─── REGISTRATION FORMS (form first, auth method last) ───
function showRoleForm(role) {
  var content = document.getElementById('authTabContent');
  if (role === 'student') content.innerHTML = getStudentForm();
  else if (role === 'parent') content.innerHTML = getParentForm();
  else if (role === 'educator') content.innerHTML = getEducatorForm();
}

// Reusable country code dropdown options.
function countryCodeOptions() {
  return '<option value="+1">+1 (US)</option><option value="+44">+44 (UK)</option><option value="+91">+91 (IN)</option><option value="+86">+86 (CN)</option><option value="+81">+81 (JP)</option><option value="+82">+82 (KR)</option><option value="+61">+61 (AU)</option><option value="+49">+49 (DE)</option><option value="+33">+33 (FR)</option><option value="+52">+52 (MX)</option><option value="+55">+55 (BR)</option>';
}

// Yes/No toggle component. Stores the value in a hidden input with the given id.
// "default" can be "yes" or "no" (defaults to "no" if omitted).
function yesNoToggle(id, question, defaultVal) {
  defaultVal = defaultVal === 'yes' ? 'yes' : 'no';
  return '<div class="auth-yesno-row">' +
    '<span class="auth-yesno-q">' + question + '</span>' +
    '<div class="auth-yesno-btns">' +
      '<button type="button" class="auth-yesno-btn' + (defaultVal === 'yes' ? ' active' : '') + '" onclick="setYesNo(\'' + id + '\',this,\'yes\')">Yes</button>' +
      '<button type="button" class="auth-yesno-btn' + (defaultVal === 'no' ? ' active' : '') + '" onclick="setYesNo(\'' + id + '\',this,\'no\')">No</button>' +
    '</div>' +
    '<input type="hidden" id="' + id + '" value="' + defaultVal + '">' +
  '</div>';
}

// Eye-icon SVGs for the password visibility toggle.
function eyeOpenSvg() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}
function eyeOffSvg() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
}

// Reusable password input + visibility toggle. Pass a placeholder and an id.
function pwInputWithToggle(id, placeholder) {
  return '<div class="auth-pw-row">' +
    '<input type="password" id="' + id + '" class="auth-input auth-pw-input" placeholder="' + placeholder + '">' +
    '<button type="button" class="auth-pw-toggle" tabindex="-1" aria-label="Show password" onclick="togglePasswordVisibility(\'' + id + '\',this)">' + eyeOpenSvg() + '</button>' +
  '</div>';
}

function togglePasswordVisibility(inputId, btn) {
  var input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = eyeOffSvg();
    btn.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    btn.innerHTML = eyeOpenSvg();
    btn.setAttribute('aria-label', 'Show password');
  }
}

// Toggle handler invoked by Yes/No buttons.
function setYesNo(inputId, btn, value) {
  var input = document.getElementById(inputId);
  if (input) input.value = value;
  var siblings = btn.parentElement.querySelectorAll('.auth-yesno-btn');
  for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('active');
  btn.classList.add('active');
}

function getStudentForm() {
  return '<div class="auth-form auth-reg-form">' +
    '<div class="auth-form-title">Student Registration</div>' +
    '<div class="auth-row">' +
      '<input type="text" id="regFirst" class="auth-input" placeholder="First name *" required>' +
      '<input type="text" id="regLast" class="auth-input" placeholder="Last name *" required>' +
    '</div>' +
    '<input type="email" id="regEmail" class="auth-input" placeholder="Email address *" required>' +
    '<div class="auth-phone-row"><select id="regCountryCode" class="auth-input auth-country-code">' + countryCodeOptions() + '</select><input type="tel" id="regPhone" class="auth-input" placeholder="555-123-4567 *" oninput="formatPhone(this)"></div>' +
    '<div class="auth-row">' +
      '<input type="text" id="regSchool" class="auth-input" placeholder="School *">' +
      '<select id="regState" class="auth-input">' + stateOptions(null, 'Select state... *') + '</select>' +
    '</div>' +
    '<select id="regGrade" class="auth-input">' + gradeOptions(null, 'Select grade... *') + '</select>' +
    yesNoToggle('regLeader', 'Are you a member of your team\'s leadership?', 'no') +
    '<div class="auth-section-label">Parent / Guardian</div>' +
    '<div class="auth-row">' +
      '<input type="text" id="regP1First" class="auth-input" placeholder="First name *">' +
      '<input type="text" id="regP1Last" class="auth-input" placeholder="Last name *">' +
    '</div>' +
    '<input type="email" id="regP1Email" class="auth-input" placeholder="Email *">' +
    '<div class="auth-phone-row"><select id="regP1CountryCode" class="auth-input auth-country-code">' + countryCodeOptions() + '</select><input type="tel" id="regP1Phone" class="auth-input" placeholder="555-123-4567 *" oninput="formatPhone(this)"></div>' +
    '<div id="parent2Section" class="hidden">' +
      '<div class="auth-section-label">Parent / Guardian 2</div>' +
      '<div class="auth-row">' +
        '<input type="text" id="regP2First" class="auth-input" placeholder="First name">' +
        '<input type="text" id="regP2Last" class="auth-input" placeholder="Last name">' +
      '</div>' +
      '<input type="email" id="regP2Email" class="auth-input" placeholder="Email">' +
      '<div class="auth-phone-row"><select id="regP2CountryCode" class="auth-input auth-country-code">' + countryCodeOptions() + '</select><input type="tel" id="regP2Phone" class="auth-input" placeholder="555-123-4567" oninput="formatPhone(this)"></div>' +
    '</div>' +
    '<button class="auth-link-btn" onclick="document.getElementById(\'parent2Section\').classList.toggle(\'hidden\')">+ Add second parent/guardian</button>' +
    yesNoToggle('regCamps', 'Interested in learning more about Ascend\'s summer camps?', 'no') +
    '<div class="auth-divider"><span>How would you like to sign in?</span></div>' +
    '<div class="auth-error hidden" id="authError"></div>' +
    '<button class="auth-google-btn" onclick="handleRoleGoogleSignup(\'student\')">' + googleSVG() + ' Sign up with Google</button>' +
    '<div style="text-align:center;font-size:12px;color:#999;margin:12px 0;">or</div>' +
    pwInputWithToggle('regPassword', 'Create password (min 6 characters) *') +
    pwInputWithToggle('regPasswordConfirm', 'Confirm password *') +
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
    '<div class="auth-phone-row"><select id="regCountryCode" class="auth-input auth-country-code">' + countryCodeOptions() + '</select><input type="tel" id="regPhone" class="auth-input" placeholder="555-123-4567 *" oninput="formatPhone(this)"></div>' +
    '<div class="auth-row">' +
      '<input type="text" id="regSchool" class="auth-input" placeholder="Student\'s school *">' +
      '<select id="regState" class="auth-input">' + stateOptions(null, 'Select state... *') + '</select>' +
    '</div>' +
    '<select id="regStudentGrade" class="auth-input">' + gradeOptions(null, 'Select student\'s current grade *') + '</select>' +
    yesNoToggle('regCamps', 'Interested in learning more about Ascend\'s summer camps?', 'no') +
    '<div class="auth-divider"><span>How would you like to sign in?</span></div>' +
    '<div class="auth-error hidden" id="authError"></div>' +
    '<button class="auth-google-btn" onclick="handleRoleGoogleSignup(\'parent\')">' + googleSVG() + ' Sign up with Google</button>' +
    '<div style="text-align:center;font-size:12px;color:#999;margin:12px 0;">or</div>' +
    pwInputWithToggle('regPassword', 'Create password (min 6 characters) *') +
    pwInputWithToggle('regPasswordConfirm', 'Confirm password *') +
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
    '<div class="auth-phone-row"><select id="regCountryCode" class="auth-input auth-country-code">' + countryCodeOptions() + '</select><input type="tel" id="regPhone" class="auth-input" placeholder="555-123-4567 *" oninput="formatPhone(this)"></div>' +
    '<div class="auth-row">' +
      '<input type="text" id="regSchool" class="auth-input" placeholder="School *">' +
      '<select id="regState" class="auth-input">' + stateOptions(null, 'Select state... *') + '</select>' +
    '</div>' +
    yesNoToggle('regSupport', 'Interested in exploring ways Ascend can support your team?', 'no') +
    '<div class="auth-divider"><span>How would you like to sign in?</span></div>' +
    '<div class="auth-error hidden" id="authError"></div>' +
    '<button class="auth-google-btn" onclick="handleRoleGoogleSignup(\'educator\')">' + googleSVG() + ' Sign up with Google</button>' +
    '<div style="text-align:center;font-size:12px;color:#999;margin:12px 0;">or</div>' +
    pwInputWithToggle('regPassword', 'Create password (min 6 characters) *') +
    pwInputWithToggle('regPasswordConfirm', 'Confirm password *') +
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

function validatePhone(phone, optional) {
  if (!phone) return optional ? true : false;
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
  if (!validatePhone(phone, false)) { showAuthError('Please enter a valid 10-digit phone number.'); return null; }
  if (!validateEmail(p1email)) { showAuthError('Please enter a valid email for Parent/Guardian.'); return null; }
  if (!validatePhone(p1phone, false)) { showAuthError('Please enter a valid phone for Parent/Guardian.'); return null; }

  var p2email = document.getElementById('regP2Email') ? document.getElementById('regP2Email').value.trim() : '';
  if (p2email && !validateEmail(p2email)) { showAuthError('Please enter a valid email for Parent/Guardian 2.'); return null; }

  var p2phone = document.getElementById('regP2Phone') ? document.getElementById('regP2Phone').value.trim() : '';
  var p2cc = document.getElementById('regP2CountryCode') ? document.getElementById('regP2CountryCode').value : '';
  return {
    role: 'student',
    first_name: first, last_name: last, email: email,
    phone: (document.getElementById('regCountryCode').value + ' ' + phone),
    school: school,
    state: stateVal,
    grade: grade,
    is_team_leader: document.getElementById('regLeader').value === 'yes',
    parent1_first: document.getElementById('regP1First').value.trim(),
    parent1_last: document.getElementById('regP1Last').value.trim(),
    parent1_email: p1email,
    parent1_phone: (document.getElementById('regP1CountryCode').value + ' ' + p1phone),
    parent2_first: document.getElementById('regP2First') ? document.getElementById('regP2First').value.trim() : null,
    parent2_last: document.getElementById('regP2Last') ? document.getElementById('regP2Last').value.trim() : null,
    parent2_email: p2email || null,
    parent2_phone: p2phone ? (p2cc + ' ' + p2phone) : null,
    interested_camps: document.getElementById('regCamps').value === 'yes'
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
  if (!validatePhone(phone, false)) { showAuthError('Please enter a valid 10-digit phone number.'); return null; }

  return {
    role: 'parent',
    first_name: first, last_name: last, email: email,
    phone: (document.getElementById('regCountryCode').value + ' ' + phone),
    school: school,
    state: stateVal,
    student_grade: document.getElementById('regStudentGrade').value,
    student_school: document.getElementById('regSchool').value.trim(),
    interested_camps: document.getElementById('regCamps').value === 'yes'
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
  if (!validatePhone(phone, false)) { showAuthError('Please enter a valid 10-digit phone number.'); return null; }

  return {
    role: 'educator',
    first_name: first, last_name: last, email: email,
    phone: (document.getElementById('regCountryCode').value + ' ' + phone),
    school: school,
    state: stateVal,
    interested_ascend_support: document.getElementById('regSupport').value === 'yes'
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
      el.innerHTML = 'Reset link sent! Check your email inbox.<br><span style="font-size:12px;opacity:0.85;">Don\'t see it after a few minutes? You may not have an account yet, try creating one instead.</span>';
      el.classList.remove('hidden');
    }
  }).catch(function() {
    showAuthError('We couldn\'t reach the server. Please check your connection and try again.');
  });
}

// Triggered automatically when user lands on the page via a password-reset email link.
function showSetNewPassword() {
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
      '<div class="auth-title">Set a New Password</div>' +
      '<div class="auth-subtitle">Choose a password you\'ll remember.</div>' +
    '</div>' +
    '<div id="authTabContent">' +
      '<div class="auth-form">' +
        pwInputWithToggle('newPw1', 'New password (min 6 characters)') +
        pwInputWithToggle('newPw2', 'Confirm new password') +
        '<div class="auth-error hidden" id="authError"></div>' +
        '<div class="auth-success hidden" id="authSuccess"></div>' +
        '<button class="auth-submit-btn" onclick="handleSetNewPassword()">Update Password</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  overlay.classList.add('open');
}

function handleSetNewPassword() {
  clearAuthError();
  var pw1 = document.getElementById('newPw1').value;
  var pw2 = document.getElementById('newPw2').value;
  if (!pw1 || pw1.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  if (pw1 !== pw2) { showAuthError('Passwords don\'t match.'); return; }

  sb.auth.updateUser({ password: pw1 }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    var el = document.getElementById('authSuccess');
    if (el) {
      el.textContent = 'Password updated. You\'re signed in.';
      el.classList.remove('hidden');
    }
    // Recovery flow is complete. Clear the flag so the rest of the app
    // treats the existing session as a normal signed-in user.
    recoveryInProgress = false;
    setTimeout(function() {
      closeAuthModal();
      // Strip the recovery token from the URL so refresh doesn't re-trigger PASSWORD_RECOVERY.
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      // Now that the password is set, finish the normal signed-in UI update.
      if (currentUser) checkProfileAndUpdateUI();
    }, 1500);
  }).catch(function() {
    showAuthError('We couldn\'t reach the server. Please check your connection and try again.');
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
    if (res.error) {
      loginInProgress = false;
      try { window.HubEvents && window.HubEvents.loginFailed({ method: 'password', reason: String(res.error.message || '').slice(0, 200) }); } catch(e) {}
      showAuthError(res.error.message);
      return;
    }
    currentUser = res.data.user;
    try { window.HubEvents && window.HubEvents.login(currentUser.id); } catch(e) {}
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
  }).catch(function() {
    loginInProgress = false;
    var errEl = document.getElementById('authError');
    if (errEl && errEl.classList.contains('hidden')) {
      showAuthError('We couldn\'t reach the server. Please check your connection and try again.');
    }
  });
}

// Fire-and-forget welcome email via Supabase edge function. Failure must not block signup UX.
function sendHubWelcomeEmail(payload) {
  try {
    fetch('https://jbiqzdavkwioxhtwchiy.supabase.co/functions/v1/hub-welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function() {});
  } catch (e) {}
}

function handleStudentSignup() {
  clearAuthError();
  var data = collectStudentData();
  if (!data) return;

  var password = document.getElementById('regPassword').value;
  var passwordConfirm = document.getElementById('regPasswordConfirm') ? document.getElementById('regPasswordConfirm').value : password;
  if (!password || password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  if (password !== passwordConfirm) { showAuthError('Passwords don\'t match. Please re-type to confirm.'); return; }

  // Cache name immediately so nav updates instantly after signup
  localStorage.setItem('ascend_user_first', data.first_name);

  sb.auth.signUp({ email: data.email, password: password, options: { data: { first_name: data.first_name } } }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return Promise.reject(); }
    currentUser = res.data.user;
    data.id = currentUser.id;
    return sb.from('hub_profiles').insert(data);
  }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    // Cache the full profile so Edit Profile renders instantly after signup
    localStorage.setItem('ascend_profile_cache', JSON.stringify(data));
    processPendingReferral();
    sendHubWelcomeEmail({
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name || '',
      role: 'student',
      parent_email: data.parent1_email || ''
    });
    showAccountCreated(data.first_name);
    checkProfileAndUpdateUI();
  }).catch(function() {
    var errEl = document.getElementById('authError');
    // Only show the generic network error if no specific error is already showing.
    if (errEl && errEl.classList.contains('hidden')) {
      showAuthError('We couldn\'t reach the server. Please check your connection and try again.');
    }
  });
}

function handleParentSignup() {
  clearAuthError();
  var data = collectParentData();
  if (!data) return;

  var password = document.getElementById('regPassword').value;
  var passwordConfirm = document.getElementById('regPasswordConfirm') ? document.getElementById('regPasswordConfirm').value : password;
  if (!password || password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  if (password !== passwordConfirm) { showAuthError('Passwords don\'t match. Please re-type to confirm.'); return; }

  localStorage.setItem('ascend_user_first', data.first_name);

  sb.auth.signUp({ email: data.email, password: password, options: { data: { first_name: data.first_name } } }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return Promise.reject(); }
    currentUser = res.data.user;
    data.id = currentUser.id;
    return sb.from('hub_profiles').insert(data);
  }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    // Cache the full profile so Edit Profile renders instantly after signup
    localStorage.setItem('ascend_profile_cache', JSON.stringify(data));
    processPendingReferral();
    sendHubWelcomeEmail({ email: data.email, first_name: data.first_name, last_name: data.last_name || '', role: data.role });
    showAccountCreated(data.first_name);
    checkProfileAndUpdateUI();
  }).catch(function() {
    var errEl = document.getElementById('authError');
    // Only show the generic network error if no specific error is already showing.
    if (errEl && errEl.classList.contains('hidden')) {
      showAuthError('We couldn\'t reach the server. Please check your connection and try again.');
    }
  });
}

function handleEducatorSignup() {
  clearAuthError();
  var data = collectEducatorData();
  if (!data) return;

  var password = document.getElementById('regPassword').value;
  var passwordConfirm = document.getElementById('regPasswordConfirm') ? document.getElementById('regPasswordConfirm').value : password;
  if (!password || password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  if (password !== passwordConfirm) { showAuthError('Passwords don\'t match. Please re-type to confirm.'); return; }

  localStorage.setItem('ascend_user_first', data.first_name);

  sb.auth.signUp({ email: data.email, password: password, options: { data: { first_name: data.first_name } } }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return Promise.reject(); }
    currentUser = res.data.user;
    data.id = currentUser.id;
    return sb.from('hub_profiles').insert(data);
  }).then(function(res) {
    if (res.error) { showAuthError(res.error.message); return; }
    // Cache the full profile so Edit Profile renders instantly after signup
    localStorage.setItem('ascend_profile_cache', JSON.stringify(data));
    processPendingReferral();
    sendHubWelcomeEmail({ email: data.email, first_name: data.first_name, last_name: data.last_name || '', role: data.role });
    showAccountCreated(data.first_name);
    checkProfileAndUpdateUI();
  }).catch(function() {
    var errEl = document.getElementById('authError');
    // Only show the generic network error if no specific error is already showing.
    if (errEl && errEl.classList.contains('hidden')) {
      showAuthError('We couldn\'t reach the server. Please check your connection and try again.');
    }
  });
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
    // Lazy-award the Squad badge to anyone whose referred friend has now signed up.
    maybeAwardReferrerSquadBadge();
  });
}

function syncCompletionToSupabase(moduleId) {
  if (!currentUser) return;
  sb.from('hub_progress').upsert({
    user_id: currentUser.id,
    module_id: moduleId
  }, { onConflict: 'user_id,module_id' }).then(function(res) {
    if (res && res.error) console.warn('completion sync failed:', res.error.message);
  });
}

function syncBadgeToSupabase(badgeId) {
  if (!currentUser) return;
  sb.from('hub_badges').upsert({
    user_id: currentUser.id,
    badge_id: badgeId
  }, { onConflict: 'user_id,badge_id' }).then(function(res) {
    if (res && res.error) console.warn('badge sync failed:', res.error.message);
  });
}

// Logged once per time the user opens a module page (every visit, no upsert).
// Lets us measure abandonment (started but never completed) and session count.
function syncModuleStartToSupabase(moduleId) {
  if (!currentUser) return;
  sb.from('hub_module_starts').insert({
    user_id: currentUser.id,
    module_id: moduleId
  }).then(function(res) {
    if (res && res.error) console.warn('module-start sync failed:', res.error.message);
  });
}

// Records a referral (referrer -> new user) if a ?ref=<uuid> param was
// captured on the page that initiated this signup. Awards the Squad badge
// to the new user immediately. The referrer earns Squad on their next hub
// load via maybeAwardReferrerSquadBadge() below.
function processPendingReferral() {
  if (!currentUser) return;
  var refId = '';
  try { refId = localStorage.getItem('ascend_referrer') || ''; } catch (e) {}
  if (!refId || refId === currentUser.id) {
    localStorage.removeItem('ascend_referrer');
    return;
  }
  sb.from('hub_referrals').insert({
    referrer_id: refId,
    referred_id: currentUser.id
  }).then(function(res) {
    if (res && res.error) {
      console.warn('Referral insert failed:', res.error.message);
      return;
    }
    localStorage.removeItem('ascend_referrer');
    if (typeof awardBadge === 'function') awardBadge('squad');
  });
}

// On hub load, if the user has at least one referral but doesn't yet have
// the Squad badge, award it. Lets the referrer earn the badge whenever
// their referred friend signs up.
function maybeAwardReferrerSquadBadge() {
  if (!currentUser || typeof state === 'undefined') return;
  if (state.badges && state.badges.indexOf('squad') !== -1) return;
  sb.from('hub_referrals').select('id').eq('referrer_id', currentUser.id).limit(1).then(function(res) {
    if (res && res.data && res.data.length > 0) {
      if (typeof awardBadge === 'function') awardBadge('squad');
    }
  });
}

// Logged once per quiz answer attempt. Lets us identify problem questions
// and per-question success rates.
function syncQuizAttemptToSupabase(moduleId, questionId, wasCorrect) {
  if (!currentUser) return;
  sb.from('hub_quiz_attempts').insert({
    user_id: currentUser.id,
    module_id: moduleId,
    question_id: questionId,
    was_correct: !!wasCorrect
  }).then(function(res) {
    if (res && res.error) console.warn('quiz-attempt sync failed:', res.error.message);
  });
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

// Invite-a-friend modal: shows the user's personal referral URL and a row
// of pre-filled share buttons. When the friend signs up, both users earn
// the Squad badge.
function showInviteFriend() {
  toggleUserMenu();
  if (!currentUser) { showAuthModal(); return; }
  var overlay = document.getElementById('authOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.className = 'auth-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeAuthModal(); };
    document.body.appendChild(overlay);
  }
  var refUrl = 'https://learn.ascendacademy.org/?ref=' + currentUser.id;
  var msg = 'Join me on Ascend Academy. Free Congressional Debate training and we both get a special badge when you sign up using my link:';
  var encodedFull = encodeURIComponent(msg + ' ' + refUrl);
  var encodedText = encodeURIComponent(msg);
  var encodedUrl = encodeURIComponent(refUrl);

  overlay.innerHTML = '<div class="auth-panel">' +
    '<button class="auth-close" onclick="closeAuthModal()">&times;</button>' +
    '<div class="auth-header">' +
      '<div class="auth-title">Invite a Friend</div>' +
      '<div class="auth-subtitle">When they sign up, you both earn the &#129309; Squad badge.</div>' +
    '</div>' +
    '<div style="padding:8px 32px 32px;">' +
      '<label style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:#999;display:block;margin-bottom:8px;">Your invite link</label>' +
      '<div style="display:flex;gap:8px;margin-bottom:20px;">' +
        '<input type="text" id="inviteLink" class="auth-input" readonly value="' + refUrl + '" onclick="this.select()" style="flex:1;font-size:13px;">' +
        '<button class="auth-submit-btn" type="button" style="padding:10px 16px;flex-shrink:0;width:auto;" onclick="copyInviteLink(this)">Copy</button>' +
      '</div>' +
      '<label style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:#999;display:block;margin-bottom:10px;">Share via</label>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;">' +
        '<a class="share-btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodedFull + '">WhatsApp</a>' +
        '<a class="share-btn" href="sms:&body=' + encodedFull + '">iMessage</a>' +
        '<a class="share-btn" target="_blank" rel="noopener" href="mailto:?subject=Try Ascend Academy with me&body=' + encodedFull + '">Email</a>' +
      '</div>' +
    '</div>' +
  '</div>';
  overlay.classList.add('open');
}

function copyInviteLink(btn) {
  var input = document.getElementById('inviteLink');
  if (!input) return;
  var orig = btn.textContent;
  function ok() { btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = orig; }, 1500); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(input.value).then(ok);
  } else {
    input.select();
    try { document.execCommand('copy'); ok(); } catch (e) {}
  }
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

  if (tab === 'profile') {
    // Profile form needs the full hub_profiles row. If cache is empty
    // (which happens after a fresh signup), fetch from DB before rendering.
    var cached = localStorage.getItem('ascend_profile_cache');
    if (!cached && currentUser) {
      overlay.innerHTML = '<div class="auth-panel">' +
        '<div class="auth-header"><div class="auth-title">Edit Profile</div><div class="auth-subtitle">Loading your information&hellip;</div></div>' +
        '<div style="padding: 16px 32px 32px;">' +
          '<div style="display:flex;gap:12px;margin-bottom:12px;"><span class="skeleton" style="height:46px;flex:1;border-radius:10px;"></span><span class="skeleton" style="height:46px;flex:1;border-radius:10px;"></span></div>' +
          '<span class="skeleton" style="height:46px;width:100%;border-radius:10px;display:block;margin-bottom:12px;"></span>' +
          '<div style="display:flex;gap:12px;margin-bottom:12px;"><span class="skeleton" style="height:46px;flex:1;border-radius:10px;"></span><span class="skeleton" style="height:46px;flex:1;border-radius:10px;"></span></div>' +
          '<span class="skeleton" style="height:46px;width:100%;border-radius:10px;display:block;margin-bottom:16px;"></span>' +
          '<span class="skeleton" style="height:46px;width:100%;border-radius:10px;display:block;"></span>' +
        '</div>' +
      '</div>';
      overlay.classList.add('open');
      sb.from('hub_profiles').select('*').eq('id', currentUser.id).maybeSingle().then(function(res) {
        if (res.data) {
          localStorage.setItem('ascend_profile_cache', JSON.stringify(res.data));
        }
        overlay.innerHTML = getEditProfileHTML();
      });
      return;
    }
    overlay.innerHTML = getEditProfileHTML();
  } else if (tab === 'password') overlay.innerHTML = getChangePasswordHTML();
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
        '<select id="editState" class="auth-input">' + stateOptions(p.state) + '</select>' +
      '</div>' +
      (p.role === 'student' ? '<select id="editGrade" class="auth-input">' + gradeOptions(p.grade) + '</select>' +
        yesNoToggle('editLeader', 'Are you a member of your team\'s leadership?', p.is_team_leader ? 'yes' : 'no') +
        '<div class="auth-section-label">Parent / Guardian 1</div>' +
        '<div class="auth-row">' +
          '<input type="text" id="editP1First" class="auth-input" placeholder="First name" value="' + (p.parent1_first || '') + '">' +
          '<input type="text" id="editP1Last" class="auth-input" placeholder="Last name" value="' + (p.parent1_last || '') + '">' +
        '</div>' +
        '<div class="auth-row">' +
          '<input type="email" id="editP1Email" class="auth-input" placeholder="Email" value="' + (p.parent1_email || '') + '">' +
          '<input type="tel" id="editP1Phone" class="auth-input" placeholder="Phone" value="' + (p.parent1_phone || '') + '">' +
        '</div>' +
        yesNoToggle('editCamps', 'Interested in Ascend summer camps?', p.interested_camps ? 'yes' : 'no')
      : '') +
      (p.role === 'parent' ? '<select id="editStudentGrade" class="auth-input">' + gradeOptions(p.student_grade, 'Select student\'s current grade') + '</select>' +
        yesNoToggle('editCamps', 'Interested in Ascend summer camps?', p.interested_camps ? 'yes' : 'no')
      : '') +
      (p.role === 'educator' ?
        yesNoToggle('editSupport', 'Interested in Ascend team support?', p.interested_ascend_support ? 'yes' : 'no')
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
  if (document.getElementById('editLeader')) updates.is_team_leader = document.getElementById('editLeader').value === 'yes';
  if (document.getElementById('editP1First')) {
    updates.parent1_first = document.getElementById('editP1First').value.trim();
    updates.parent1_last = document.getElementById('editP1Last').value.trim();
    updates.parent1_email = document.getElementById('editP1Email').value.trim();
    updates.parent1_phone = document.getElementById('editP1Phone').value.trim();
  }
  // Camp interest
  if (document.getElementById('editCamps')) updates.interested_camps = document.getElementById('editCamps').value === 'yes';
  // Parent student grade
  if (document.getElementById('editStudentGrade')) updates.student_grade = document.getElementById('editStudentGrade').value;
  // Educator support
  if (document.getElementById('editSupport')) updates.interested_ascend_support = document.getElementById('editSupport').value === 'yes';

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
  if (!currentUser || !currentUser.id) {
    showAuthError('Not signed in. Please sign in again and try.');
    return;
  }
  Promise.all([
    sb.from('hub_progress').delete().eq('user_id', currentUser.id),
    sb.from('hub_badges').delete().eq('user_id', currentUser.id),
    sb.from('hub_module_starts').delete().eq('user_id', currentUser.id),
    sb.from('hub_quiz_attempts').delete().eq('user_id', currentUser.id)
  ]).then(function(results) {
    var err = results[0].error || results[1].error || results[2].error || results[3].error;
    if (err) {
      console.error('Reset progress failed:', err);
      showAuthError('Failed to reset: ' + (err.message || err.code || 'unknown error'));
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
  }).catch(function(err) {
    console.error('Reset progress threw:', err);
    showAuthError('Failed to reset: ' + (err && err.message ? err.message : 'network error'));
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
