import { store, eventBus } from './state.js';

export class CodePanelController {
  constructor(codeContainerId, locksContainerId) {
    this.codeContainer = document.getElementById(codeContainerId);
    this.locksContainer = document.getElementById(locksContainerId);
    this.init();
  }

  init() {
    eventBus.on('renderStep', ({ stepIndex, schedule }) => {
      this.updateStep(stepIndex, schedule);
    });

    eventBus.on('lockHover', ({ lockName, threadId }) => {
      this.highlightLockLines(lockName, threadId);
    });

    eventBus.on('lockUnhover', () => {
      this.clearLockHighlights();
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

  renderCode() {
    if (!this.codeContainer) return;

    const state = store.getState();
    const isFixed = state.activeTab === 'fixed';
    const lines = isFixed
      ? state.explainData?.fixed_code || state.extractData?.transcription || []
      : state.extractData?.transcription || [];

    let html = '';
    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      html += `
        <div class="code-line-row" data-line-num="${lineNum}" id="code-line-${lineNum}">
          <span class="code-line-num">${lineNum}</span>
          <span class="code-line-text">${this.escapeHtml(lineText)}</span>
        </div>
      `;
    });

    this.codeContainer.innerHTML = html;
    this.renderLocks();
  }

  renderLocks(currentLocks = {}) {
    if (!this.locksContainer) return;

    const state = store.getState();
    const programLocks = state.extractData?.program?.locks || [];
    // If no locks in program (e.g., race scenario with counter), show shared vars or empty
    const locksList = programLocks.length > 0 ? programLocks : (state.extractData?.program?.shared_vars || []);

    if (locksList.length === 0) {
      this.locksContainer.innerHTML = '<div class="label-mono" style="color:var(--muted); padding: 8px;">NO LOCKS DEFINED</div>';
      return;
    }

    let html = '';
    locksList.forEach(lockName => {
      const owner = currentLocks[lockName] || 'free';
      const isHeld = owner !== 'free' && owner !== null;
      const color = this.getLockColor(lockName, locksList);

      html += `
        <div class="lock-row" data-lock="${lockName}">
          <div class="lock-color-bar" style="background-color: ${color};"></div>
          <div class="lock-row-left">
            <span class="lock-name">${lockName}</span>
          </div>
          <span class="lock-owner ${isHeld ? 'held' : ''}">${isHeld ? `held by ${owner}` : 'free'}</span>
        </div>
      `;
    });

    this.locksContainer.innerHTML = html;
  }

  updateStep(stepIndex, schedule) {
    if (!this.codeContainer) return;

    const allRows = this.codeContainer.querySelectorAll('.code-line-row');
    allRows.forEach(row => {
      row.classList.remove('active', 'executed');
    });

    if (stepIndex === -1 || !schedule || !schedule[stepIndex]) {
      this.renderLocks({});
      return;
    }

    const currentEvent = schedule[stepIndex];
    const currentLineNum = currentEvent.line;

    // Mark active line
    const activeRow = this.codeContainer.querySelector(`[data-line-num="${currentLineNum}"]`);
    if (activeRow) {
      activeRow.classList.add('active');
      // Scroll into view if needed
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Mark executed lines
    const executedLines = new Set();
    for (let s = 0; s < stepIndex; s++) {
      if (schedule[s] && schedule[s].line) {
        executedLines.add(schedule[s].line);
      }
    }

    executedLines.forEach(lineNum => {
      if (lineNum !== currentLineNum) {
        const row = this.codeContainer.querySelector(`[data-line-num="${lineNum}"]`);
        if (row) row.classList.add('executed');
      }
    });

    // Update locks
    this.renderLocks(currentEvent.locks || {});
  }

  highlightLockLines(lockName, threadId) {
    const state = store.getState();
    const program = state.extractData?.program;
    if (!program) return;

    const thread = program.threads?.find(t => t.id === threadId);
    if (!thread) return;

    const targetLines = thread.ops
      .filter(op => op.target === lockName)
      .map(op => op.line);

    targetLines.forEach(lineNum => {
      const row = this.codeContainer?.querySelector(`[data-line-num="${lineNum}"]`);
      if (row) row.classList.add('highlight-lock');
    });
  }

  clearLockHighlights() {
    if (!this.codeContainer) return;
    const rows = this.codeContainer.querySelectorAll('.highlight-lock');
    rows.forEach(r => r.classList.remove('highlight-lock'));
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
