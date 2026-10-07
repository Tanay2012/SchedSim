/**
 * SchedSim Lens - Prof. Pip Teacher Bird Mascot & AI Agent Controller
 * Lightweight, zero-dependency inline SVG mascot with flying navigation, poses, and interactive AI Concurrency Tutor.
 */

import { aiAgent } from './ai-agent.js';

export const MASCOT_MESSAGES = [
  {
    sectionId: 'hero',
    pose: 'wave',
    flyPosition: { bottom: '28px', right: '28px' },
    title: 'Prof. Pip · Welcome!',
    message: "Hi! I'm Prof. Pip! I'll guide you through SchedSim Lens. Click me anytime to ask me anything about concurrency or your code!"
  },
  {
    sectionId: 'how-it-works',
    pose: 'point',
    flyPosition: { bottom: '45px', right: '32px' },
    title: 'Prof. Pip · Quick Steps',
    message: "It's simple: capture your Python code, review thread locks, and step through time tick-by-tick."
  },
  {
    sectionId: 'features',
    pose: 'inspect',
    flyPosition: { bottom: '30px', right: '36px' },
    title: 'Prof. Pip · Key Instruments',
    message: "Check out the interactive timing diagrams and live wait-for cycle graphs—they pinpoint deadlocks instantly!"
  },
  {
    sectionId: 'who-its-for',
    pose: 'book',
    flyPosition: { bottom: '50px', right: '24px' },
    title: 'Prof. Pip · Who Benefits',
    message: "Built specifically for CS students mastering Operating Systems and developers debugging tricky thread races."
  },
  {
    sectionId: 'cta',
    pose: 'thumbs_up',
    flyPosition: { bottom: '32px', right: '32px' },
    title: 'Prof. Pip · Ready?',
    message: "Ready to untangle your multi-threaded code? Create your free account and launch the analyzer!"
  }
];

export class MascotController {
  constructor(options = {}) {
    this.containerId = options.containerId || 'mascot-widget';
    this.messages = options.messages || MASCOT_MESSAGES;
    this.currentSectionId = null;
    this.isMinimized = false;
    this.isDismissed = false;
    this.containerEl = null;
    this.bubbleEl = null;
    this.bodyEl = null;

    this.init();
  }

  init() {
    try {
      this.isMinimized = localStorage.getItem('schedsim_mascot_minimized') === 'true';
    } catch (e) {}

    // Initialize AI Agent modal
    aiAgent.init();

    this.createDOM();
    this.setupScrollObserver();
  }

