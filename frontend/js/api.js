import { CONFIG } from './config.js';
import { store, eventBus } from './state.js';

async function fetchWithTimeout(url, options = {}, timeoutMs = CONFIG.REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function loadMock(sampleKey = 's2') {
  let file = 's2_deadlock.json';
  if (sampleKey === 's1') file = 's1_counter.json';
  else if (sampleKey === 's3') file = 's3_philosophers.json';

  const res = await fetch(`./mock/${file}`);
  if (!res.ok) {
    throw new Error(`Failed to load mock file: ${file}`);
  }
  return await res.json();
}

export const api = {
  async extract(input, sampleKey = null) {
    const useMock = store.getState().useMock;
    
    if (useMock || sampleKey) {
      const mockKey = sampleKey || 's2';
      const data = await loadMock(mockKey);
      return data.extract;
    }

    try {
      let response;
      if (input.image) {
        const formData = new FormData();
        formData.append('image', input.image);
        response = await fetchWithTimeout(`${CONFIG.API_BASE}/api/extract`, {
          method: 'POST',
          body: formData
        });
      } else {
        response = await fetchWithTimeout(`${CONFIG.API_BASE}/api/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input.text })
        });
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn('Extract API request failed or timed out, falling back to mock:', err);
      eventBus.emit('notice', { message: 'Showing cached result', type: 'info' });
      const data = await loadMock(sampleKey || 's2');
      return data.extract;
    }
  },

  async analyze(program, sampleKey = null) {
    const useMock = store.getState().useMock;

    if (useMock || sampleKey) {
      const mockKey = sampleKey || 's2';
      const data = await loadMock(mockKey);
      return data.analyze;
    }

    try {
      const response = await fetchWithTimeout(`${CONFIG.API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(program)
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn('Analyze API request failed or timed out, falling back to mock:', err);
      eventBus.emit('notice', { message: 'Showing cached result', type: 'info' });
      const data = await loadMock(sampleKey || 's2');
      return data.analyze;
    }
  },

  async explain(program, analysis, sampleKey = null) {
    const useMock = store.getState().useMock;

    if (useMock || sampleKey) {
      const mockKey = sampleKey || 's2';
      const data = await loadMock(mockKey);
      return data.explain;
    }

    try {
      const response = await fetchWithTimeout(`${CONFIG.API_BASE}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program, analysis })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn('Explain API request failed or timed out, falling back to mock:', err);
      eventBus.emit('notice', { message: 'Showing cached result', type: 'info' });
      const data = await loadMock(sampleKey || 's2');
      return data.explain;
    }
  }
};
