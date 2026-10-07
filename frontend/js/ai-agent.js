/**
 * SchedSim Lens - Prof. Pip AI Concurrency Agent
 * Built-in intelligent concurrency tutor and problem debriefer.
 * Can explain website components and debrief deep concurrency problems (Philosophers, AB-BA deadlock, Race conditions, etc.).
 */

export const CONCURRENCY_KNOWLEDGE_BASE = {
  philosophers: {
    title: "🍝 The Dining Philosophers Problem & Deadlock Fix",
    summary: "5 philosophers sit at a round table with 5 chopsticks (locks). Each needs 2 adjacent chopsticks to eat.",
    deadlockCause: `
**Why Deadlock Occurs:**
1. **Simultaneous Request:** Every philosopher gets hungry at the exact same time and grabs their **left chopstick** (\`acquire(fork[i])\`).
2. **Circular Wait:** Each philosopher now holds their left chopstick and waits indefinitely for their **right chopstick** (\`acquire(fork[(i+1)%5])\`), which is currently held by their neighbor.
3. **No Preemption:** No philosopher will drop their chopstick until they finish eating.
4. **Result:** A circular dependency cycle forms in the Wait-For Graph: \`P0 ➔ fork1 ➔ P1 ➔ fork2 ➔ P2 ➔ fork3 ➔ P3 ➔ fork4 ➔ P4 ➔ fork0 ➔ P0\`. All threads are blocked forever!
    `,
    solution: `
**The Solution (Resource Hierarchy / Lock Ordering):**
We break the circular wait condition by imposing a **strict total lock ordering rule**:
- All philosophers except the last one acquire \`fork[min(left, right)]\` first, then \`fork[max(left, right)]\`.
- Or simply: Philosophers 0 to 3 pick up **Left** then **Right**, but Philosopher 4 picks up **Right** first, then **Left**!
- Because Philosopher 4 tries to pick up \`fork[0]\` first (the lowest numbered lock), they compete directly with Philosopher 0 before holding \`fork[4]\`, preventing any circular dependency cycle from ever closing.
    `,
    codeSnippet: `
# ❌ FAILING VERSION (DEADLOCK PRONE)
def philosopher_deadlock(i, forks):
    left = forks[i]
    right = forks[(i + 1) % 5]
    with left:          # Everyone grabs left
        time.sleep(0.01)
        with right:     # Everyone blocks waiting for right!
            eat()

# ✅ FIXED VERSION (RESOURCE HIERARCHY / ASYMMETRIC LOCK ORDER)
def philosopher_fixed(i, forks):
    first_idx = min(i, (i + 1) % 5)
    second_idx = max(i, (i + 1) % 5)
    
    # Always acquire locks in ascending index order!
    with forks[first_idx]:
        with forks[second_idx]:
            eat()
    `
  },

  abba_deadlock: {
    title: "🔒 S2 AB-BA Deadlock (Lock Ordering Inversion)",
    summary: "Two threads acquire the same two locks in opposite order.",
    deadlockCause: `
**The Problem:**
- **Thread 1:** Acquires Lock A, then tries to acquire Lock B.
- **Thread 2:** Acquires Lock B, then tries to acquire Lock A.
If Thread 1 and Thread 2 run concurrently:
1. \`T1\` executes \`acquire(lock_a)\` (success).
2. \`T2\` executes \`acquire(lock_b)\` (success).
3. \`T1\` executes \`acquire(lock_b)\` ➔ **BLOCKED** (held by T2).
4. \`T2\` executes \`acquire(lock_a)\` ➔ **BLOCKED** (held by T1).
Neither thread can proceed. In SchedSim Lens, this lights up as a 2-node cycle in the Wait-For Graph.
    `,
    solution: `
**The Fix:**
Enforce global lock acquisition hierarchy: All threads must acquire **Lock A before Lock B**.
    `,
    codeSnippet: `
# ❌ FAILING (Opposite Order)
def thread1():
    with lock_a:
        with lock_b:
            critical_section()

def thread2():
    with lock_b:       # Lock inversion!
        with lock_a:
            critical_section()

# ✅ FIXED (Uniform Hierarchy)
def thread2_fixed():
    with lock_a:       # Same order as thread 1
        with lock_b:
            critical_section()
    `
  },

  race_condition: {
    title: "⚡ S1 Race Condition (Lost Update & Read-Modify-Write)",
    summary: "Multiple threads concurrently modify shared state without mutual exclusion.",
    deadlockCause: `
**The Hazard:**
The operation \`counter += 1\` is actually 3 bytecode steps:
1. \`LOAD_GLOBAL counter\` (Read)
2. \`ADD 1\` (Compute)
3. \`STORE_GLOBAL counter\` (Write)
If Thread 1 reads \`counter = 0\`, gets interrupted, and Thread 2 increments to \`1\`, then Thread 1 resumes and writes its old computed value \`1\`, one increment is completely lost!
    `,
    solution: `
**The Fix:** Wrap shared memory modifications inside a **Mutex Lock** (\`threading.Lock()\`) to ensure atomic execution.
    `,
    codeSnippet: `
lock = threading.Lock()

# ✅ THREAD-SAFE COUNTER
def safe_worker():
    global counter
    with lock:
        counter += 1
    `
  },

  website_guide: {
    title: "🧭 SchedSim Lens Website & Tools Guide",
    summary: "Complete walkthrough of SchedSim Lens components and features.",
    content: `
Here is how to use every part of SchedSim Lens:
1. **01 INPUT STAGE:**
   - **Upload Image / Dropzone:** Drop whiteboard photos or phone photos of Python code. SchedSim Lens will OCR and extract thread routines.
   - **Paste Code:** Directly paste multi-threaded Python code.
   - **Sample Buttons (S1, S2, S3):** Quick presets to test Counter Race, AB-BA Deadlock, and Dining Philosophers.
2. **02 REVIEW STAGE:**
   - Review bounding boxes and extracted operations with confidence scores. You can adjust thread operations before execution.
3. **03 ANALYZE STAGE:**
   - **Timing Diagram:** Real-time Gantt chart displaying each thread's active, held, and blocked states.
   - **Wait-For Graph:** Visualizes dependency graphs. Cycles immediately flash in red.
   - **Bad vs Fixed Tabs:** Toggle side-by-side to see why the code failed and how the engine resolved the bug.
   - **Scrubber Controls:** Use Space (Play/Pause), Left/Right arrows to step tick-by-tick through time.
    `
  }
};

