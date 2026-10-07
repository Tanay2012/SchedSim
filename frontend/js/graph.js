import { store, eventBus } from './state.js';

export class WaitForGraphRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.cycleLabel = document.getElementById('graph-cycle-label');
    this.init();
  }

  init() {
    eventBus.on('renderStep', ({ stepIndex }) => {
      this.updateForStep(stepIndex);
    });

    eventBus.on('deadlockDetected', ({ stuck, cycle }) => {
      this.renderGraph(stuck, cycle);
    });
  }

  updateForStep(stepIndex) {
    const state = store.getState();
    const isFixed = state.activeTab === 'fixed';
    const schedule = isFixed
      ? state.explainData?.fixed_analysis?.schedule || []
      : state.analysisData?.schedule || [];

    // If at the end of a deadlocked schedule, show graph
    const isDeadlock = !isFixed && state.analysisData?.verdict === 'deadlock';
    if (isDeadlock && stepIndex === schedule.length - 1 && schedule.length > 0) {
      this.renderGraph(state.analysisData.stuck, state.analysisData.cycle);
    } else {
      this.clear();
    }
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = '<div class="label-mono" style="color:var(--muted); text-align:center; padding:16px;">NO DEPENDENCY CYCLE</div>';
    }
    if (this.cycleLabel) {
      this.cycleLabel.textContent = '';
    }
  }

  renderGraph(stuck = [], cycle = []) {
    if (!this.container) return;
    if (!stuck.length && !cycle.length) {
      this.clear();
      return;
    }

    const width = 280;
    const height = 110;
    const nodes = Array.from(new Set([...stuck.map(s => s.thread), ...(cycle || [])])).filter(Boolean);

    // Compute positions for nodes (2 or 3 nodes)
    const positions = {};
    if (nodes.length === 2) {
      positions[nodes[0]] = { x: 60, y: 55 };
      positions[nodes[1]] = { x: 220, y: 55 };
    } else if (nodes.length === 3) {
      positions[nodes[0]] = { x: 140, y: 25 };
      positions[nodes[1]] = { x: 225, y: 80 };
      positions[nodes[2]] = { x: 55, y: 80 };
    } else {
      // Fallback circular layout
      const cx = width / 2;
      const cy = height / 2;
      const r = 35;
      nodes.forEach((n, idx) => {
        const angle = (idx / nodes.length) * 2 * Math.PI - Math.PI / 2;
        positions[n] = {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle)
        };
      });
    }

    let svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width}" ${height} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow-danger" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--danger)" />
          </marker>
        </defs>
    `;

    // Draw Edges (Stuck arrows)
    stuck.forEach(edge => {
      const fromPos = positions[edge.thread];
      const toPos = positions[edge.held_by];
      if (!fromPos || !toPos) return;

      // Calculate path with slight curve or offset if bidirectional
      const isTwoNode = nodes.length === 2;
      let pathD = '';
      let textX = (fromPos.x + toPos.x) / 2;
      let textY = (fromPos.y + toPos.y) / 2;

      if (isTwoNode) {
        const isTop = edge.thread === nodes[0];
        const curveOffset = isTop ? -20 : 20;
        pathD = `M ${fromPos.x} ${fromPos.y} Q ${textX} ${textY + curveOffset} ${toPos.x} ${toPos.y}`;
        textY += curveOffset * 0.9;
      } else {
        pathD = `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`;
        textY -= 6;
      }

      svg += `
        <g class="graph-edge-group">
          <path d="${pathD}" class="graph-edge-path" marker-end="url(#arrow-danger)" />
          <text x="${textX}" y="${textY}" class="graph-edge-label">wants ${edge.wants}</text>
        </g>
      `;
    });

    // Draw Nodes
    nodes.forEach(nodeId => {
      const pos = positions[nodeId];
      if (!pos) return;
      const nodeW = 40;
      const nodeH = 24;

      svg += `
        <g class="graph-node-group">
          <rect x="${pos.x - nodeW / 2}" y="${pos.y - nodeH / 2}" width="${nodeW}" height="${nodeH}" class="graph-node-rect" />
          <text x="${pos.x}" y="${pos.y}" class="graph-node-text">${nodeId}</text>
        </g>
      `;
    });

    svg += `</svg>`;
    this.container.innerHTML = svg;

    // Display cycle text
    if (this.cycleLabel && cycle && cycle.length > 0) {
      this.cycleLabel.textContent = `CYCLE: ${cycle.join(' → ')}`;
    }
  }
}
