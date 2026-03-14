// Simple localStorage helpers
const STORAGE_KEYS = {
  USERS: "fitnova_users",
  ACTIVE_USER: "fitnova_active_user",
  THEME: "fitnova_theme",
};

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getActiveUserId() {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
}

function setActiveUserId(id) {
  if (id) localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, id);
  else localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
}

function findUserByLogin(identifier, password) {
  const users = loadUsers();
  return users.find(
    (u) =>
      (u.emailOrPhone === identifier || u.username === identifier) &&
      u.password === password
  );
}

function findUserById(id) {
  const users = loadUsers();
  return users.find((u) => u.id === id);
}

function updateUser(updated) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === updated.id);
  if (idx !== -1) {
    users[idx] = updated;
    saveUsers(users);
  }
}

// Theme
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEYS.THEME);
  if (stored === "light" || stored === "dark") {
    applyTheme(stored);
  } else {
    applyTheme("dark");
  }
}

// Auth pages logic (login.html / register.html)
function initAuthPage(type) {
  initTheme();

  const form = document.querySelector("form[data-auth-form]");
  const errorEl = document.querySelector("[data-auth-error]");
  const themeToggle = document.querySelector("[data-theme-toggle]");

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (errorEl) errorEl.textContent = "";

    if (type === "login") {
      const identifier = form.querySelector("[name='identifier']").value.trim();
      const password = form.querySelector("[name='password']").value.trim();

      if (!identifier || !password) {
        if (errorEl) errorEl.textContent = "Enter your email/phone and password.";
        return;
      }

      const user = findUserByLogin(identifier, password);
      if (!user) {
        if (errorEl) errorEl.textContent = "Invalid credentials.";
        return;
      }

      setActiveUserId(user.id);
      window.location.href = "app.html";
    }

    if (type === "register") {
      const fullName = form.querySelector("[name='fullName']").value.trim();
      const username = form.querySelector("[name='username']").value.trim();
      const emailOrPhone = form.querySelector("[name='emailOrPhone']").value.trim();
      const password = form.querySelector("[name='password']").value.trim();

      if (!fullName || !username || !emailOrPhone || !password) {
        if (errorEl) errorEl.textContent = "Fill in all required fields.";
        return;
      }

      const users = loadUsers();
      if (users.some((u) => u.username === username)) {
        if (errorEl) errorEl.textContent = "Username already taken.";
        return;
      }

      const id = "user_" + Date.now();
      const newUser = {
        id,
        fullName,
        username,
        emailOrPhone,
        password,
        avatarUrl: "",
        theme: localStorage.getItem(STORAGE_KEYS.THEME) || "dark",
        workouts: [],
        goals: [],
        sessions: [],
        notifications: {
          workoutAlerts: false,
          dailyReminder: false,
        },
      };

      users.push(newUser);
      saveUsers(users);
      setActiveUserId(id);
      window.location.href = "app.html";
    }
  });
}

// App (app.html)
let appState = {
  user: null,
};

function requireAuth() {
  const id = getActiveUserId();
  if (!id) {
    window.location.href = "login.html";
    return null;
  }
  const user = findUserById(id);
  if (!user) {
    setActiveUserId(null);
    window.location.href = "login.html";
    return null;
  }
  return user;
}

function initApp() {
  initTheme();
  const user = requireAuth();
  if (!user) return;
  appState.user = user;

  // Apply user theme preference if stored
  if (user.theme) {
    applyTheme(user.theme);
  }

  bindSidebar();
  bindThemeToggle();
  bindLogout();
  renderUserBadge();
  initPages();
  switchPage("dashboard");
}

function bindSidebar() {
  const items = document.querySelectorAll("[data-nav]");
  items.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-nav");
      items.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      switchPage(target);
    });
  });
}

function bindThemeToggle() {
  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    if (appState.user) {
      appState.user.theme = next;
      updateUser(appState.user);
    }
  });
}

function bindLogout() {
  const logout = document.querySelector("[data-logout]");
  if (!logout) return;
  logout.addEventListener("click", () => {
    setActiveUserId(null);
    window.location.href = "login.html";
  });
}

