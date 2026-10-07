import { CONFIG } from './config.js';

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, payload) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }
  }
}

export const eventBus = new EventBus();

// Theme loading from localStorage
function getSavedTheme() {
  try {
    const saved = localStorage.getItem('schedsim_theme');
    if (saved === 'graphite' || saved === 'paper') return saved;
  } catch (e) {
    // ignore
  }
  return CONFIG.DEFAULT_THEME;
}

const initialState = {
  stage: '01_input',
  theme: getSavedTheme(),
  sampleId: null,
  inputMode: 'text',
  inputText: '',
  inputImage: null,
  isExtracting: false,
  isAnalyzing: false,
  statusText: '',
  extractData: null,
  analysisData: null,
  explainData: null,
  activeTab: 'bad', // 'bad' | 'fixed'
  currentStep: -1,
  maxStep: 0,
  isPlaying: false,
  playbackSpeed: 1,
  useMock: CONFIG.USE_MOCK,
  hoveredLock: null,
  stats: {
    schedules: 0,
    deadlocks: 0,
    races: 0
  }
};

class Store {
  constructor(state) {
    this.state = { ...state };
    this.subscribers = new Set();
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...updates };
    this.subscribers.forEach(listener => {
      try {
        listener(this.state, prevState);
      } catch (err) {
        console.error('Error in state subscriber:', err);
      }
    });
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }
}

export const store = new Store(initialState);
