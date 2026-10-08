/**
 * SchedSim Lens configuration
 */
export const CONFIG = {
  API_BASE: 'http://localhost:5000',
  USE_MOCK: false, // Set to false to use your live Gemma 4 model, or true for offline demo
  MODEL_LABEL: 'gemma-4',
  BACKEND_LABEL: 'gemini api',
  DEFAULT_THEME: 'graphite',
  STEP_INTERVAL_MS: 700,
  REQUEST_TIMEOUT_MS: 15000
};