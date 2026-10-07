import { store, eventBus } from './state.js';
import { triggerAnimation } from './animations.js';

export class ReviewController {
  constructor() {
    this.previewContainer = document.getElementById('review-boxes-preview');
    this.tableContainer = document.getElementById('review-ops-container');
    this.confidenceEl = document.getElementById('review-confidence-val');
    this.confidenceBanner = document.getElementById('review-confidence-banner');
  }

  renderReview() {
    const state = store.getState();
    const extractData = state.extractData;
    if (!extractData) return;

    this.renderDetectionPreview(extractData);
    this.renderEditableOps(extractData.program);
    this.renderConfidence(extractData.program?.confidence ?? 0.9);
  }

  renderDetectionPreview(extractData) {
    if (!this.previewContainer) return;

    const transcription = extractData.transcription || [];
    const boxes = extractData.detected_boxes || [];

    let html = `
      <div style="padding: 16px; font-family: var(--font-mono); font-size: var(--text-code); line-height: 1.6; position: relative; height: 100%;">
    `;

    transcription.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const matchingBox = boxes.find(b => b.line === lineNum);

      html += `
        <div style="display: flex; align-items: baseline; position: relative; min-height: 26px;">
          <span style="width: 32px; color: var(--muted); font-size: var(--text-sm);">${lineNum}</span>
          <span style="flex: 1; white-space: pre;">${this.escapeHtml(lineText)}</span>
          ${
            matchingBox
              ? `<div class="detection-box" data-box-line="${lineNum}" style="left: 28px; top: 2px; right: 8px; height: 22px;"></div>`
              : ''
          }
        </div>
      `;
    });

    html += `</div>`;
    this.previewContainer.innerHTML = html;

    // Trigger box outlines animation
    if (boxes.length > 0) {
      triggerAnimation('onImageRead', { boxes, container: this.previewContainer });
    }
  }

  renderEditableOps(program) {
    if (!this.tableContainer || !program) return;

    const threads = program.threads || [];
    let html = '';

    threads.forEach((thread, tIdx) => {
      html += `
        <div class="thread-group-card" data-thread-id="${thread.id}">
          <div class="thread-group-header">
            <span>THREAD ${thread.id} (${thread.name})</span>
            <button class="btn btn-sm btn-text" onclick="window.schedSimAddOpRow('${thread.id}')">+ Add Op</button>
          </div>
          <table class="ops-table">
            <thead>
              <tr>
                <th style="width: 70px;">Line</th>
                <th style="width: 120px;">Operation</th>
                <th>Target</th>
                <th style="width: 40px;"></th>
              </tr>
            </thead>
            <tbody>
      `;

      thread.ops.forEach((op, opIdx) => {
        html += `
          <tr class="review-op-row" data-thread-id="${thread.id}" data-op-index="${opIdx}">
            <td>
              <input type="number" class="input-text tabular-nums" style="width: 55px;" value="${op.line}" 
                     onchange="window.schedSimUpdateOp('${thread.id}', ${opIdx}, 'line', this.value)" />
            </td>
            <td>
              <select class="select-mono" onchange="window.schedSimUpdateOp('${thread.id}', ${opIdx}, 'op', this.value)">
                <option value="acquire" ${op.op === 'acquire' ? 'selected' : ''}>acquire</option>
                <option value="release" ${op.op === 'release' ? 'selected' : ''}>release</option>
                <option value="read" ${op.op === 'read' ? 'selected' : ''}>read</option>
                <option value="write" ${op.op === 'write' ? 'selected' : ''}>write</option>
              </select>
            </td>
            <td>
              <input type="text" class="input-text" value="${op.target}" 
                     onchange="window.schedSimUpdateOp('${thread.id}', ${opIdx}, 'target', this.value)" />
            </td>
            <td style="text-align: center;">
              <button class="btn-delete-row" title="Delete operation" onclick="window.schedSimDeleteOp('${thread.id}', ${opIdx})">×</button>
            </td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    });

    this.tableContainer.innerHTML = html;

    // Trigger row stagger animation
    const rows = this.tableContainer.querySelectorAll('.review-op-row');
    triggerAnimation('onExtractDone', {
      rows: Array.from(rows),
      confidenceEl: this.confidenceEl,
      targetConfidence: program.confidence ?? 0.93
    });
  }

  renderConfidence(confidence) {
    if (this.confidenceEl) {
      this.confidenceEl.textContent = confidence.toFixed(2);
    }
    if (this.confidenceBanner) {
      if (confidence < 0.70) {
        this.confidenceBanner.style.display = 'block';
        this.confidenceBanner.className = 'banner-notice warning';
        this.confidenceBanner.textContent = 'Low confidence. Check the extraction.';
      } else {
        this.confidenceBanner.style.display = 'none';
      }
    }
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

export const review = new ReviewController();

// Global mutation handlers for review table
window.schedSimUpdateOp = (threadId, opIdx, field, value) => {
  const state = store.getState();
  const program = state.extractData?.program;
  if (!program) return;

  const thread = program.threads?.find(t => t.id === threadId);
  if (thread && thread.ops[opIdx]) {
    thread.ops[opIdx][field] = field === 'line' ? parseInt(value, 10) || 1 : value;
    store.setState({ extractData: { ...state.extractData, program } });
  }
};

window.schedSimAddOpRow = (threadId) => {
  const state = store.getState();
  const program = state.extractData?.program;
  if (!program) return;

  const thread = program.threads?.find(t => t.id === threadId);
  if (thread) {
    const lastLine = thread.ops.length > 0 ? thread.ops[thread.ops.length - 1].line + 1 : 1;
    thread.ops.push({
      line: lastLine,
      op: 'acquire',
      target: 'A'
    });
    store.setState({ extractData: { ...state.extractData, program } });
    review.renderEditableOps(program);
  }
};

window.schedSimDeleteOp = (threadId, opIdx) => {
  const state = store.getState();
  const program = state.extractData?.program;
  if (!program) return;

  const thread = program.threads?.find(t => t.id === threadId);
  if (thread) {
    thread.ops.splice(opIdx, 1);
    store.setState({ extractData: { ...state.extractData, program } });
    review.renderEditableOps(program);
  }
};
