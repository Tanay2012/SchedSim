/**
 * SchedSim Lens - Login / Sign-up Page Controller
 */

import { auth } from './auth.js';
import { MascotController } from './mascot.js';

class LoginPage {
  constructor() {
    this.currentTab = 'login'; // 'login' | 'signup'
    this.mascotController = new MascotController({ containerId: 'mascot-widget' });
  }

  init() {
    // 1. Theme sync
    this.initTheme();

    // 2. If already logged in, redirect to app
    if (auth.isAuthenticated()) {
      auth.redirectIfAuthenticated('app.html');
      return;
    }

    // 3. Render mascot avatar in card header
    this.renderCardMascot();

    // 4. Attach event listeners
    this.attachEvents();

    // 5. Check URL params for tab or redirect notice
    this.checkUrlParams();

    console.log('Login / Sign-up page ready.');
  }

  initTheme() {
    let savedTheme = 'graphite';
    try {
      savedTheme = localStorage.getItem('schedsim_theme') || 'graphite';
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeButtonLabel(savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'graphite';
    const next = current === 'graphite' ? 'paper' : 'graphite';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('schedsim_theme', next);
    } catch (e) {}
    this.updateThemeButtonLabel(next);
  }

  updateThemeButtonLabel(theme) {
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      const isDark = theme === 'graphite';
      btn.innerHTML = `
        <span class="theme-toggle-icon" aria-hidden="true">${isDark ? '🌙' : '☀️'}</span>
        <span class="theme-toggle-text">${isDark ? 'Graphite' : 'Paper'}</span>
      `;
      btn.setAttribute('aria-label', isDark ? 'Switch to Light mode (Paper)' : 'Switch to Dark mode (Graphite)');
      btn.title = isDark ? 'Switch to Light mode (Paper)' : 'Switch to Dark mode (Graphite)';
    }
  }

  renderCardMascot() {
    const avatarEl = document.getElementById('auth-mascot-avatar');
    if (avatarEl) {
      avatarEl.innerHTML = this.mascotController.getBirdSvg(this.currentTab === 'login' ? 'wave' : 'book');
    }
    this.updateMascotMessage();
  }

  updateMascotMessage() {
    const speakerEl = document.getElementById('auth-mascot-speaker');
    const textEl = document.getElementById('auth-mascot-msg');
    const avatarEl = document.getElementById('auth-mascot-avatar');

    if (this.currentTab === 'login') {
      if (speakerEl) speakerEl.textContent = 'Prof. Pip · Welcome Back';
      if (textEl) textEl.textContent = 'Ready to inspect your schedules? Log in to resume your simulations.';
      if (avatarEl) avatarEl.innerHTML = this.mascotController.getBirdSvg('wave');
    } else {
      if (speakerEl) speakerEl.textContent = 'Prof. Pip · New Student';
      if (textEl) textEl.textContent = 'Create your free account to analyze deadlocks, race conditions, and lock traces!';
      if (avatarEl) avatarEl.innerHTML = this.mascotController.getBirdSvg('book');
    }
  }

  attachEvents() {
    // Theme toggle
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => this.toggleTheme());

    // Tab buttons
    document.getElementById('tab-btn-login')?.addEventListener('click', () => this.switchTab('login'));
    document.getElementById('tab-btn-signup')?.addEventListener('click', () => this.switchTab('signup'));