  /**
   * Render SVG for Prof. Pip according to current pose
   * Poses: 'wave', 'point', 'inspect', 'thumbs_up', 'book'
   */
  getBirdSvg(pose = 'wave') {
    let rightWingSvg = '';
    let accessoriesSvg = '';

    if (pose === 'wave') {
      rightWingSvg = `
        <g class="mascot-wing-anim">
          <path d="M 52 38 Q 66 22 72 32 Q 74 44 54 48 Z" fill="var(--lock-a)" stroke="var(--line)" stroke-width="1.5"/>
          <path d="M 68 28 Q 74 24 73 20" stroke="var(--text)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </g>
      `;
    } else if (pose === 'point') {
      rightWingSvg = `
        <g class="mascot-wing-anim">
          <path d="M 52 42 Q 64 36 68 44 Q 64 52 52 48 Z" fill="var(--lock-a)" stroke="var(--line)" stroke-width="1.5"/>
          <line x1="62" y1="42" x2="82" y2="24" stroke="var(--lock-b)" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="82" cy="24" r="2.5" fill="var(--danger)"/>
        </g>
      `;
    } else if (pose === 'inspect') {
      rightWingSvg = `
        <g class="mascot-wing-anim">
          <path d="M 50 44 Q 62 42 64 50 Q 58 56 48 50 Z" fill="var(--lock-a)" stroke="var(--line)" stroke-width="1.5"/>
          <circle cx="68" cy="38" r="8" fill="none" stroke="var(--lock-b)" stroke-width="2"/>
          <circle cx="68" cy="38" r="6" fill="var(--active-line-bg)"/>
          <line x1="62" y1="44" x2="56" y2="50" stroke="var(--lock-b)" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      `;
    } else if (pose === 'thumbs_up') {
      rightWingSvg = `
        <g class="mascot-wing-anim">
          <path d="M 50 42 Q 62 38 66 45 Q 60 52 48 48 Z" fill="var(--lock-a)" stroke="var(--line)" stroke-width="1.5"/>
          <path d="M 63 40 Q 64 33 67 35 Q 69 41 64 45 Z" fill="var(--ok)" stroke="var(--line)" stroke-width="1"/>
        </g>
      `;
    } else if (pose === 'book') {
      accessoriesSvg = `
        <g transform="translate(42, 42)">
          <polygon points="0,4 12,0 24,4 24,14 12,10 0,14" fill="var(--panel)" stroke="var(--line)" stroke-width="1.5"/>
          <line x1="12" y1="0" x2="12" y2="10" stroke="var(--lock-b)" stroke-width="1.5"/>
          <line x1="3" y1="6" x2="9" y2="4" stroke="var(--muted)" stroke-width="1"/>
          <line x1="15" y1="4" x2="21" y2="6" stroke="var(--muted)" stroke-width="1"/>
        </g>
      `;
      rightWingSvg = `
        <g class="mascot-wing-anim">
          <path d="M 48 44 Q 56 46 54 54 Q 46 56 44 48 Z" fill="var(--lock-a)" stroke="var(--line)" stroke-width="1.5"/>
        </g>
      `;
    } else {
      rightWingSvg = `
        <g class="mascot-wing-anim">
          <path d="M 48 40 Q 62 44 58 56 Q 48 60 44 48 Z" fill="var(--lock-a)" stroke="var(--line)" stroke-width="1.5"/>
        </g>
      `;
    }

    return `
      <svg class="mascot-svg" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Prof. Pip the Teacher Bird">
        <!-- Shadow -->
        <ellipse cx="45" cy="78" rx="22" ry="5" fill="rgba(0,0,0,0.18)" />

        <!-- Feet -->
        <path d="M 37 72 L 34 78 M 37 72 L 37 78 M 37 72 L 40 78" stroke="var(--lock-b)" stroke-width="2" stroke-linecap="round"/>
        <path d="M 53 72 L 50 78 M 53 72 L 53 78 M 53 72 L 56 78" stroke="var(--lock-b)" stroke-width="2" stroke-linecap="round"/>

        <!-- Left Wing -->
        <g class="mascot-wing-anim">
          <path d="M 28 42 Q 16 48 20 60 Q 30 60 34 50 Z" fill="var(--lock-a)" opacity="0.85" stroke="var(--line)" stroke-width="1.5"/>
        </g>

        <!-- Round Body / Torso -->
        <ellipse cx="45" cy="52" rx="22" ry="24" fill="var(--panel)" stroke="var(--line)" stroke-width="2"/>

        <!-- Feather Tummy Patch -->
        <ellipse cx="45" cy="56" rx="14" ry="16" fill="var(--active-line-bg)" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>

        <!-- Tail feathers -->
        <path d="M 24 58 Q 16 64 14 70 Q 22 68 26 62 Z" fill="var(--lock-c)" stroke="var(--line)" stroke-width="1.5"/>

        <!-- Head & Face -->
        <circle cx="45" cy="36" r="18" fill="var(--panel)" stroke="var(--line)" stroke-width="2"/>

        <!-- Blush cheeks -->
        <circle cx="33" cy="42" r="3" fill="var(--lock-c)" opacity="0.5"/>
        <circle cx="57" cy="42" r="3" fill="var(--lock-c)" opacity="0.5"/>

        <!-- Eyes -->
        <circle cx="38" cy="34" r="4.5" fill="var(--text)"/>
        <circle cx="52" cy="34" r="4.5" fill="var(--text)"/>
        <circle cx="39.5" cy="32.5" r="1.5" fill="var(--bg)"/>
        <circle cx="53.5" cy="32.5" r="1.5" fill="var(--bg)"/>

        <!-- Round Teacher Glasses -->
        <circle cx="38" cy="34" r="7" fill="none" stroke="var(--lock-b)" stroke-width="1.8"/>
        <circle cx="52" cy="34" r="7" fill="none" stroke="var(--lock-b)" stroke-width="1.8"/>
        <path d="M 45 34 L 45 33" stroke="var(--lock-b)" stroke-width="2" stroke-linecap="round"/>
        <path d="M 31 33 L 28 32" stroke="var(--lock-b)" stroke-width="1.5"/>
        <path d="M 59 33 L 62 32" stroke="var(--lock-b)" stroke-width="1.5"/>

        <!-- Cute Beak -->
        <polygon points="45,37 41,43 49,43" fill="var(--lock-b)" stroke="var(--line)" stroke-width="1"/>

        <!-- Teacher Mortarboard / Academic Cap -->
        <polygon points="45,12 66,20 45,26 24,20" fill="var(--text)" stroke="var(--line)" stroke-width="1.5"/>
        <rect x="38" y="22" width="14" height="6" rx="2" fill="var(--text)"/>
        <line x1="45" y1="18" x2="62" y2="22" stroke="var(--lock-b)" stroke-width="1.5"/>
        <circle cx="62" cy="22" r="1.5" fill="var(--lock-b)"/>
        <path d="M 62 23 L 64 29 M 62 23 L 62 29" stroke="var(--lock-b)" stroke-width="1.5" stroke-linecap="round"/>

        <!-- Bow Tie -->
        <polygon points="41,48 45,50 41,52" fill="var(--lock-b)"/>
        <polygon points="49,48 45,50 49,52" fill="var(--lock-b)"/>
        <circle cx="45" cy="50" r="1.5" fill="var(--text)"/>

        <!-- Right Wing and Accessories depending on Pose -->
        ${rightWingSvg}
        ${accessoriesSvg}
      </svg>
    `;
  }