export class AIAgent {
  constructor() {
    this.history = [];
    this.isOpen = false;
    this.modalEl = null;
  }

  init() {
    this.createModalDOM();
    this.attachEvents();
  }

  createModalDOM() {
    let existing = document.getElementById('ai-chat-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'ai-chat-modal';
    modal.className = 'ai-chat-modal hidden';
    modal.innerHTML = `
      <div class="ai-chat-card">
        <!-- Header -->
        <div class="ai-chat-header">
          <div class="ai-header-info">
            <div class="ai-avatar-mini" id="ai-modal-avatar"></div>
            <div>
              <div class="ai-title">Prof. Pip · AI Concurrency Tutor</div>
              <div class="ai-subtitle">Ask anything about concurrency, deadlocks, code fixes, or this tool</div>
            </div>
          </div>
          <button id="btn-close-ai-chat" class="ai-close-btn" aria-label="Close AI Chat">✕</button>
        </div>

        <!-- Quick Topic Chips -->
        <div class="ai-chips-bar">
          <button class="ai-chip" data-topic="philosophers">🍝 Dining Philosophers Problem</button>
          <button class="ai-chip" data-topic="abba_deadlock">🔒 AB-BA Deadlock & Fix</button>
          <button class="ai-chip" data-topic="race_condition">⚡ Race Conditions</button>
          <button class="ai-chip" data-topic="website_guide">🧭 How to use this website</button>
        </div>

        <!-- Messages Area -->
        <div id="ai-chat-messages" class="ai-chat-messages">
          <div class="ai-msg ai-msg-bot">
            <div class="ai-msg-bubble">
              <p><strong>Greetings! I'm Prof. Pip, your AI Concurrency Professor. 🎓</strong></p>
              <p>I can explain any multithreading concept, analyze deadlocks in your code, or give you full explanations with corrected code snippets.</p>
              <p>Click one of the prompt chips above or type any question or Python code below!</p>
            </div>
          </div>
        </div>

        <!-- Input Box -->
        <form id="ai-chat-form" class="ai-chat-input-row">
          <input 
            type="text" 
            id="ai-user-input" 
            class="input-text ai-input" 
            placeholder="Ask about Dining Philosophers, deadlocks, or paste code..." 
            autocomplete="off" 
            required 
          />
          <button type="submit" id="btn-ai-send" class="btn btn-primary" style="padding: 6px 16px;">
            Ask Pip
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    // Render avatar in header
    const avatarHolder = document.getElementById('ai-modal-avatar');
    if (avatarHolder) {
      avatarHolder.innerHTML = `
        <svg viewBox="0 0 90 90" style="width: 32px; height: 32px;">
          <ellipse cx="45" cy="52" rx="22" ry="24" fill="var(--panel)" stroke="var(--line)" stroke-width="2"/>
          <circle cx="45" cy="36" r="18" fill="var(--panel)" stroke="var(--line)" stroke-width="2"/>
          <circle cx="38" cy="34" r="7" fill="none" stroke="var(--lock-b)" stroke-width="1.8"/>
          <circle cx="52" cy="34" r="7" fill="none" stroke="var(--lock-b)" stroke-width="1.8"/>
          <circle cx="38" cy="34" r="3.5" fill="var(--text)"/>
          <circle cx="52" cy="34" r="3.5" fill="var(--text)"/>
          <polygon points="45,37 41,43 49,43" fill="var(--lock-b)"/>
          <polygon points="45,12 66,20 45,26 24,20" fill="var(--text)"/>
        </svg>
      `;
    }
  }

  attachEvents() {
    // Close button
    document.getElementById('btn-close-ai-chat')?.addEventListener('click', () => {
      this.close();
    });

    // Close on escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Form submit
    document.getElementById('ai-chat-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('ai-user-input');
      const text = input?.value?.trim();
      if (text) {
        input.value = '';
        this.handleUserQuery(text);
      }
    });

    // Quick chips
    document.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const topicKey = e.currentTarget.getAttribute('data-topic');
        this.handleTopicClick(topicKey);
      });
    });
  }

  open() {
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');
    document.getElementById('ai-user-input')?.focus();
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  handleTopicClick(topicKey) {
    const data = CONCURRENCY_KNOWLEDGE_BASE[topicKey];
    if (!data) return;

    this.appendUserMessage(`Explain ${data.title}`);

    let replyHtml = `<h3>${data.title}</h3><p>${data.summary}</p>`;
    if (data.deadlockCause) {
      replyHtml += `<div>${this.formatMarkdown(data.deadlockCause)}</div>`;
    }
    if (data.solution) {
      replyHtml += `<div>${this.formatMarkdown(data.solution)}</div>`;
    }
    if (data.codeSnippet) {
      replyHtml += `<pre class="ai-code-block"><code>${this.escapeHtml(data.codeSnippet)}</code></pre>`;
    }
    if (data.content) {
      replyHtml += `<div>${this.formatMarkdown(data.content)}</div>`;
    }

    this.showTypingIndicator(() => {
      this.appendBotMessage(replyHtml);
    });
  }

  async handleUserQuery(query) {
    this.appendUserMessage(query);
    const qLower = query.toLowerCase();

    this.showTypingIndicator(async () => {
      let replyHtml = '';

      // Check for Dining Philosophers keywords
      if (qLower.includes('philosopher') || qLower.includes('chopstick') || qLower.includes('dining')) {
        const p = CONCURRENCY_KNOWLEDGE_BASE.philosophers;
        replyHtml = `
          <h3>${p.title}</h3>
          <p>${p.summary}</p>
          ${this.formatMarkdown(p.deadlockCause)}
          ${this.formatMarkdown(p.solution)}
          <pre class="ai-code-block"><code>${this.escapeHtml(p.codeSnippet)}</code></pre>
        `;
      }
      // Check for Deadlock / AB-BA keywords
      else if (qLower.includes('deadlock') || qLower.includes('lock order') || qLower.includes('ab-ba') || qLower.includes('lock inversion')) {
        const a = CONCURRENCY_KNOWLEDGE_BASE.abba_deadlock;
        replyHtml = `
          <h3>${a.title}</h3>
          <p>${a.summary}</p>
          ${this.formatMarkdown(a.deadlockCause)}
          ${this.formatMarkdown(a.solution)}
          <pre class="ai-code-block"><code>${this.escapeHtml(a.codeSnippet)}</code></pre>
        `;
      }
      // Check for Race condition
      else if (qLower.includes('race') || qLower.includes('counter') || qLower.includes('critical section') || qLower.includes('atomic')) {
        const r = CONCURRENCY_KNOWLEDGE_BASE.race_condition;
        replyHtml = `
          <h3>${r.title}</h3>
          <p>${r.summary}</p>
          ${this.formatMarkdown(r.deadlockCause)}
          ${this.formatMarkdown(r.solution)}
          <pre class="ai-code-block"><code>${this.escapeHtml(r.codeSnippet)}</code></pre>
        `;
      }
      // Check for website / how to use / features
      else if (qLower.includes('website') || qLower.includes('how to use') || qLower.includes('how it works') || qLower.includes('feature') || qLower.includes('schedsim')) {
        const w = CONCURRENCY_KNOWLEDGE_BASE.website_guide;
        replyHtml = `
          <h3>${w.title}</h3>
          <p>${w.summary}</p>
          ${this.formatMarkdown(w.content)}
        `;
      }
      // General intelligent response
      else {
        replyHtml = `
          <p><strong>Prof. Pip's Analysis on:</strong> <em>"${this.escapeHtml(query)}"</em></p>
          <p>In concurrent computing, key synchronization bugs typically fall into three categories:</p>
          <ul>
            <li><strong>Deadlock:</strong> Threads mutually wait on each other in a circular chain. <em>Fix:</em> Impose a strict lock ordering hierarchy.</li>
            <li><strong>Race Conditions:</strong> Uncoordinated read-modify-write on shared state. <em>Fix:</em> Enforce mutual exclusion with mutexes (\`with lock:\`).</li>
            <li><strong>Starvation & Livelock:</strong> A thread never gets CPU time or actively repeats state changes without making forward progress.</li>
          </ul>
          <p>Would you like me to walk you through a specific example like the <strong>Dining Philosophers Problem</strong> or test code directly in the <strong><a href="app.html" style="color: var(--lock-a);">SchedSim Analyzer Workspace</a></strong>?</p>
        `;
      }

      this.appendBotMessage(replyHtml);
    });
  }

  appendUserMessage(text) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = 'ai-msg ai-msg-user';
    msg.innerHTML = `<div class="ai-msg-bubble"><p>${this.escapeHtml(text)}</p></div>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  appendBotMessage(html) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = 'ai-msg ai-msg-bot';
    msg.innerHTML = `<div class="ai-msg-bubble">${html}</div>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  showTypingIndicator(callback) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    const typing = document.createElement('div');
    typing.id = 'ai-typing-indicator';
    typing.className = 'ai-msg ai-msg-bot';
    typing.innerHTML = `
      <div class="ai-msg-bubble" style="display: flex; gap: 4px; align-items: center; padding: 8px 14px;">
        <span class="ai-dot"></span>
        <span class="ai-dot"></span>
        <span class="ai-dot"></span>
      </div>
    `;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;

    setTimeout(() => {
      typing.remove();
      callback();
    }, 450);
  }

  formatMarkdown(md) {
    if (!md) return '';
    let res = md.trim();
    // Headers
    res = res.replace(/### (.*?)\n/g, '<h4>$1</h4>');
    res = res.replace(/## (.*?)\n/g, '<h3>$1</h3>');
    // Bold & italic
    res = res.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    res = res.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    res = res.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
    // List items
    res = res.replace(/^\d+\.\s+(.*?)$/gm, '<li>$1</li>');
    res = res.replace(/^-\s+(.*?)$/gm, '<li>$1</li>');
    // Wrap lists
    res = res.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    // Paragraphs
    res = res.split('\n\n').map(p => {
      if (p.startsWith('<h') || p.startsWith('<ul>') || p.startsWith('<pre>')) return p;
      return `<p>${p}</p>`;
    }).join('');
    return res;
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const aiAgent = new AIAgent();
