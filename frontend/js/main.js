import { CONFIG } from './config.js';
import { store, eventBus } from './state.js';
import { api } from './api.js';
import { playback } from './playback.js';
import { TimelineRenderer } from './timeline.js';
import { WaitForGraphRenderer } from './graph.js';
import { CodePanelController } from './codepanel.js';
import { review } from './review.js';
import { triggerAnimation } from './animations.js';
import { MascotController } from './mascot.js';
import { aiAgent } from './ai-agent.js';

class App {
  constructor() {
    this.timelineRenderer = null;
    this.graphRenderer = null;
    this.codePanelController = null;
    this.mascot = null;
  }

  init() {
    // Apply saved theme
    const theme = store.getState().theme;
    document.documentElement.setAttribute('data-theme', theme);
    this.updateThemeButtonLabel(theme);

    // Instantiate view renderers
    this.timelineRenderer = new TimelineRenderer('timeline-svg-container');
    this.graphRenderer = new WaitForGraphRenderer('graph-svg-container');
    this.codePanelController = new CodePanelController('code-viewport', 'locks-list');

    // Subscribe to state changes
    store.subscribe((state, prev) => {
      this.handleStateChange(state, prev);
    });

    // Attach DOM event listeners
    this.attachEventListeners();

    // Attach keyboard shortcuts
    this.attachKeyboardShortcuts();

    // Set initial footer labels
    document.getElementById('footer-model-label').textContent = CONFIG.MODEL_LABEL;
    document.getElementById('footer-backend-label').textContent = CONFIG.BACKEND_LABEL;

    // Initialize Prof. Pip Mascot & AI Tutor
    this.mascot = new MascotController({
      containerId: 'mascot-widget',
      messages: [
        {
          sectionId: 'stage-01',
          pose: 'wave',
          title: 'Prof. Pip · Input Stage',
          message: 'Welcome to the Workspace! Select a sample (S1, S2, S3) or paste your concurrent Python code to begin.'
        }
      ]
    });

    console.log('SchedSim Lens initialized with Prof. Pip AI Agent.');
  }