  createDOM() {
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      container.className = 'mascot-container';
      document.body.appendChild(container);
    }
    this.containerEl = container;

    if (this.isMinimized) {
      this.containerEl.classList.add('minimized');
    }

    // Create Speech Bubble
    this.bubbleEl = document.createElement('div');
    this.bubbleEl.className = 'mascot-speech-bubble';
    this.bubbleEl.innerHTML = `
      <div class="mascot-bubble-header">
        <span class="mascot-name-tag" id="mascot-bubble-title">Prof. Pip · Guide</span>
        <button class="mascot-bubble-close" id="btn-mascot-close-bubble" title="Dismiss speech bubble" aria-label="Dismiss message">✕</button>
      </div>
      <div class="mascot-bubble-text" id="mascot-bubble-content">
        Hi! I'm Prof. Pip! I'll guide you through SchedSim Lens. Click me to ask any concurrency question!
      </div>
      <div class="mascot-bubble-footer">
        <a class="mascot-ask-ai-link" id="bubble-open-ai-chat">💬 Ask AI Professor Pip ➔</a>
      </div>
    `;

    // Create Mascot Body Wrapper
    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'mascot-body-wrapper';
    this.bodyEl.title = 'Click to open Prof. Pip AI Concurrency Tutor!';
    this.bodyEl.innerHTML = `
      <div class="mascot-ai-badge">AI TUTOR</div>
      <button class="mascot-toggle-btn" id="btn-mascot-minimize" title="Minimize / Restore mascot" aria-label="Toggle mascot">
        ${this.isMinimized ? '▲' : '▼'}
      </button>
      <div id="mascot-svg-holder">${this.getBirdSvg('wave')}</div>
    `;

    this.containerEl.appendChild(this.bubbleEl);
    this.containerEl.appendChild(this.bodyEl);

    // Event listeners
    this.bubbleEl.querySelector('#btn-mascot-close-bubble').addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismissBubble();
    });

    this.bubbleEl.querySelector('#bubble-open-ai-chat')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      aiAgent.open();
    });

    this.bodyEl.querySelector('#btn-mascot-minimize').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });

    // Clicking mascot opens AI Chat
    this.bodyEl.addEventListener('click', () => {
      if (this.isMinimized) {
        this.toggleMinimize();
      } else {
        aiAgent.open();
      }
    });
  }

  setPose(pose) {
    const holder = this.containerEl.querySelector('#mascot-svg-holder');
    if (holder) {
      holder.innerHTML = this.getBirdSvg(pose);
    }
  }

  flyToPosition(pos) {
    if (!pos || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.containerEl.classList.add('flying');
    if (pos.bottom) this.containerEl.style.bottom = pos.bottom;
    if (pos.right) this.containerEl.style.right = pos.right;

    setTimeout(() => {
      this.containerEl.classList.remove('flying');
    }, 650);
  }

  setMessage(title, text, pose = 'wave', flyPos = null) {
    const titleEl = this.bubbleEl.querySelector('#mascot-bubble-title');
    const contentEl = this.bubbleEl.querySelector('#mascot-bubble-content');
    if (titleEl) titleEl.textContent = title;
    if (contentEl) contentEl.textContent = text;
    this.setPose(pose);

    if (flyPos) {
      this.flyToPosition(flyPos);
    }

    if (!this.isDismissed && !this.isMinimized) {
      this.bubbleEl.classList.remove('hidden');
    }
  }

  dismissBubble() {
    this.bubbleEl.classList.add('hidden');
    this.isDismissed = true;
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.containerEl.classList.toggle('minimized', this.isMinimized);
    const minBtn = this.containerEl.querySelector('#btn-mascot-minimize');
    if (minBtn) {
      minBtn.textContent = this.isMinimized ? '▲' : '▼';
      minBtn.title = this.isMinimized ? 'Restore mascot' : 'Minimize mascot';
    }
    try {
      localStorage.setItem('schedsim_mascot_minimized', this.isMinimized);
    } catch (e) {}
  }

  setupScrollObserver() {
    const sectionIds = this.messages.map(m => m.sectionId);
    const sections = sectionIds
      .map(id => document.getElementById(id))
      .filter(el => el !== null);

    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const matched = this.messages.find(m => m.sectionId === entry.target.id);
          if (matched && this.currentSectionId !== matched.sectionId) {
            this.currentSectionId = matched.sectionId;
            this.isDismissed = false;
            this.setMessage(matched.title, matched.message, matched.pose, matched.flyPosition);
          }
        }
      });
    }, {
      root: null,
      threshold: 0.35
    });

    sections.forEach(s => observer.observe(s));
  }
}