    // Switch links at bottom of forms
    document.getElementById('link-to-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchTab('signup');
    });
    document.getElementById('link-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchTab('login');
    });

    // Password visibility toggles
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          e.currentTarget.textContent = isPassword ? 'HIDE' : 'SHOW';
        }
      });
    });

    // Forgot password handler
    document.getElementById('link-forgot-pwd')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('login-email');
      const email = emailInput?.value?.trim();
      if (!email || !auth.isValidEmail(email)) {
        this.showBanner('Please enter your valid email address in the field above first.', 'warning');
        emailInput?.focus();
        return;
      }
      try {
        const res = await auth.resetPassword({ email });
        this.showBanner(res.message, 'success');
      } catch (err) {
        this.showBanner(err.message, 'warning');
      }
    });

    // Login form submit
    document.getElementById('form-login')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLoginSubmit();
    });

    // Signup form submit
    document.getElementById('form-signup')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSignupSubmit();
    });

    // Real-time inline field validations
    this.setupInlineValidation();
  }

  switchTab(tab) {
    this.currentTab = tab;
    this.hideBanner();

    document.getElementById('tab-btn-login')?.classList.toggle('active', tab === 'login');
    document.getElementById('tab-btn-signup')?.classList.toggle('active', tab === 'signup');

    document.getElementById('form-login')?.classList.toggle('active', tab === 'login');
    document.getElementById('form-signup')?.classList.toggle('active', tab === 'signup');

    this.updateMascotMessage();
  }

  setupInlineValidation() {
    const loginEmail = document.getElementById('login-email');
    const signupEmail = document.getElementById('signup-email');
    const signupPwd = document.getElementById('signup-password');
    const signupConfirm = document.getElementById('signup-confirm-password');

    signupEmail?.addEventListener('input', () => {
      const errEl = document.getElementById('signup-email-error');
      if (signupEmail.value && !auth.isValidEmail(signupEmail.value)) {
        if (errEl) errEl.textContent = 'Please enter a valid email format (e.g. name@domain.com)';
      } else {
        if (errEl) errEl.textContent = '';
      }
    });

    signupPwd?.addEventListener('input', () => {
      const errEl = document.getElementById('signup-pwd-error');
      if (signupPwd.value && signupPwd.value.length < 8) {
        if (errEl) errEl.textContent = `Password needs ${8 - signupPwd.value.length} more characters (min 8)`;
      } else {
        if (errEl) errEl.textContent = '';
      }
    });

    signupConfirm?.addEventListener('input', () => {
      const errEl = document.getElementById('signup-confirm-error');
      if (signupConfirm.value && signupConfirm.value !== signupPwd.value) {
        if (errEl) errEl.textContent = 'Passwords do not match.';
      } else {
        if (errEl) errEl.textContent = '';
      }
    });
  }

  async handleLoginSubmit() {
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    const btnSubmit = document.getElementById('btn-login-submit');

    this.hideBanner();

    if (!email || !auth.isValidEmail(email)) {
      this.showBanner('Please provide a valid email address.', 'warning');
      return;
    }
    if (!password) {
      this.showBanner('Please enter your password.', 'warning');
      return;
    }

    this.setButtonLoading(btnSubmit, true, 'Logging In...');

    try {
      await auth.login({ email, password });
      this.showBanner('Login successful! Redirecting to SchedSim Lens...', 'success');
      
      setTimeout(() => {
        auth.redirectIfAuthenticated('app.html');
      }, 500);
    } catch (err) {
      this.setButtonLoading(btnSubmit, false, 'Log In');
      this.showBanner(err.message || 'Login failed. Please try again.', 'warning');
    }
  }

  async handleSignupSubmit() {
    const name = document.getElementById('signup-name')?.value?.trim();
    const email = document.getElementById('signup-email')?.value?.trim();
    const password = document.getElementById('signup-password')?.value;
    const confirmPassword = document.getElementById('signup-confirm-password')?.value;
    const btnSubmit = document.getElementById('btn-signup-submit');

    this.hideBanner();

    if (!email || !auth.isValidEmail(email)) {
      this.showBanner('Please enter a valid email address.', 'warning');
      return;
    }
    if (!password || password.length < 8) {
      this.showBanner('Password must contain at least 8 characters.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      this.showBanner('Passwords do not match. Please re-enter.', 'warning');
      return;
    }

    this.setButtonLoading(btnSubmit, true, 'Creating Account...');

    try {
      await auth.signup({ name, email, password, confirmPassword });
      this.showBanner('Account created! Welcome to SchedSim Lens.', 'success');
      
      setTimeout(() => {
        auth.redirectIfAuthenticated('app.html');
      }, 500);
    } catch (err) {
      this.setButtonLoading(btnSubmit, false, 'Create Account');
      this.showBanner(err.message || 'Sign up failed.', 'warning');
    }
  }

  setButtonLoading(button, isLoading, text) {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
      button.innerHTML = `<span class="btn-loading-spinner"></span> ${text}`;
    } else {
      button.textContent = text;
    }
  }

  showBanner(msg, type = 'warning') {
    const banner = document.getElementById('auth-banner');
    if (banner) {
      banner.textContent = msg;
      banner.className = `auth-banner-notice ${type}`;
    }
  }

  hideBanner() {
    const banner = document.getElementById('auth-banner');
    if (banner) {
      banner.className = 'auth-banner-notice';
      banner.textContent = '';
    }
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'signup') {
      this.switchTab('signup');
    }
    if (params.get('notice') === 'login_required') {
      this.showBanner('Please log in to access the concurrency analyzer workspace.', 'warning');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = new LoginPage();
  page.init();
});
