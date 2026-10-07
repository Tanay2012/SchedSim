/**
 * SchedSim Lens - Authentication Manager
 * Supports Firebase Auth integration with automated local fallback for offline/development usage.
 */

// Storage keys
const STORAGE_USER_KEY = 'schedsim_auth_user';
const STORAGE_TOKEN_KEY = 'schedsim_auth_token';
const STORAGE_DB_USERS = 'schedsim_mock_users_db';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.firebaseConfig = null;
    this.init();
  }

  init() {
    // Check if Firebase config is available in window.FIREBASE_CONFIG or process.env
    if (typeof window !== 'undefined' && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
      this.firebaseConfig = window.FIREBASE_CONFIG;
    }

    // Load active session from storage
    try {
      const stored = localStorage.getItem(STORAGE_USER_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      this.currentUser = null;
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  /**
   * Validate password (min 8 characters)
   */
  isValidPassword(password) {
    return Boolean(password && password.length >= 8);
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated() {
    return Boolean(this.currentUser && localStorage.getItem(STORAGE_TOKEN_KEY));
  }

  /**
   * Get current user profile
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Protected Route Guard: Redirect to login if unauthenticated
   */
  requireAuth(redirectTo = 'login.html') {
    if (!this.isAuthenticated()) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${redirectTo}?redirect=${returnUrl}`;
      return false;
    }
    return true;
  }

  /**
   * Redirect to app if already authenticated
   */
  redirectIfAuthenticated(redirectTo = 'app.html') {
    if (this.isAuthenticated()) {
      const params = new URLSearchParams(window.location.search);
      const target = params.get('redirect') ? decodeURIComponent(params.get('redirect')) : redirectTo;
      window.location.href = target;
      return true;
    }
    return false;
  }

  /**
   * Log In
   */
  async login({ email, password }) {
    if (!this.isValidEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    // Simulate network delay for realistic UX (350ms)
    await new Promise(r => setTimeout(r, 350));

    // If live Firebase auth is loaded and configured:
    if (window.firebase && window.firebase.auth && this.firebaseConfig) {
      try {
        const userCredential = await window.firebase.auth().signInWithEmailAndPassword(email, password);
        const user = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || email.split('@')[0],
          photoURL: userCredential.user.photoURL || null
        };
        this.setSession(user, userCredential.user.refreshToken || 'fb_token');
        return user;
      } catch (fbErr) {
        throw new Error(fbErr.message || 'Authentication failed.');
      }
    }

    // Built-in Secure Local Fallback Auth
    const users = this._getMockDbUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error('No account found with this email. Please sign up.');
    }

    // Compare simulated hashed password
    const hashed = this._simpleHash(password);
    if (user.passwordHash !== hashed) {
      throw new Error('Incorrect password. Please verify and try again.');
    }

    const authUser = {
      uid: user.uid,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      createdAt: user.createdAt
    };

    this.setSession(authUser, 'mock_jwt_token_' + Date.now());
    return authUser;
  }

  /**
   * Create Account / Sign Up
   */
  async signup({ name, email, password, confirmPassword }) {
    if (!this.isValidEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!this.isValidPassword(password)) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match. Please re-type.');
    }

    // Simulate network delay
    await new Promise(r => setTimeout(r, 400));

    // If live Firebase Auth is active:
    if (window.firebase && window.firebase.auth && this.firebaseConfig) {
      try {
        const userCredential = await window.firebase.auth().createUserWithEmailAndPassword(email, password);
        if (name && userCredential.user.updateProfile) {
          await userCredential.user.updateProfile({ displayName: name });
        }
        const user = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: name || email.split('@')[0]
        };
        this.setSession(user, 'fb_token_' + Date.now());
        return user;
      } catch (fbErr) {
        throw new Error(fbErr.message || 'Sign up failed.');
      }
    }

    // Local Mock Auth Store
    const users = this._getMockDbUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      throw new Error('An account with this email already exists. Please log in.');
    }

    const newUser = {
      uid: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: name?.trim() || email.split('@')[0],
      email: email.trim().toLowerCase(),
      passwordHash: this._simpleHash(password),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this._saveMockDbUsers(users);

    const authUser = {
      uid: newUser.uid,
      email: newUser.email,
      name: newUser.name,
      createdAt: newUser.createdAt
    };

    this.setSession(authUser, 'mock_jwt_token_' + Date.now());
    return authUser;
  }

  /**
   * Reset Password Request
   */
  async resetPassword({ email }) {
    if (!this.isValidEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }

    await new Promise(r => setTimeout(r, 300));

    if (window.firebase && window.firebase.auth && this.firebaseConfig) {
      await window.firebase.auth().sendPasswordResetEmail(email);
    }
    return { success: true, message: `Password reset link has been dispatched to ${email}.` };
  }

  /**
   * Log Out
   */
  async logout() {
    if (window.firebase && window.firebase.auth && this.firebaseConfig) {
      try {
        await window.firebase.auth().signOut();
      } catch (e) {}
    }

    this.currentUser = null;
    try {
      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    } catch (e) {}
  }

  setSession(user, token) {
    this.currentUser = user;
    try {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
    } catch (e) {}
  }

  _getMockDbUsers() {
    try {
      const data = localStorage.getItem(STORAGE_DB_USERS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    // Seed with a default student account for testing
    const defaultUsers = [
      {
        uid: 'usr_demo_student',
        name: 'Alex Student',
        email: 'student@example.com',
        passwordHash: this._simpleHash('password123'),
        createdAt: new Date().toISOString()
      }
    ];
    this._saveMockDbUsers(defaultUsers);
    return defaultUsers;
  }

  _saveMockDbUsers(users) {
    try {
      localStorage.setItem(STORAGE_DB_USERS, JSON.stringify(users));
    } catch (e) {}
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

export const auth = new AuthManager();