function renderUserBadge() {
  const nameEl = document.querySelector("[data-user-name]");
  const handleEl = document.querySelector("[data-user-handle]");
  const avatarEl = document.querySelector("[data-user-avatar]");

  if (nameEl) nameEl.textContent = appState.user.fullName || appState.user.username;
  if (handleEl) handleEl.textContent = "@" + appState.user.username;
  if (avatarEl) {
    if (appState.user.avatarUrl) {
      avatarEl.style.backgroundImage = `url("${appState.user.avatarUrl}")`;
    } else {
      avatarEl.style.backgroundImage = "none";
    }
  }
}

function switchPage(pageId) {
  const pages = document.querySelectorAll(".app-page");
  pages.forEach((p) => p.classList.remove("active"));
  const target = document.querySelector(`[data-page='${pageId}']`);
  if (target) target.classList.add("active");

  if (pageId === "dashboard") renderDashboard();
  if (pageId === "workouts") renderWorkouts();
  if (pageId === "goals") renderGoals();
  if (pageId === "history") renderHistory();
  if (pageId === "settings") renderSettings();
}

/* DASHBOARD */

function renderDashboard() {
  const totalWorkoutsEl = document.querySelector("[data-stat-total-workouts]");
  const activeMinutesEl = document.querySelector("[data-stat-active-minutes]");
  const streakEl = document.querySelector("[data-stat-streak]");
  const activeGoalsEl = document.querySelector("[data-stat-active-goals]");
  const recentList = document.querySelector("[data-dashboard-recent]");
  const topGoalEl = document.querySelector("[data-dashboard-top-goal]");
  const chartBars = document.querySelectorAll("[data-chart-day]");

  const sessions = appState.user.sessions || [];
  const goals = appState.user.goals || [];

  const totalWorkouts = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const activeGoals = goals.length;

  const today = new Date();
  let streak = 0;
  let dayCursor = new Date(today);

  while (true) {
    const dayKey = dayCursor.toISOString().slice(0, 10);
    const hasSession = sessions.some((s) => s.dateKey === dayKey);
    if (hasSession) {
      streak += 1;
      dayCursor.setDate(dayCursor.getDate() - 1);
    } else {
      break;
    }
  }

  if (totalWorkoutsEl) totalWorkoutsEl.textContent = totalWorkouts;
  if (activeMinutesEl) activeMinutesEl.textContent = totalMinutes + " min";
  if (streakEl) streakEl.textContent = streak + " days";
  if (activeGoalsEl) activeGoalsEl.textContent = activeGoals;

  if (recentList) {
    recentList.innerHTML = "";
    const recent = [...sessions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
    if (recent.length === 0) {
      const empty = document.createElement("div");
      empty.className = "list-item-meta";
      empty.textContent = "No recent sessions yet.";
      recentList.appendChild(empty);
    } else {
      recent.forEach((s) => {
        const item = document.createElement("div");
        item.className = "list-item";
        const main = document.createElement("div");
        main.className = "list-item-main";
        const title = document.createElement("div");
        title.className = "list-item-title";
        title.textContent = s.workoutName || "Session";
        const meta = document.createElement("div");
        meta.className = "list-item-meta";
        const date = new Date(s.timestamp);
        meta.textContent =
          date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }) +
          " • " +
          (s.durationMinutes || 0) +
          " min";
        main.appendChild(title);
        main.appendChild(meta);
        const tag = document.createElement("div");
        tag.className = "list-item-tag";
        tag.textContent = "Logged";
        item.appendChild(main);
        item.appendChild(tag);
        recentList.appendChild(item);
      });
    }
  }

  if (topGoalEl) {
    topGoalEl.textContent = goals.length ? goals[0].title : "No goals yet";
  }

  if (chartBars.length) {
    const weekMinutes = [0, 0, 0, 0, 0, 0, 0]; // Sat..Fri
    sessions.forEach((s) => {
      const d = new Date(s.timestamp);
      const day = d.getDay(); // 0=Sun
      const idx = (day + 6) % 7; // Sat=0
      weekMinutes[idx] += s.durationMinutes || 0;
    });
    const max = Math.max(...weekMinutes, 1);
    chartBars.forEach((bar, idx) => {
      const fill = bar.querySelector(".chart-bar-fill");
      const pct = (weekMinutes[idx] / max) * 100;
      fill.style.height = pct + "%";
    });
  }
}

