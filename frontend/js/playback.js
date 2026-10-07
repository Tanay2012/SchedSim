import { CONFIG } from './config.js';
import { store, eventBus } from './state.js';
import { triggerAnimation } from './animations.js';

class PlaybackController {
  constructor() {
    this.timer = null;
    this.stepInterval = CONFIG.STEP_INTERVAL_MS;
  }

  getCurrentSchedule() {
    const state = store.getState();
    if (state.activeTab === 'fixed' && state.explainData?.fixed_analysis?.schedule) {
      return state.explainData.fixed_analysis.schedule;
    }
    return state.analysisData?.schedule || [];
  }

  getCurrentVerdict() {
    const state = store.getState();
    if (state.activeTab === 'fixed') {
      return state.explainData?.fixed_analysis?.verdict || 'ok';
    }
    return state.analysisData?.verdict || 'unknown';
  }

  play() {
    const schedule = this.getCurrentSchedule();
    const state = store.getState();
    if (schedule.length === 0) return;

    if (state.currentStep >= schedule.length - 1) {
      // Loop or restart from -1
      this.goToStep(-1);
    }

    store.setState({ isPlaying: true });
    this.scheduleNextTick();
    eventBus.emit('playbackChange', { isPlaying: true });
  }

  pause() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    store.setState({ isPlaying: false });
    eventBus.emit('playbackChange', { isPlaying: false });
  }

  togglePlay() {
    const state = store.getState();
    if (state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  scheduleNextTick() {
    if (this.timer) clearTimeout(this.timer);
    const speed = store.getState().playbackSpeed || 1;
    const interval = Math.max(100, this.stepInterval / speed);

    this.timer = setTimeout(() => {
      const state = store.getState();
      if (!state.isPlaying) return;

      const schedule = this.getCurrentSchedule();
      if (state.currentStep < schedule.length - 1) {
        this.stepForward(true);
        this.scheduleNextTick();
      } else {
        this.pause();
        this.onScheduleEnd();
      }
    }, interval);
  }

  stepForward(isAuto = false) {
    const schedule = this.getCurrentSchedule();
    const current = store.getState().currentStep;
    if (current < schedule.length - 1) {
      this.goToStep(current + 1, true);
    } else if (!isAuto) {
      this.onScheduleEnd();
    }
  }

  stepBack() {
    const current = store.getState().currentStep;
    if (current > -1) {
      this.goToStep(current - 1, false);
    }
  }

  reset() {
    this.pause();
    this.goToStep(-1, false);
  }

  scrub(targetStep) {
    this.pause();
    this.goToStep(targetStep, false);
  }

  setSpeed(speed) {
    store.setState({ playbackSpeed: speed });
    if (store.getState().isPlaying) {
      this.scheduleNextTick();
    }
  }

  goToStep(stepIndex, isForward = false) {
    const schedule = this.getCurrentSchedule();
    const clamped = Math.max(-1, Math.min(stepIndex, schedule.length - 1));
    const prevStep = store.getState().currentStep;

    store.setState({ currentStep: clamped });
    eventBus.emit('renderStep', {
      stepIndex: clamped,
      isForward,
      prevStep,
      schedule
    });

    // Announce for accessibility
    this.announceStep(clamped, schedule);

    // If step reaches end
    if (clamped === schedule.length - 1 && isForward) {
      this.onScheduleEnd();
    }
  }

  announceStep(stepIndex, schedule) {
    const narrationEl = document.getElementById('narration-announcer');
    if (!narrationEl) return;

    if (stepIndex === -1) {
      narrationEl.textContent = 'Schedule reset to initial state';
      return;
    }

    const event = schedule[stepIndex];
    if (!event) return;

    let text = `Step ${stepIndex + 1} of ${schedule.length}: Thread ${event.thread} `;
    if (event.op === 'acquire') {
      text += event.status === 'blocked' ? `attempted to acquire lock ${event.target} and is blocked` : `acquired lock ${event.target}`;
    } else if (event.op === 'release') {
      text += `released lock ${event.target}`;
    } else if (event.op === 'read') {
      text += `read variable ${event.target} (value ${event.value ?? 0})`;
    } else if (event.op === 'write') {
      text += `wrote variable ${event.target} = ${event.value ?? 0}`;
    }

    narrationEl.textContent = text;
  }

  onScheduleEnd() {
    const verdict = this.getCurrentVerdict();
    const state = store.getState();

    if (verdict === 'deadlock') {
      eventBus.emit('deadlockDetected', {
        stuck: state.analysisData?.stuck || [],
        cycle: state.analysisData?.cycle || []
      });
    } else if (verdict === 'race') {
      eventBus.emit('raceDetected', {
        race: state.analysisData?.race
      });
    } else if (verdict === 'ok') {
      eventBus.emit('verifiedDetected', {
        schedules: state.explainData?.fixed_analysis?.schedules_checked || 1000
      });
    }
  }
}

export const playback = new PlaybackController();