  attachEventListeners() {
    // Theme toggle button
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // AI Tutor button in header
    document.getElementById('btn-app-ask-ai')?.addEventListener('click', () => {
      aiAgent.open();
    });

    // Stepper navigation
    document.querySelectorAll('.stage-stepper .step-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetStage = e.currentTarget.getAttribute('data-stage');
        this.goToStage(targetStage);
      });
    });

    // Sample buttons (S1, S2, S3)
    document.querySelectorAll('.btn-sample').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const sampleId = e.currentTarget.getAttribute('data-sample');
        await this.loadSampleFlow(sampleId);
      });
    });

    // Dropzone & File input
    const dropzone = document.getElementById('photo-dropzone');
    const fileInput = document.getElementById('photo-file-input');
    const btnCamera = document.getElementById('btn-camera-upload');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      btnCamera?.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) this.handleFileUpload(file);
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const file = e.dataTransfer?.files?.[0];
        if (file) this.handleFileUpload(file);
      });
    }

    // Extract Text Button
    const btnExtractText = document.getElementById('btn-extract-text');
    const textareaCode = document.getElementById('paste-code-input');
    if (btnExtractText && textareaCode) {
      btnExtractText.addEventListener('click', async () => {
        const text = textareaCode.value.trim();
        if (!text) {
          alert('Please paste Python concurrent code first.');
          return;
        }
        await this.startExtraction({ text });
      });
    }

    // Review Stage: Analyze Button
    const btnStartAnalysis = document.getElementById('btn-start-analysis');
    if (btnStartAnalysis) {
      btnStartAnalysis.addEventListener('click', async () => {
        await this.runAnalysisFlow();
      });
    }

    // Playback control buttons
    document.getElementById('btn-play-pause')?.addEventListener('click', () => playback.togglePlay());
    document.getElementById('btn-step-fwd')?.addEventListener('click', () => playback.stepForward());
    document.getElementById('btn-step-back')?.addEventListener('click', () => playback.stepBack());
    document.getElementById('btn-reset')?.addEventListener('click', () => playback.reset());

    // Playback speed selector
    document.getElementById('playback-speed-select')?.addEventListener('change', (e) => {
      playback.setSpeed(parseFloat(e.target.value));
    });

    // Schedule Tabs (Bad schedule vs Fixed version)
    document.querySelectorAll('.schedule-tab-btn').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchScheduleTab(tab);
      });
    });

    // Notice banner
    eventBus.on('notice', ({ message }) => {
      const el = document.getElementById('cached-notice-text');
      if (el) el.textContent = message;
    });

    // Step render updates counter
    eventBus.on('renderStep', ({ stepIndex, schedule }) => {
      const stepCounter = document.getElementById('step-counter-label');
      if (stepCounter) {
        stepCounter.textContent = `step ${stepIndex + 1} / ${schedule.length}`;
      }
    });

    // Playback change updates play/pause button icon/text
    eventBus.on('playbackChange', ({ isPlaying }) => {
      const btn = document.getElementById('btn-play-pause');
      if (btn) {
        btn.textContent = isPlaying ? 'Pause' : 'Play';
      }
    });
  }

  attachKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept if user is typing in textarea/input
      if (['TEXTAREA', 'INPUT', 'SELECT'].includes(e.target.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        playback.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        playback.stepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        playback.stepBack();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        playback.reset();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  toggleTheme() {
    const current = store.getState().theme;
    const next = current === 'graphite' ? 'paper' : 'graphite';
    store.setState({ theme: next });
    try {
      localStorage.setItem('schedsim_theme', next);
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', next);
    this.updateThemeButtonLabel(next);
    triggerAnimation('onThemeChange');
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

  goToStage(stageName) {
    store.setState({ stage: stageName });
    // Update steppers
    document.querySelectorAll('.stage-stepper .step-item').forEach(el => {
      const s = el.getAttribute('data-stage');
      el.classList.toggle('active', s === stageName);
    });

    // Update views
    document.querySelectorAll('.stage-view').forEach(view => {
      const s = view.getAttribute('data-stage-view');
      view.classList.toggle('active', s === stageName);
    });

    if (stageName === '02_review') {
      review.renderReview();
      if (this.mascot) {
        this.mascot.setMessage('Prof. Pip · Review Ops', 'Inspect the extracted acquire/release operations and confidence score before running!', 'inspect');
      }
    } else if (stageName === '03_analyze') {
      this.codePanelController.renderCode();
      this.timelineRenderer.render(store.getState().currentStep);
      if (this.mascot) {
        this.mascot.setMessage('Prof. Pip · Timing Analysis', 'Use the scrubber to step through time tick-by-tick! If there is a deadlock, watch the wait-for graph.', 'point');
      }
    } else if (stageName === '01_input') {
      if (this.mascot) {
        this.mascot.setMessage('Prof. Pip · Input Program', 'Drop a code picture or paste concurrent Python text to extract thread routines.', 'wave');
      }
    }
  }

  async handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const previewContainer = document.getElementById('viewfinder-preview-content');
      if (previewContainer) {
        previewContainer.innerHTML = `<img src="${dataUrl}" class="viewfinder-img" alt="Uploaded source" />`;
      }
      triggerAnimation('onUploadStart', { container: document.querySelector('.viewfinder-container') });
      await this.startExtraction({ image: file });
    };
    reader.readAsDataURL(file);
  }

  async loadSampleFlow(sampleId) {
    store.setState({ sampleId });
    this.setStatusWord('READING SAMPLE');

    const extractData = await api.extract({}, sampleId);
    store.setState({
      extractData,
      inputText: extractData.transcription.join('\n')
    });

    // Populate textarea and viewfinder
    const textarea = document.getElementById('paste-code-input');
    if (textarea) textarea.value = extractData.transcription.join('\n');

    const previewContainer = document.getElementById('viewfinder-preview-content');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div style="font-family: var(--font-mono); font-size: 13px; color: var(--muted); padding: 16px; line-height: 1.6;">
          <div style="font-weight: 600; color: var(--text); margin-bottom: 8px;">SAMPLE ${sampleId.toUpperCase()} LOADED</div>
          ${extractData.transcription.slice(0, 8).join('\n')}
        </div>
      `;
    }
    triggerAnimation('onUploadStart', { container: document.querySelector('.viewfinder-container') });

    this.goToStage('02_review');

    if (this.mascot) {
      if (sampleId === 's3') {
        this.mascot.setMessage('Prof. Pip · Dining Philosophers', '🍝 S3 Philosophers loaded! 5 threads contending for 5 chopsticks. Notice the circular wait deadlock in action.', 'book');
      } else if (sampleId === 's2') {
        this.mascot.setMessage('Prof. Pip · AB-BA Deadlock', '🔒 S2 Deadlock loaded! Lock ordering inversion between worker threads.', 'inspect');
      } else if (sampleId === 's1') {
        this.mascot.setMessage('Prof. Pip · Counter Race', '⚡ S1 Counter loaded! Un-synchronized concurrent writes cause lost updates.', 'point');
      }
    }
  }

  async startExtraction(input) {
    this.setStatusWord('EXTRACTING THREADS');
    const extractData = await api.extract(input, store.getState().sampleId);
    store.setState({ extractData });
    this.goToStage('02_review');
  }

  async runAnalysisFlow() {
    this.setStatusWord('CHECKING SCHEDULES');
    const state = store.getState();
    const program = state.extractData?.program;
    if (!program) return;

    const analysisData = await api.analyze(program, state.sampleId);
    const explainData = await api.explain(program, analysisData, state.sampleId);

    // Update global stats
    const deadlocksCount = analysisData.verdict === 'deadlock' ? 1 : 0;
    const racesCount = analysisData.verdict === 'race' ? 1 : 0;

    store.setState({
      analysisData,
      explainData,
      activeTab: 'bad',
      currentStep: -1,
      stats: {
        schedules: analysisData.schedules_checked || 1000,
        deadlocks: deadlocksCount,
        races: racesCount
      }
    });

    // Update header stats
    this.updateHeaderStats(analysisData.schedules_checked, deadlocksCount, racesCount);

    // Go to Stage 3
    this.goToStage('03_analyze');

    // Render explanation text
    this.renderExplanation(explainData);

    // Play schedule automatically
    setTimeout(() => {
      playback.play();
    }, 400);
  }

  renderExplanation(explainData) {
    const textEl = document.getElementById('explanation-text-body');
    const conceptEl = document.getElementById('key-concept-label');

    if (textEl && explainData) {
      textEl.textContent = explainData.plain_explanation || explainData.why_it_happens || '';
    }
    if (conceptEl && explainData) {
      conceptEl.textContent = explainData.key_concept || 'Concurrency';
    }
  }

  updateHeaderStats(schedules, deadlocks, races) {
    const schedulesEl = document.getElementById('stat-schedules-val');
    const deadlocksEl = document.getElementById('stat-deadlocks-val');
    const racesEl = document.getElementById('stat-races-val');

    if (schedulesEl) {
      triggerAnimation('onAnalyzeStart', {
        counterEl: schedulesEl,
        targetSchedules: schedules
      });
    }
    if (deadlocksEl) deadlocksEl.textContent = deadlocks;
    if (racesEl) racesEl.textContent = races;
  }

  switchScheduleTab(tab) {
    store.setState({ activeTab: tab, currentStep: -1 });
    playback.pause();

    document.querySelectorAll('.schedule-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });

    const banner = document.getElementById('timeline-banner-notice');
    if (banner) banner.style.display = 'none';

    this.codePanelController.renderCode();
    this.timelineRenderer.render(-1);
    this.graphRenderer.clear();

    if (tab === 'fixed') {
      triggerAnimation('onFixApplied', { container: document.getElementById('code-viewport') });
    }

    triggerAnimation('onTabSwitch', { element: document.querySelector('.stage-analyze-container') });

    // Auto-play the selected schedule
    setTimeout(() => {
      playback.play();
    }, 300);
  }

  setStatusWord(word) {
    const el = document.getElementById('status-word-indicator');
    if (el) {
      el.textContent = word;
      el.classList.remove('anim-status-rise');
      void el.offsetWidth; // force reflow
      el.classList.add('anim-status-rise');
    }
  }

  handleStateChange(state, prev) {
    // Any global reactive reactions
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