/* WORKOUTS */

function renderWorkouts() {
  const empty = document.querySelector("[data-workouts-empty]");
  const list = document.querySelector("[data-workouts-list]");
  const createBtn = document.querySelector("[data-workouts-create]");
  const createFirstBtn = document.querySelector("[data-workouts-create-first]");
  const createSection = document.querySelector("[data-page='create-workout']");
  const workoutsPage = document.querySelector("[data-page='workouts']");

  if (createBtn) {
    createBtn.onclick = () => {
      workoutsPage.classList.remove("active");
      createSection.classList.add("active");
      initCreateWorkoutForm();
    };
  }
  if (createFirstBtn) {
    createFirstBtn.onclick = () => {
      workoutsPage.classList.remove("active");
      createSection.classList.add("active");
      initCreateWorkoutForm();
    };
  }

  const workouts = appState.user.workouts || [];
  if (!list || !empty) return;

  if (workouts.length === 0) {
    empty.style.display = "block";
    list.innerHTML = "";
  } else {
    empty.style.display = "none";
    list.innerHTML = "";
    workouts.forEach((w) => {
      const item = document.createElement("div");
      item.className = "list-item";
      const main = document.createElement("div");
      main.className = "list-item-main";
      const title = document.createElement("div");
      title.className = "list-item-title";
      title.textContent = w.title;
      const meta = document.createElement("div");
      meta.className = "list-item-meta";
      meta.textContent = `${w.exercises.length} exercises`;
      main.appendChild(title);
      main.appendChild(meta);
      const tag = document.createElement("div");
      tag.className = "list-item-tag";
      tag.textContent = "Routine";
      item.appendChild(main);
      item.appendChild(tag);
      list.appendChild(item);
    });
  }
}

function initCreateWorkoutForm() {
  const form = document.querySelector("[data-create-workout-form]");
  const addExerciseBtn = document.querySelector("[data-add-exercise]");
  const rowsContainer = document.querySelector("[data-exercise-rows]");
  const backBtn = document.querySelector("[data-create-workout-back]");

  if (!form || !addExerciseBtn || !rowsContainer) return;

  rowsContainer.innerHTML = "";
  addExerciseRow(rowsContainer);

  addExerciseBtn.onclick = () => addExerciseRow(rowsContainer);

  if (backBtn) {
    backBtn.onclick = () => {
      document.querySelector("[data-page='create-workout']").classList.remove("active");
      document.querySelector("[data-page='workouts']").classList.add("active");
      renderWorkouts();
    };
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const title = form.querySelector("[name='workoutTitle']").value.trim();
    const description = form
      .querySelector("[name='workoutDescription']")
      .value.trim();

    if (!title) return;

    const exercises = [];
    rowsContainer.querySelectorAll(".exercise-row").forEach((row) => {
      const name = row.querySelector("[data-ex-name]").value.trim();
      const sets = parseInt(row.querySelector("[data-ex-sets]").value, 10) || 0;
      const reps = parseInt(row.querySelector("[data-ex-reps]").value, 10) || 0;
      const weight = row.querySelector("[data-ex-weight]").value.trim();
      if (!name) return;
      exercises.push({ name, sets, reps, weight });
    });

    const workout = {
      id: "w_" + Date.now(),
      title,
      description,
      exercises,
    };

    appState.user.workouts = appState.user.workouts || [];
    appState.user.workouts.push(workout);
    updateUser(appState.user);

    document.querySelector("[data-page='create-workout']").classList.remove("active");
    document.querySelector("[data-page='workouts']").classList.add("active");
    renderWorkouts();
  };
}

