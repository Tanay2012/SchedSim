/**
 * SchedSim Lens Animation Registry
 * All UI motion is triggered exclusively through these named hooks.
 */

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const animationRegistry = {
  /**
   * Corner brackets slide in 12px and settle
   */
  onUploadStart({ container }) {
    if (!container) return;
    const brackets = container.querySelectorAll('.viewfinder-bracket');
    if (prefersReducedMotion()) {
      brackets.forEach(b => b.classList.add('settled'));
      return;
    }

    brackets.forEach(b => {
      b.classList.add('animating');
      b.classList.remove('settled');
    });

    setTimeout(() => {
      brackets.forEach(b => {
        b.classList.remove('animating');
        b.classList.add('settled');
      });
    }, 50);
  },

  /**
   * 1px outlines fade in around each detected line, 80ms apart
   */
  onImageRead({ boxes, container }) {
    if (!container || !boxes || !boxes.length) return;
    if (prefersReducedMotion()) {
      boxes.forEach(box => {
        const el = container.querySelector(`[data-box-line="${box.line}"]`);
        if (el) el.style.opacity = '1';
      });
      return;
    }

    boxes.forEach((box, idx) => {
      setTimeout(() => {
        const el = container.querySelector(`[data-box-line="${box.line}"]`);
        if (el) {
          el.classList.add('anim-box-fade');
        }
      }, idx * 80);
    });
  },

  /**
   * Review table rows appear with 60ms stagger; confidence value counts up over 500ms
   */
  onExtractDone({ rows, confidenceEl, targetConfidence }) {
    if (confidenceEl && targetConfidence !== undefined) {
      if (prefersReducedMotion()) {
        confidenceEl.textContent = targetConfidence.toFixed(2);
      } else {
        const duration = 500;
        const start = performance.now();
        function animateConfidence(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const current = (progress * targetConfidence).toFixed(2);
          confidenceEl.textContent = current;
          if (progress < 1) {
            requestAnimationFrame(animateConfidence);
          }
        }
        requestAnimationFrame(animateConfidence);
      }
    }

    if (!rows || !rows.length) return;
    if (prefersReducedMotion()) {
      rows.forEach(r => (r.style.opacity = '1'));
      return;
    }

    rows.forEach((row, idx) => {
      row.style.opacity = '0';
      setTimeout(() => {
        row.classList.add('anim-row-stagger');
      }, idx * 60);
    });
  },

  /**
   * Schedules checked counter ticks up over 700ms and settles on real number
   */
  onAnalyzeStart({ counterEl, targetSchedules }) {
    if (!counterEl || !targetSchedules) return;
    if (prefersReducedMotion()) {
      counterEl.textContent = targetSchedules.toLocaleString();
      return;
    }

    const duration = 700;
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(progress * targetSchedules);
      counterEl.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  },

  /**
   * Single step animation: lock bar scaling, trace drawing
   */
  onStep({ lockBarEl, traceEl }) {
    if (prefersReducedMotion()) return;
    if (lockBarEl) {
      lockBarEl.classList.add('anim-lock-grow');
    }
    if (traceEl) {
      traceEl.classList.add('anim-trace-draw');
    }
  },

  /**
   * Diagonal hatch fades into the waiting region
   */
  onBlocked({ hatchEl }) {
    if (!hatchEl) return;
    if (prefersReducedMotion()) {
      hatchEl.style.opacity = '1';
      return;
    }
    hatchEl.classList.add('anim-hatch-fade');
  },

  /**
   * Deadlock sequence: playhead advance, "no progress" label, dimming, wait-for cycle
   */
  onDeadlock({ noProgressLabelEl, otherLanes, drawGraphEdgesCallback }) {
    if (noProgressLabelEl) {
      noProgressLabelEl.style.display = 'block';
      if (!prefersReducedMotion()) {
        noProgressLabelEl.classList.add('anim-result-rise');
      }
    }

    if (otherLanes) {
      otherLanes.forEach(lane => lane.classList.add('dimmed'));
    }

    if (drawGraphEdgesCallback) {
      drawGraphEdgesCallback();
    }
  },

  /**
   * Race condition result animation
   */
  onRaceResult({ expectedEl, actualEl }) {
    if (expectedEl) {
      expectedEl.classList.add('strikethrough');
      if (!prefersReducedMotion()) {
        expectedEl.classList.add('anim-strikethrough');
      }
    }
    if (actualEl && !prefersReducedMotion()) {
      actualEl.classList.add('anim-result-rise');
    }
  },

  /**
   * FLIP transition for reordered code lines and soft ok-bar
   */
  onFixApplied({ container }) {
    if (!container) return;
    const lines = container.querySelectorAll('.code-line-row');
    if (prefersReducedMotion()) return;

    lines.forEach(line => {
      line.classList.add('active', 'fixed-marker');
      setTimeout(() => {
        line.classList.remove('fixed-marker');
      }, 1500);
    });
  },

  /**
   * Fix verified celebration: checkmark stroke and count-up
   */
  onVerified({ checkmarkEl, verifiedTextEl, schedulesCount }) {
    if (checkmarkEl && !prefersReducedMotion()) {
      checkmarkEl.classList.add('anim-checkmark');
    }
    if (verifiedTextEl && schedulesCount) {
      verifiedTextEl.textContent = `Fix verified: 0 deadlocks in ${schedulesCount.toLocaleString()} schedules`;
    }
  },

  /**
   * Tab switch crossfade
   */
  onTabSwitch({ element }) {
    if (!element || prefersReducedMotion()) return;
    element.classList.add('fade-enter');
    requestAnimationFrame(() => {
      element.classList.add('fade-enter-active');
      setTimeout(() => {
        element.classList.remove('fade-enter', 'fade-enter-active');
      }, 250);
    });
  },

  /**
   * Theme change crossfade
   */
  onThemeChange() {
    // Handled smoothly via CSS transition on body
  }
};

/**
 * Trigger an animation hook by name
 */
export function triggerAnimation(name, payload = {}) {
  const fn = animationRegistry[name];
  if (typeof fn === 'function') {
    fn(payload);
  } else {
    console.warn(`Animation hook "${name}" not found in registry.`);
  }
}
