/**
 * SchedSim Lens - Overview (Landing) Page Controller
 */

import { MascotController, MASCOT_MESSAGES } from './mascot.js';
import { auth } from './auth.js';
import { aiAgent } from './ai-agent.js';

class OverviewPage {
  constructor() {
    this.mascot = null;
  }

  init() {
    // 1. Theme initialization
    this.initTheme();

    // 2. Auth state reflection in navbar
    this.updateNavAuthState();

    // 3. Mascot initialization
    this.mascot = new MascotController({
      messages: MASCOT_MESSAGES
    });

    // 4. Scroll-spy for sticky navbar
    this.initScrollSpy();

    // 5. Scroll reveal animations
    this.initScrollReveal();

    // 6. Theme toggle handler
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // 7. AI Tutor triggers
    document.getElementById('btn-nav-ask-ai')?.addEventListener('click', () => {
      aiAgent.open();
    });
    document.getElementById('hero-btn-ask-ai')?.addEventListener('click', () => {
      aiAgent.open();
    });

    console.log('Overview page initialized with Prof. Pip mascot & AI Tutor.');
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
      btn.textContent = theme === 'graphite' ? 'Theme: Graphite' : 'Theme: Paper';
    }
  }

  updateNavAuthState() {
    const navRight = document.querySelector('.overview-nav-right');
    if (!navRight) return;

    if (auth.isAuthenticated()) {
      const user = auth.getCurrentUser();
      const userName = user?.name || user?.email?.split('@')[0] || 'User';
      
      const loginLink = document.getElementById('nav-login-btn');
      const signupLink = document.getElementById('nav-signup-btn');
      
      if (loginLink) {
        loginLink.textContent = `Open App (${userName})`;
        loginLink.href = 'app.html';
        loginLink.classList.add('btn-primary');
      }
      if (signupLink) {
        signupLink.textContent = 'Log Out';
        signupLink.href = '#logout';
        signupLink.classList.remove('btn-primary');
        signupLink.addEventListener('click', async (e) => {
          e.preventDefault();
          await auth.logout();
          window.location.reload();
        });
      }
    }
  }

  initScrollSpy() {
    const navLinks = document.querySelectorAll('.overview-nav-link');
    const sections = Array.from(navLinks).map(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        return document.querySelector(href);
      }
      return null;
    }).filter(Boolean);

    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const isMatch = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('active', isMatch);
          });
        }
      });
    }, {
      root: null,
      threshold: 0.3
    });

    sections.forEach(s => observer.observe(s));
  }

  initScrollReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const revealCards = document.querySelectorAll('.step-card, .feature-card, .benefit-card, .cta-box');
    revealCards.forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(12px)';
      card.style.transition = 'opacity 350ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }, (idx % 4) * 80);
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.15
    });

    revealCards.forEach(card => observer.observe(card));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = new OverviewPage();
  page.init();
});