function addExerciseRow(container) {
  const row = document.createElement("div");
  row.className = "exercise-row";
  row.innerHTML = `
    <input class="form-input" data-ex-name placeholder="Exercise name" />
    <input class="form-input" data-ex-sets type="number" min="1" placeholder="Sets" />
    <input class="form-input" data-ex-reps type="number" min="1" placeholder="Reps" />
    <input class="form-input" data-ex-weight placeholder="Weight" />
    <button type="button" class="exercise-remove">×</button>
  `;
  row.querySelector(".exercise-remove").onclick = () => {
    container.removeChild(row);
  };
  container.appendChild(row);
}

/* GOALS */

function renderGoals() {
  const empty = document.querySelector("[data-goals-empty]");
  const list = document.querySelector("[data-goals-list]");
  const setBtn = document.querySelector("[data-goals-set]");
  const setFirstBtn = document.querySelector("[data-goals-set-first]");
  const modal = document.querySelector("[data-goal-modal]");
  const modalOverlay = document.querySelector("[data-goal-modal-overlay]");
  const modalClose = document.querySelector("[data-goal-modal-close]");
  const modalForm = document.querySelector("[data-goal-form]");

  const openModal = () => {
    modal.classList.add("active");
    modalOverlay.classList.add("active");
  };
  const closeModal = () => {
    modal.classList.remove("active");
    modalOverlay.classList.remove("active");
  };

  if (setBtn) setBtn.onclick = openModal;
  if (setFirstBtn) setFirstBtn.onclick = openModal;
  if (modalClose) modalClose.onclick = closeModal;
  if (modalOverlay) modalOverlay.onclick = closeModal;

  if (modalForm) {
    modalForm.onsubmit = (e) => {
      e.preventDefault();
      const title = modalForm.querySelector("[name='goalTitle']").value.trim();
      const description = modalForm
        .querySelector("[name='goalDescription']")
        .value.trim();
      const targetValue = parseFloat(
        modalForm.querySelector("[name='goalTarget']").value
      );
      const unit = modalForm.querySelector("[name='goalUnit']").value.trim();

      if (!title || isNaN(targetValue)) return;

      const goal = {
        id: "g_" + Date.now(),
        title,
        description,
        targetValue,
        unit,
        currentValue: 0,
      };

      appState.user.goals = appState.user.goals || [];
      appState.user.goals.push(goal);
      updateUser(appState.user);
      closeModal();
      renderGoals();
      renderDashboard();
    };
  }

  const goals = appState.user.goals || [];
  if (!list || !empty) return;

  if (goals.length === 0) {
    empty.style.display = "block";
    list.innerHTML = "";
  } else {
    empty.style.display = "none";
    list.innerHTML = "";
    goals.forEach((g) => {
      const item = document.createElement("div");
      item.className = "list-item";
      const main = document.createElement("div");
      main.className = "list-item-main";
      const title = document.createElement("div");
      title.className = "list-item-title";
      title.textContent = g.title;
      const meta = document.createElement("div");
      meta.className = "list-item-meta";
      const pct = Math.round(
        (g.currentValue / Math.max(g.targetValue, 1)) * 100
      );
      meta.textContent = `${g.currentValue}/${g.targetValue} ${g.unit} • ${pct}%`;
      main.appendChild(title);
      main.appendChild(meta);
      const tag = document.createElement("div");
      tag.className = "list-item-tag";
      tag.textContent = pct >= 100 ? "Completed" : "In progress";
      item.appendChild(main);
      item.appendChild(tag);
      list.appendChild(item);
    });
  }
}

/* HISTORY */

