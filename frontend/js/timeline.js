import { store, eventBus } from './state.js';
import { playback } from './playback.js';

export class TimelineRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.svg = null;
    this.laneHeight = 88;
    this.tickWidth = 76;
    this.headerWidth = 140;
    this.rulerHeight = 36;
    this.init();
  }

  init() {
    eventBus.on('renderStep', ({ stepIndex, isForward, prevStep, schedule }) => {
      this.render(stepIndex, isForward);
    });

    eventBus.on('deadlockDetected', () => {
      this.showNoProgress();
    });

    eventBus.on('raceDetected', ({ race }) => {
      this.renderRaceSummary(race);
    });

    eventBus.on('verifiedDetected', ({ schedules }) => {
      this.renderVerifiedSummary(schedules);
    });
  }

  getLockColor(lockName, locksList = []) {
    let index = locksList.indexOf(lockName);
    if (index === -1) {
      if (lockName === 'A' || lockName === 'lock_a' || lockName === 'lock') index = 0;
      else if (lockName === 'B' || lockName === 'lock_b') index = 1;
      else if (lockName === 'C' || lockName === 'lock_c') index = 2;
      else index = 0;
    }
    const colorVars = ['var(--lock-a)', 'var(--lock-b)', 'var(--lock-c)'];
    return colorVars[index % colorVars.length];
  }

  render(currentStep = -1, isForward = false) {
    if (!this.container) return;

    const state = store.getState();
    const isFixed = state.activeTab === 'fixed';
    const schedule = isFixed
      ? state.explainData?.fixed_analysis?.schedule || []
      : state.analysisData?.schedule || [];

    const program = state.extractData?.program || { threads: [], locks: [] };
    const threads = program.threads || [];
    const locksList = program.locks || ['A', 'B', 'C'];

    if (!schedule.length && !threads.length) {
      this.container.innerHTML = '<div class="viewfinder-empty" style="margin:40px auto;">Awaiting schedule analysis...</div>';
      return;
    }

    const numSteps = Math.max(schedule.length, 1);
    const totalWidth = Math.max(this.container.clientWidth || 800, this.headerWidth + numSteps * this.tickWidth + 60);
    const totalHeight = this.rulerHeight + Math.max(threads.length, 1) * this.laneHeight + 30;

    // Build SVG structure
    let svgHtml = `
      <svg class="timeline-svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--danger)" stroke-width="1.5" />
          </pattern>
        </defs>

        <!-- Ruler Background -->
        <rect x="0" y="0" width="${totalWidth}" height="${this.rulerHeight}" fill="var(--panel)" />
        <line x1="0" y1="${this.rulerHeight}" x2="${totalWidth}" y2="${this.rulerHeight}" stroke="var(--line)" stroke-width="1" />
        <text x="16" y="22" class="ruler-tick-label" font-weight="600">SCHEDULE</text>
    `;

    // Ruler ticks and vertical grid lines
    for (let s = 0; s < numSteps; s++) {
      const x = this.headerWidth + s * this.tickWidth;
      const midX = x + this.tickWidth / 2;
      const isPastOrCurrent = s <= currentStep;

      // Vertical grid line
      svgHtml += `
        <line x1="${x}" y1="${this.rulerHeight}" x2="${x}" y2="${totalHeight}" class="grid-line" />
      `;

      // Ruler tick button/label
      svgHtml += `
        <g class="ruler-tick-group" data-step="${s}" style="cursor:pointer;" onclick="window.schedSimScrub(${s})">
          <rect x="${x}" y="0" width="${this.tickWidth}" height="${this.rulerHeight}" fill="transparent" />
          <line x1="${x}" y1="${this.rulerHeight - 6}" x2="${x}" y2="${this.rulerHeight}" class="ruler-tick-line" />
          <text x="${midX}" y="22" text-anchor="middle" class="ruler-tick-label" fill="${isPastOrCurrent ? 'var(--text)' : 'var(--muted)'}">t${s}</text>
        </g>
      `;
    }

    // Final boundary line
    const lastX = this.headerWidth + numSteps * this.tickWidth;
    svgHtml += `<line x1="${lastX}" y1="${this.rulerHeight}" x2="${lastX}" y2="${totalHeight}" class="grid-line" />`;

    // Draw Lanes
    threads.forEach((thread, tIdx) => {
      const laneY = this.rulerHeight + tIdx * this.laneHeight;
      const isHovered = state.hoveredLock !== null;

      svgHtml += `
        <g class="lane-group" data-thread="${thread.id}" id="lane-${thread.id}">
          <!-- Lane Background -->
          <rect x="0" y="${laneY}" width="${totalWidth}" height="${this.laneHeight}" fill="${tIdx % 2 === 0 ? 'transparent' : 'var(--active-line-bg)'}" />
          <line x1="0" y1="${laneY + this.laneHeight}" x2="${totalWidth}" y2="${laneY + this.laneHeight}" class="lane-border" />
          
          <!-- Lane Header -->
          <text x="16" y="${laneY + 34}" class="lane-label">${thread.id} · ${thread.name}</text>
      `;

      // Thread state badge at current step
      let threadStatus = 'IDLE';
      if (currentStep >= 0 && schedule[currentStep]) {
        const ev = schedule[currentStep];
        if (ev.thread_state && ev.thread_state[thread.id]) {
          threadStatus = ev.thread_state[thread.id].toUpperCase();
        } else if (ev.thread === thread.id) {
          threadStatus = ev.status === 'blocked' ? 'WAITING' : 'RUNNING';
        }
      }
      svgHtml += `
          <text x="16" y="${laneY + 54}" class="lane-status-badge" fill="${threadStatus === 'WAITING' ? 'var(--danger)' : 'var(--muted)'}">${threadStatus}</text>
      `;

      // Blocked hatched region
      let blockedStartStep = -1;
      for (let s = 0; s <= currentStep; s++) {
        const ev = schedule[s];
        if (ev && ev.thread === thread.id && ev.status === 'blocked') {
          blockedStartStep = s;
          break;
        }
      }

      if (blockedStartStep !== -1) {
        const hatchX = this.headerWidth + blockedStartStep * this.tickWidth;
        const hatchWidth = Math.max(0, (Math.min(currentStep + 1, numSteps) - blockedStartStep) * this.tickWidth);
        svgHtml += `
          <rect x="${hatchX}" y="${laneY + 12}" width="${hatchWidth}" height="${this.laneHeight - 24}" fill="url(#hatch-pattern)" class="hatch-pattern-rect ${isForward ? 'anim-hatch-fade' : ''}" />
        `;
      }

      // Signal Trace
      // Base idle level: laneY + 52; Active executing level: laneY + 26
      const baseLevel = laneY + 52;
      const activeLevel = laneY + 26;

      let tracePoints = [];
      let currentLevel = baseLevel;

      // Start point at t0
      const startX = this.headerWidth;
      tracePoints.push({ x: startX, y: baseLevel });

      for (let s = 0; s < numSteps; s++) {
        const segStartX = this.headerWidth + s * this.tickWidth;
        const segEndX = segStartX + this.tickWidth;
        const ev = schedule[s];

        const isRunning = ev && ev.thread === thread.id && ev.status === 'ok';
        const targetLevel = (s <= currentStep && isRunning) ? activeLevel : baseLevel;

        if (targetLevel !== currentLevel) {
          // Stepped transition
          tracePoints.push({ x: segStartX, y: targetLevel });
          currentLevel = targetLevel;
        }

        tracePoints.push({ x: segEndX, y: currentLevel });
      }

      // Format SVG path
      let dStr = `M ${tracePoints[0].x} ${tracePoints[0].y}`;
      for (let p = 1; p < tracePoints.length; p++) {
        dStr += ` L ${tracePoints[p].x} ${tracePoints[p].y}`;
      }

      svgHtml += `
        <path d="${dStr}" class="trace-line" opacity="${currentStep === -1 ? 0.35 : 1}" />
      `;

      // Lock Holding Bars
      // Find intervals where thread holds locks
      const lockIntervals = [];
      const activeLocks = {};

      for (let s = 0; s <= currentStep; s++) {
        const ev = schedule[s];
        if (!ev) continue;

        if (ev.op === 'acquire' && ev.status === 'ok' && ev.thread === thread.id) {
          activeLocks[ev.target] = s;
        } else if (ev.op === 'release' && ev.thread === thread.id && activeLocks[ev.target] !== undefined) {
          lockIntervals.push({
            lock: ev.target,
            start: activeLocks[ev.target],
            end: s + 1,
            released: true
          });
          delete activeLocks[ev.target];
        }
      }

      // Unreleased locks currently held
      Object.keys(activeLocks).forEach(lock => {
        lockIntervals.push({
          lock,
          start: activeLocks[lock],
          end: currentStep + 1,
          released: false
        });
      });

      lockIntervals.forEach(interval => {
        const barX = this.headerWidth + interval.start * this.tickWidth + 2;
        const barW = Math.max(4, (interval.end - interval.start) * this.tickWidth - 4);
        const barY = laneY + 64;
        const lockColor = this.getLockColor(interval.lock, locksList);

        svgHtml += `
          <g class="lock-bar-group" data-lock="${interval.lock}"
             onmouseenter="window.schedSimHoverLock('${interval.lock}', '${thread.id}')"
             onmouseleave="window.schedSimUnhoverLock()">
            <rect x="${barX}" y="${barY}" width="${barW}" height="10" rx="2" fill="${lockColor}" class="lock-bar-rect" />
            <text x="${barX + 4}" y="${barY + 8}" class="lock-bar-text">${interval.lock}</text>
          </g>
        `;
      });

      // Race Markers (reads / writes)
      for (let s = 0; s <= currentStep; s++) {
        const ev = schedule[s];
        if (!ev || ev.thread !== thread.id) continue;

        if (ev.op === 'read' || ev.op === 'write') {
          const markerX = this.headerWidth + s * this.tickWidth + this.tickWidth / 2;
          const markerY = activeLevel;
          const isWrite = ev.op === 'write';

          svgHtml += `
            <g class="race-marker-group">
              <rect x="${markerX - 4}" y="${markerY - 4}" width="8" height="8" class="${isWrite ? 'race-marker-write' : 'race-marker-read'}" />
              <text x="${markerX + 8}" y="${markerY + 3}" class="race-marker-label">${ev.target}=${ev.value ?? 0}</text>
            </g>
          `;
        }
      }

      svgHtml += `</g>`; // End lane group
    });

    // Playhead line
    if (currentStep >= 0 && currentStep < numSteps) {
      const playheadX = this.headerWidth + currentStep * this.tickWidth + this.tickWidth / 2;
      svgHtml += `
        <g class="playhead-group">
          <line x1="${playheadX}" y1="${this.rulerHeight}" x2="${playheadX}" y2="${totalHeight}" class="playhead-line" />
          <polygon points="${playheadX - 5},${this.rulerHeight} ${playheadX + 5},${this.rulerHeight} ${playheadX},${this.rulerHeight + 8}" class="playhead-cap" />
        </g>
      `;
    }

    svgHtml += `</svg>`;
    this.container.innerHTML = svgHtml;
  }

  showNoProgress() {
    const banner = document.getElementById('timeline-banner-notice');
    if (banner) {
      banner.style.display = 'flex';
      banner.className = 'banner-notice warning';
      banner.innerHTML = `<span>DEADLOCK DETECTED · No progress possible</span>`;
    }
  }

  renderRaceSummary(race) {
    const banner = document.getElementById('timeline-banner-notice');
    if (!banner || !race) return;

    banner.style.display = 'flex';
    banner.className = 'banner-notice warning';
    banner.innerHTML = `
      <div class="race-value-pair">
        <span>RACE ON VARIABLE <strong>${race.variable}</strong>:</span>
        <span class="race-expected strikethrough">expected ${race.expected}</span>
        <span class="race-actual">actual ${race.possible[0]}</span>
      </div>
      <span class="label-mono">OVERLAPPING READ OCCURRED</span>
    `;
  }

  renderVerifiedSummary(schedules) {
    const banner = document.getElementById('timeline-banner-notice');
    if (!banner) return;

    banner.style.display = 'flex';
    banner.className = 'banner-notice success';
    banner.innerHTML = `
      <span>FIX VERIFIED BY ENGINE · 0 deadlocks across ${schedules.toLocaleString()} schedules</span>
    `;
  }
}

// Global scrub and hover handlers for SVG inline event triggers
window.schedSimScrub = (step) => {
  playback.scrub(step);
};

window.schedSimHoverLock = (lockName, threadId) => {
  store.setState({ hoveredLock: lockName });
  eventBus.emit('lockHover', { lockName, threadId });
};

window.schedSimUnhoverLock = () => {
  store.setState({ hoveredLock: null });
  eventBus.emit('lockUnhover');
};
