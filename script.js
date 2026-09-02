(() => {
  const STORAGE_KEY = "focusFlow.v1";
  const CIRCUMFERENCE = 2 * Math.PI * 135;

  const MODES = {
    focus: { label: "Focus", colorStart: "#7c9eff", colorEnd: "#a78bfa" },
    short: { label: "Short Break", colorStart: "#6ee7b7", colorEnd: "#34d399" },
    long: { label: "Long Break", colorStart: "#fbbf24", colorEnd: "#f97316" },
  };

  const el = {
    modeTabs: document.getElementById("modeTabs"),
    ringProgress: document.getElementById("ringProgress"),
    timeDisplay: document.getElementById("timeDisplay"),
    activeTaskLabel: document.getElementById("activeTaskLabel"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    skipBtn: document.getElementById("skipBtn"),
    sessionDots: document.getElementById("sessionDots"),
    sessionsToday: document.getElementById("sessionsToday"),
    focusMinutesToday: document.getElementById("focusMinutesToday"),
    streakCount: document.getElementById("streakCount"),
    taskForm: document.getElementById("taskForm"),
    taskInput: document.getElementById("taskInput"),
    taskList: document.getElementById("taskList"),
    taskCount: document.getElementById("taskCount"),
    emptyState: document.getElementById("emptyState"),
    focusMinInput: document.getElementById("focusMinInput"),
    shortMinInput: document.getElementById("shortMinInput"),
    longMinInput: document.getElementById("longMinInput"),
  };

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const defaults = {
      tasks: [],
      activeTaskId: null,
      durations: { focus: 25, short: 5, long: 15 },
      sessionsCompleted: 0,
      history: {},
      streak: { count: 0, lastDate: null },
    };
    if (!raw) return defaults;
    try {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed, durations: { ...defaults.durations, ...(parsed.durations || {}) } };
    } catch {
      return defaults;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  let mode = "focus";
  let secondsLeft = state.durations.focus * 60;
  let totalSeconds = secondsLeft;
  let timerId = null;
  let isRunning = false;

  function fmtTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function setMode(newMode, { resetTime = true } = {}) {
    mode = newMode;
    document.querySelectorAll(".mode-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === newMode);
    });
    const cfg = MODES[newMode];
    document.documentElement.style.setProperty("--ring-color-1", cfg.colorStart);
    document.documentElement.style.setProperty("--ring-color-2", cfg.colorEnd);
    el.ringProgress.style.stroke = cfg.colorStart;

    if (resetTime) {
      pause();
      const minutes = state.durations[newMode];
      secondsLeft = minutes * 60;
      totalSeconds = secondsLeft;
      renderTime();
    }
  }

  function renderTime() {
    el.timeDisplay.textContent = fmtTime(secondsLeft);
    const progress = 1 - secondsLeft / totalSeconds;
    el.ringProgress.style.strokeDasharray = CIRCUMFERENCE;
    el.ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    document.title = isRunning ? `${fmtTime(secondsLeft)} · ${MODES[mode].label} — Focus Flow` : "Focus Flow";
  }

  function tick() {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      completeSession();
      return;
    }
    renderTime();
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    el.startBtn.textContent = "Pause";
    timerId = setInterval(tick, 1000);
  }

  function pause() {
    isRunning = false;
    el.startBtn.textContent = "Start";
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function toggleStart() {
    if (isRunning) pause();
    else start();
  }

  function reset() {
    pause();
    const minutes = state.durations[mode];
    secondsLeft = minutes * 60;
    totalSeconds = secondsLeft;
    renderTime();
  }

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.55);
      });
    } catch {
      /* audio not available */
    }
  }

  function completeSession() {
    pause();
    playChime();

    if (mode === "focus") {
      state.sessionsCompleted += 1;
      const key = todayKey();
      state.history[key] = state.history[key] || { sessions: 0, minutes: 0 };
      state.history[key].sessions += 1;
      state.history[key].minutes += state.durations.focus;

      if (state.activeTaskId) {
        const task = state.tasks.find((t) => t.id === state.activeTaskId);
        if (task) task.pomos = (task.pomos || 0) + 1;
      }

      bumpStreak();
      saveState();
      renderStats();
      renderTasks();

      const cycle = state.sessionsCompleted % 4;
      setMode(cycle === 0 ? "long" : "short");
    } else {
      saveState();
      setMode("focus");
    }

    renderSessionDots();
  }

  function bumpStreak() {
    const today = todayKey();
    if (state.streak.lastDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (state.streak.lastDate === yesterday) {
      state.streak.count += 1;
    } else {
      state.streak.count = 1;
    }
    state.streak.lastDate = today;
  }

  function renderStats() {
    const key = todayKey();
    const todayStats = state.history[key] || { sessions: 0, minutes: 0 };
    el.sessionsToday.textContent = todayStats.sessions;
    el.focusMinutesToday.textContent = todayStats.minutes;
    el.streakCount.textContent = state.streak.count;
  }

  function renderSessionDots() {
    const completedInCycle = state.sessionsCompleted % 4;
    el.sessionDots.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement("span");
      dot.className = "session-dot" + (i < completedInCycle ? " filled" : "");
      el.sessionDots.appendChild(dot);
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function addTask(text) {
    const task = { id: uid(), text: text.trim(), done: false, pomos: 0 };
    state.tasks.push(task);
    if (!state.activeTaskId) state.activeTaskId = task.id;
    saveState();
    renderTasks();
  }

  function toggleTaskDone(id) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    saveState();
    renderTasks();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    if (state.activeTaskId === id) {
      const next = state.tasks.find((t) => !t.done);
      state.activeTaskId = next ? next.id : null;
    }
    saveState();
    renderTasks();
  }

  function setActiveTask(id) {
    state.activeTaskId = id;
    saveState();
    renderTasks();
  }

  function renderTasks() {
    el.taskList.innerHTML = "";
    const leftCount = state.tasks.filter((t) => !t.done).length;
    el.taskCount.textContent = `${leftCount} left`;
    el.emptyState.classList.toggle("show", state.tasks.length === 0);

    state.tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "") + (task.id === state.activeTaskId ? " active" : "");

      const checkbox = document.createElement("button");
      checkbox.className = "task-checkbox";
      checkbox.type = "button";
      checkbox.textContent = task.done ? "✓" : "";
      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTaskDone(task.id);
      });

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      const pomos = document.createElement("span");
      pomos.className = "task-pomos";
      pomos.textContent = task.pomos ? "🍅".repeat(Math.min(task.pomos, 3)) + (task.pomos > 3 ? `+${task.pomos - 3}` : "") : "";

      const del = document.createElement("button");
      del.className = "task-delete";
      del.type = "button";
      del.textContent = "✕";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTask(task.id);
      });

      li.addEventListener("click", () => setActiveTask(task.id));

      li.append(checkbox, text, pomos, del);
      el.taskList.appendChild(li);
    });

    const activeTask = state.tasks.find((t) => t.id === state.activeTaskId);
    el.activeTaskLabel.textContent = activeTask ? activeTask.text : "No task selected";
  }

  function applyDurationInputs() {
    const focus = Math.max(1, parseInt(el.focusMinInput.value, 10) || 25);
    const short = Math.max(1, parseInt(el.shortMinInput.value, 10) || 5);
    const long = Math.max(1, parseInt(el.longMinInput.value, 10) || 15);
    state.durations = { focus, short, long };
    saveState();
    if (!isRunning) {
      secondsLeft = state.durations[mode] * 60;
      totalSeconds = secondsLeft;
      renderTime();
    }
  }

  el.modeTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".mode-tab");
    if (!btn) return;
    setMode(btn.dataset.mode);
  });

  el.startBtn.addEventListener("click", toggleStart);
  el.resetBtn.addEventListener("click", reset);
  el.skipBtn.addEventListener("click", () => {
    if (mode === "focus") {
      const cycle = (state.sessionsCompleted + 0) % 4;
      setMode(cycle === 3 ? "long" : "short");
    } else {
      setMode("focus");
    }
  });

  el.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = el.taskInput.value;
    if (!val.trim()) return;
    addTask(val);
    el.taskInput.value = "";
    el.taskInput.focus();
  });

  [el.focusMinInput, el.shortMinInput, el.longMinInput].forEach((input) => {
    input.addEventListener("change", applyDurationInputs);
  });

  el.focusMinInput.value = state.durations.focus;
  el.shortMinInput.value = state.durations.short;
  el.longMinInput.value = state.durations.long;

  setMode("focus");
  renderStats();
  renderTasks();
  renderSessionDots();
})();
