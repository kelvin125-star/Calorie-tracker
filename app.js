/* ============================================
   NutriFlow — Calorie Tracker (app.js)
   All logic: localStorage, UI, entries, charts
   ============================================ */

(function () {
  'use strict';

  // ==================== Constants ====================
  const STORAGE_KEYS = {
    ENTRIES: 'nutriflow_entries',
    SETTINGS: 'nutriflow_settings',
  };

  const MEAL_META = {
    breakfast: { emoji: '🌅', label: 'Breakfast' },
    lunch:    { emoji: '☀️', label: 'Lunch' },
    dinner:   { emoji: '🌙', label: 'Dinner' },
    snacks:   { emoji: '🍿', label: 'Snacks' },
  };

  const DEFAULT_SETTINGS = {
    calorieGoal: 2000,
    proteinGoal: 150,
    carbsGoal: 250,
    fatGoal: 65,
  };

  // ==================== State ====================
  let currentDate = todayStr();
  let settings = loadSettings();

  // ==================== Helpers ====================
  function todayStr() {
    return formatDateKey(new Date());
  }

  function formatDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDisplayDate(dateStr) {
    const d = parseLocalDate(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (dateStr === formatDateKey(today)) return 'Today';
    if (dateStr === formatDateKey(yesterday)) return 'Yesterday';

    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ==================== Storage ====================
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  function loadAllEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveAllEntries(all) {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(all));
  }

  function getEntriesForDate(dateStr) {
    const all = loadAllEntries();
    return all[dateStr] || [];
  }

  function setEntriesForDate(dateStr, entries) {
    const all = loadAllEntries();
    if (entries.length === 0) {
      delete all[dateStr];
    } else {
      all[dateStr] = entries;
    }
    saveAllEntries(all);
  }

  function addEntry(entry) {
    const entries = getEntriesForDate(currentDate);
    entries.push({ ...entry, id: uid(), createdAt: Date.now() });
    setEntriesForDate(currentDate, entries);
  }

  function updateEntry(id, updates) {
    const entries = getEntriesForDate(currentDate);
    const idx = entries.findIndex((e) => e.id === id);
    if (idx !== -1) {
      entries[idx] = { ...entries[idx], ...updates };
      setEntriesForDate(currentDate, entries);
    }
  }

  function deleteEntry(id) {
    let entries = getEntriesForDate(currentDate);
    entries = entries.filter((e) => e.id !== id);
    setEntriesForDate(currentDate, entries);
  }

  // ==================== DOM References ====================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    dateDisplay: $('#date-display'),
    prevDayBtn: $('#prev-day-btn'),
    nextDayBtn: $('#next-day-btn'),
    settingsBtn: $('#settings-btn'),
    addFab: $('#add-entry-fab'),

    calorieRing: $('#calorie-ring'),
    caloriesConsumed: $('#calories-consumed'),
    calorieGoalDisplay: $('#calorie-goal-display'),
    caloriesRemaining: $('#calories-remaining'),
    caloriesBurned: $('#calories-burned'),

    proteinValue: $('#protein-value'),
    carbsValue: $('#carbs-value'),
    fatValue: $('#fat-value'),
    proteinBar: $('#protein-bar'),
    carbsBar: $('#carbs-bar'),
    fatBar: $('#fat-bar'),
    proteinGoalText: $('#protein-goal-text'),
    carbsGoalText: $('#carbs-goal-text'),
    fatGoalText: $('#fat-goal-text'),

    weeklyChart: $('#weekly-chart'),
    weeklyLabels: $('#weekly-labels'),

    mealsSection: $('#meals-section'),

    entryModal: $('#entry-modal'),
    entryForm: $('#entry-form'),
    modalTitle: $('#modal-title'),
    modalClose: $('#modal-close'),
    entrySubmit: $('#entry-submit'),
    foodName: $('#food-name'),
    foodCalories: $('#food-calories'),
    foodServing: $('#food-serving'),
    foodProtein: $('#food-protein'),
    foodCarbs: $('#food-carbs'),
    foodFat: $('#food-fat'),
    entryId: $('#entry-id'),
    mealChips: $$('.meal-chip'),

    settingsModal: $('#settings-modal'),
    settingsForm: $('#settings-form'),
    settingsClose: $('#settings-close'),
    settingCalorieGoal: $('#setting-calorie-goal'),
    settingProteinGoal: $('#setting-protein-goal'),
    settingCarbsGoal: $('#setting-carbs-goal'),
    settingFatGoal: $('#setting-fat-goal'),
    clearTodayBtn: $('#clear-today-btn'),
    clearAllBtn: $('#clear-all-btn'),

    confirmModal: $('#confirm-modal'),
    confirmMessage: $('#confirm-message'),
    confirmCancel: $('#confirm-cancel'),
    confirmOk: $('#confirm-ok'),

    toastContainer: $('#toast-container'),
  };

  // ==================== Toast ====================
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
    };
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove());
    }, 2800);
  }

  // ==================== Confirm Dialog ====================
  let confirmCallback = null;

  function showConfirm(message, onConfirm) {
    dom.confirmMessage.textContent = message;
    dom.confirmModal.classList.add('active');
    dom.confirmModal.setAttribute('aria-hidden', 'false');
    confirmCallback = onConfirm;
  }

  dom.confirmCancel.addEventListener('click', () => {
    dom.confirmModal.classList.remove('active');
    dom.confirmModal.setAttribute('aria-hidden', 'true');
    confirmCallback = null;
  });

  dom.confirmOk.addEventListener('click', () => {
    dom.confirmModal.classList.remove('active');
    dom.confirmModal.setAttribute('aria-hidden', 'true');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  // ==================== Date Navigation ====================
  function navigateDate(offset) {
    const d = parseLocalDate(currentDate);
    d.setDate(d.getDate() + offset);
    currentDate = formatDateKey(d);
    renderAll();
  }

  dom.prevDayBtn.addEventListener('click', () => navigateDate(-1));
  dom.nextDayBtn.addEventListener('click', () => navigateDate(1));
  dom.dateDisplay.addEventListener('click', () => {
    currentDate = todayStr();
    renderAll();
  });

  // ==================== Settings ====================
  dom.settingsBtn.addEventListener('click', () => {
    dom.settingCalorieGoal.value = settings.calorieGoal;
    dom.settingProteinGoal.value = settings.proteinGoal;
    dom.settingCarbsGoal.value = settings.carbsGoal;
    dom.settingFatGoal.value = settings.fatGoal;
    openModal(dom.settingsModal);
  });

  dom.settingsClose.addEventListener('click', () => closeModal(dom.settingsModal));

  dom.settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    settings.calorieGoal = parseInt(dom.settingCalorieGoal.value) || DEFAULT_SETTINGS.calorieGoal;
    settings.proteinGoal = parseInt(dom.settingProteinGoal.value) || DEFAULT_SETTINGS.proteinGoal;
    settings.carbsGoal = parseInt(dom.settingCarbsGoal.value) || DEFAULT_SETTINGS.carbsGoal;
    settings.fatGoal = parseInt(dom.settingFatGoal.value) || DEFAULT_SETTINGS.fatGoal;
    saveSettings();
    closeModal(dom.settingsModal);
    renderAll();
    showToast('Settings saved!');
  });

  dom.clearTodayBtn.addEventListener('click', () => {
    showConfirm("Delete all of today's entries? This cannot be undone.", () => {
      setEntriesForDate(currentDate, []);
      closeModal(dom.settingsModal);
      renderAll();
      showToast("Today's entries cleared", 'info');
    });
  });

  dom.clearAllBtn.addEventListener('click', () => {
    showConfirm('Delete ALL data across all days? This cannot be undone.', () => {
      localStorage.removeItem(STORAGE_KEYS.ENTRIES);
      closeModal(dom.settingsModal);
      renderAll();
      showToast('All data cleared', 'info');
    });
  });

  // ==================== Entry Modal ====================
  let selectedMeal = 'breakfast';

  dom.addFab.addEventListener('click', () => {
    resetEntryForm();
    dom.modalTitle.textContent = 'Add Food';
    dom.entrySubmit.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Food`;
    openModal(dom.entryModal);
    dom.foodName.focus();
  });

  dom.modalClose.addEventListener('click', () => closeModal(dom.entryModal));

  dom.mealChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      dom.mealChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      selectedMeal = chip.dataset.meal;
    });
  });

  dom.entryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name: dom.foodName.value.trim(),
      calories: parseInt(dom.foodCalories.value) || 0,
      serving: dom.foodServing.value.trim(),
      protein: parseFloat(dom.foodProtein.value) || 0,
      carbs: parseFloat(dom.foodCarbs.value) || 0,
      fat: parseFloat(dom.foodFat.value) || 0,
      meal: selectedMeal,
    };

    if (!data.name) return;

    const editId = dom.entryId.value;
    if (editId) {
      updateEntry(editId, data);
      showToast('Entry updated!');
    } else {
      addEntry(data);
      showToast('Food added!');
    }

    closeModal(dom.entryModal);
    renderAll();
  });

  function resetEntryForm() {
    dom.entryForm.reset();
    dom.entryId.value = '';
    selectedMeal = 'breakfast';
    dom.mealChips.forEach((c) => c.classList.remove('active'));
    dom.mealChips[0].classList.add('active');
  }

  function openEditModal(entry) {
    dom.modalTitle.textContent = 'Edit Food';
    dom.entrySubmit.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
      Save Changes`;
    dom.foodName.value = entry.name;
    dom.foodCalories.value = entry.calories;
    dom.foodServing.value = entry.serving || '';
    dom.foodProtein.value = entry.protein || '';
    dom.foodCarbs.value = entry.carbs || '';
    dom.foodFat.value = entry.fat || '';
    dom.entryId.value = entry.id;
    selectedMeal = entry.meal || 'breakfast';
    dom.mealChips.forEach((c) => {
      c.classList.toggle('active', c.dataset.meal === selectedMeal);
    });
    openModal(dom.entryModal);
    dom.foodName.focus();
  }

  // ==================== Modal Helpers ====================
  function openModal(modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Close modals on overlay click
  [dom.entryModal, dom.settingsModal, dom.confirmModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [dom.entryModal, dom.settingsModal, dom.confirmModal].forEach((m) => {
        if (m.classList.contains('active')) closeModal(m);
      });
    }
  });

  // ==================== Rendering ====================
  function renderAll() {
    renderDateDisplay();
    renderSummary();
    renderWeeklyChart();
    renderMeals();
  }

  function renderDateDisplay() {
    dom.dateDisplay.textContent = formatDisplayDate(currentDate);

    // Disable next button if viewing today or future
    const today = todayStr();
    dom.nextDayBtn.disabled = currentDate >= today;
    dom.nextDayBtn.style.opacity = currentDate >= today ? '0.3' : '1';
  }

  function renderSummary() {
    const entries = getEntriesForDate(currentDate);
    const totals = entries.reduce(
      (acc, e) => {
        acc.calories += e.calories || 0;
        acc.protein += e.protein || 0;
        acc.carbs += e.carbs || 0;
        acc.fat += e.fat || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Calorie ring
    const pct = Math.min(totals.calories / settings.calorieGoal, 1);
    const circumference = 2 * Math.PI * 70; // r=70
    const offset = circumference * (1 - pct);
    dom.calorieRing.style.strokeDashoffset = offset;

    // Change ring color if over goal
    if (totals.calories > settings.calorieGoal) {
      dom.calorieRing.style.stroke = 'var(--accent-red)';
      dom.calorieRing.style.filter = 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))';
    } else {
      dom.calorieRing.style.stroke = '';
      dom.calorieRing.style.filter = '';
    }

    animateNumber(dom.caloriesConsumed, totals.calories);
    dom.calorieGoalDisplay.textContent = settings.calorieGoal;
    const remaining = Math.max(settings.calorieGoal - totals.calories, 0);
    dom.caloriesRemaining.textContent = remaining;
    dom.caloriesBurned.textContent = totals.calories;

    // Macros
    dom.proteinValue.textContent = Math.round(totals.protein);
    dom.carbsValue.textContent = Math.round(totals.carbs);
    dom.fatValue.textContent = Math.round(totals.fat);

    const pPct = Math.min((totals.protein / settings.proteinGoal) * 100, 100);
    const cPct = Math.min((totals.carbs / settings.carbsGoal) * 100, 100);
    const fPct = Math.min((totals.fat / settings.fatGoal) * 100, 100);

    dom.proteinBar.style.width = pPct + '%';
    dom.carbsBar.style.width = cPct + '%';
    dom.fatBar.style.width = fPct + '%';

    dom.proteinGoalText.textContent = settings.proteinGoal;
    dom.carbsGoalText.textContent = settings.carbsGoal;
    dom.fatGoalText.textContent = settings.fatGoal;
  }

  function animateNumber(el, target) {
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;
    const diff = target - current;
    const steps = 30;
    const stepVal = diff / steps;
    let step = 0;

    function tick() {
      step++;
      if (step >= steps) {
        el.textContent = target;
        return;
      }
      el.textContent = Math.round(current + stepVal * step);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderWeeklyChart() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const allEntries = loadAllEntries();
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let maxCal = settings.calorieGoal;

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const key = formatDateKey(d);
      const entries = allEntries[key] || [];
      const cal = entries.reduce((s, e) => s + (e.calories || 0), 0);
      if (cal > maxCal) maxCal = cal;
      days.push({ key, cal, name: dayNames[i], isToday: key === todayStr(), isCurrent: key === currentDate });
    }

    dom.weeklyChart.innerHTML = '';
    dom.weeklyLabels.innerHTML = '';

    days.forEach((day) => {
      const h = maxCal > 0 ? (day.cal / maxCal) * 100 : 0;

      const wrapper = document.createElement('div');
      wrapper.className = 'week-bar-wrapper';

      const calLabel = document.createElement('span');
      calLabel.className = 'week-bar-cal';
      calLabel.textContent = day.cal;

      const bar = document.createElement('div');
      bar.className = 'week-bar' + (day.isToday ? ' today' : '');
      bar.style.height = Math.max(h, 3) + '%';
      bar.title = `${day.name}: ${day.cal} kcal`;

      bar.addEventListener('click', () => {
        currentDate = day.key;
        renderAll();
      });

      wrapper.appendChild(calLabel);
      wrapper.appendChild(bar);
      dom.weeklyChart.appendChild(wrapper);

      const label = document.createElement('span');
      label.textContent = day.name;
      if (day.isToday) label.classList.add('today-label');
      dom.weeklyLabels.appendChild(label);
    });
  }

  function renderMeals() {
    const entries = getEntriesForDate(currentDate);
    dom.mealsSection.innerHTML = '';

    const mealOrder = ['breakfast', 'lunch', 'dinner', 'snacks'];

    mealOrder.forEach((mealKey, groupIndex) => {
      const meta = MEAL_META[mealKey];
      const mealEntries = entries.filter((e) => e.meal === mealKey);
      const totalCal = mealEntries.reduce((s, e) => s + (e.calories || 0), 0);

      const group = document.createElement('div');
      group.className = 'meal-group';
      group.style.animationDelay = `${groupIndex * 0.08}s`;

      group.innerHTML = `
        <div class="meal-group-header">
          <div class="meal-group-title">
            <span class="meal-emoji">${meta.emoji}</span>
            <h3>${meta.label}</h3>
          </div>
          <div class="meal-group-total"><span>${totalCal}</span> kcal</div>
        </div>
        <div class="meal-entries" id="entries-${mealKey}"></div>
      `;

      dom.mealsSection.appendChild(group);

      const entriesContainer = group.querySelector(`#entries-${mealKey}`);

      if (mealEntries.length === 0) {
        entriesContainer.innerHTML = `
          <div class="meal-empty">
            <div class="meal-empty-icon">🍽️</div>
            No entries yet
          </div>`;
      } else {
        mealEntries.forEach((entry, i) => {
          const card = document.createElement('div');
          card.className = 'entry-card';
          card.style.animationDelay = `${i * 0.05}s`;

          card.innerHTML = `
            <div class="entry-info">
              <div class="entry-name">${escapeHtml(entry.name)}</div>
              ${entry.serving ? `<div class="entry-serving">${escapeHtml(entry.serving)}</div>` : ''}
            </div>
            <div class="entry-macros">
              <div class="entry-macro">
                <span class="entry-macro-value">${Math.round(entry.protein || 0)}g</span>
                <span class="entry-macro-label">Protein</span>
              </div>
              <div class="entry-macro">
                <span class="entry-macro-value">${Math.round(entry.carbs || 0)}g</span>
                <span class="entry-macro-label">Carbs</span>
              </div>
              <div class="entry-macro">
                <span class="entry-macro-value">${Math.round(entry.fat || 0)}g</span>
                <span class="entry-macro-label">Fat</span>
              </div>
            </div>
            <div class="entry-calories">${entry.calories}<small> kcal</small></div>
            <div class="entry-actions">
              <button class="entry-action-btn edit" title="Edit" data-id="${entry.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              </button>
              <button class="entry-action-btn delete" title="Delete" data-id="${entry.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          `;

          // Edit handler
          card.querySelector('.edit').addEventListener('click', () => {
            openEditModal(entry);
          });

          // Delete handler
          card.querySelector('.delete').addEventListener('click', () => {
            showConfirm(`Delete "${entry.name}"?`, () => {
              deleteEntry(entry.id);
              renderAll();
              showToast('Entry deleted', 'info');
            });
          });

          entriesContainer.appendChild(card);
        });
      }
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== Keyboard Shortcut ====================
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N to add new entry
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      dom.addFab.click();
    }
  });

  // ==================== Init ====================
  renderAll();
})();
