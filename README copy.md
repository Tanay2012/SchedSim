# SchedSim Lens

A calm, instrument-like concurrency visualizer and timing diagram analyzer for Python multithreaded code. Designed to inspect deadlocks, race conditions, lock ordering, and verify engine fixes.

---

## 1. How to Run

SchedSim Lens is built with pure standard web technologies without npm or build steps.

1. Open a terminal in this project root.
2. Start Python's built-in HTTP server:
   ```bash
   python -m http.server 8080
   ```
3. Open your browser to:
   ```
   http://localhost:8080/index.html
   ```

---

## 2. Configuration & Switching USE_MOCK

All configuration options are stored in [`js/config.js`](file:///c:/Users/sunoa/OneDrive/Documents/test/js/config.js).

```javascript
export const CONFIG = {
  API_BASE: 'http://localhost:8000',
  USE_MOCK: true,              // Set to false to hit live backend endpoints
  MODEL_LABEL: 'gemma-4',
  BACKEND_LABEL: 'gemini api',
  DEFAULT_THEME: 'graphite',
  STEP_INTERVAL_MS: 700,
  REQUEST_TIMEOUT_MS: 8000     // 8 second timeout before automatic mock fallback
};
```

- When `USE_MOCK: true`, sample files `s1_counter.json`, `s2_deadlock.json`, and `s3_philosophers.json` in the `/mock/` folder are used.
- When `USE_MOCK: false`, requests go to `POST {API_BASE}/api/extract`, `POST {API_BASE}/api/analyze`, and `POST {API_BASE}/api/explain`. If the backend is unreachable or times out (>8s), the app quietly falls back to cached results.

---

## 3. How to Add or Replace an Animation

All motion in SchedSim Lens is decoupled from application logic:

1. **Named Hook in [`js/animations.js`](file:///c:/Users/sunoa/OneDrive/Documents/test/js/animations.js):**
   Add or edit a function on `animationRegistry`:
   ```javascript
   export const animationRegistry = {
     myCustomAnimation({ element, duration = 300 }) {
       if (prefersReducedMotion()) return;
       element.classList.add('my-anim-class');
     }
   };
   ```

2. **CSS Keyframe in [`css/animations.css`](file:///c:/Users/sunoa/OneDrive/Documents/test/css/animations.css):**
   Add the corresponding keyframes and class:
   ```css
   @keyframes myCustomKeyframe {
     from { opacity: 0; transform: translateY(8px); }
     to { opacity: 1; transform: translateY(0); }
   }
   .my-anim-class {
     animation: myCustomKeyframe 300ms cubic-bezier(.2, .8, .2, 1) forwards;
   }
   ```

3. **Triggering the Animation:**
   Call `triggerAnimation('myCustomAnimation', { element })` via the event bus or view controller.

---

## 4. Keyboard Shortcuts

- `Space`: Play / Pause schedule playback
- `Right Arrow`: Step forward 1 tick
- `Left Arrow`: Step back 1 tick
- `R`: Reset schedule to initial state
- `T`: Toggle theme between **Graphite** (dark) and **Paper** (light)

---

## 5. Architectural Assumptions & Design Decisions

1. **State Isolation**: All timeline and graph rendering derives purely from `render(stepIndex)`. Step back and scrubber interactions are idempotent and never desync.
2. **Strict Palette Constraints**: Danger color (`#E5533D` / `#C8381F`) is strictly reserved for deadlocks, blocked/waiting hatchings, race condition discrepancies, and wait-for graph cycle edges.
3. **Accessibility**: Includes a live region (`aria-live="polite"`) that narrates each thread action in plain English, full keyboard focus outlines (2px), and high-contrast typography (>= 4.5:1).
4. **Mock Fallback**: Any failed API call or slow response (>8000ms) gracefully falls back to the corresponding mock scenario with a subtle banner notification.