function renderHistory() {
  const summaryTotal = document.querySelector("[data-history-total]");
  const summaryHours = document.querySelector("[data-history-hours]");
  const summaryAvg = document.querySelector("[data-history-avg]");
  const list = document.querySelector("[data-history-list]");

  const sessions = appState.user.sessions || [];
  const total = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const avg = total ? Math.round(totalMinutes / total) : 0;
  const hours = Math.floor(totalMinutes / 60);

  if (summaryTotal) summaryTotal.textContent = total;
  if (summaryHours) summaryHours.textContent = hours + "h";
  if (summaryAvg) summaryAvg.textContent = avg + "m";

  if (!list) return;
  list.innerHTML = "";

  if (sessions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "list-item-meta";
    empty.textContent = "No sessions logged yet.";
    list.appendChild(empty);
    return;
  }

  const byMonth = {};
  sessions.forEach((s) => {
    const d = new Date(s.timestamp);
    const key =
      d.toLocaleString(undefined, { month: "long" }) + " " + d.getFullYear();
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(s);
  });

  Object.keys(byMonth)
    .sort((a, b) => {
      const [ma, ya] = a.split(" ");
      const [mb, yb] = b.split(" ");
      return new Date(ma + " 1, " + ya) - new Date(mb + " 1, " + yb);
    })
    .forEach((monthKey) => {
      const label = document.createElement("div");
      label.className = "history-month-label";
      label.textContent = monthKey;
      list.appendChild(label);

      byMonth[monthKey]
        .sort((a, b) => b.timestamp - a.timestamp)
        .forEach((s) => {
          const item = document.createElement("div");
          item.className = "list-item";
          const main = document.createElement("div");
          main.className = "list-item-main";
          const title = document.createElement("div");
          title.className = "list-item-title";
          title.textContent = s.workoutName || "Session";
          const meta = document.createElement("div");
          meta.className = "list-item-meta";
          const d = new Date(s.timestamp);
          meta.textContent =
            d.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            }) +
            " • " +
            (s.durationMinutes || 0) +
            " min";
          main.appendChild(title);
          main.appendChild(meta);
          const tag = document.createElement("div");
          tag.className = "list-item-tag";
          tag.textContent = "Logged";
          item.appendChild(main);
          item.appendChild(tag);
          list.appendChild(item);
        });
    });
}

/* SETTINGS */

function renderSettings() {
  const avatarLarge = document.querySelector("[data-settings-avatar]");
  const avatarInput = document.querySelector("[name='avatarUrl']");
  const fullNameInput = document.querySelector("[name='settingsFullName']");
  const usernameInput = document.querySelector("[name='settingsUsername']");
  const saveBtn = document.querySelector("[data-settings-save]");
  const notifWorkout = document.querySelector("[name='notifWorkout']");
  const notifDaily = document.querySelector("[name='notifDaily']");

  if (avatarLarge) {
    if (appState.user.avatarUrl) {
      avatarLarge.style.backgroundImage = `url("${appState.user.avatarUrl}")`;
    } else {
      avatarLarge.style.backgroundImage = "none";
    }
  }
  if (avatarInput) avatarInput.value = appState.user.avatarUrl || "";
  if (fullNameInput) fullNameInput.value = appState.user.fullName || "";
  if (usernameInput) usernameInput.value = appState.user.username || "";

  if (notifWorkout)
    notifWorkout.checked = !!appState.user.notifications?.workoutAlerts;
  if (notifDaily)
    notifDaily.checked = !!appState.user.notifications?.dailyReminder;

  if (saveBtn) {
    saveBtn.onclick = () => {
      if (fullNameInput) appState.user.fullName = fullNameInput.value.trim();
      if (usernameInput) appState.user.username = usernameInput.value.trim();
      if (avatarInput) appState.user.avatarUrl = avatarInput.value.trim();

      appState.user.notifications = appState.user.notifications || {};
      if (notifWorkout)
        appState.user.notifications.workoutAlerts = notifWorkout.checked;
      if (notifDaily)
        appState.user.notifications.dailyReminder = notifDaily.checked;

      updateUser(appState.user);
      renderUserBadge();
      renderDashboard();
      tryRequestNotifications();
    };
  }
}

/* Notifications (basic) */

function tryRequestNotifications() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") return;
  Notification.requestPermission();
}

// Expose initializers
window.FitNova = {
  initAuthPage,
  initApp,
};
