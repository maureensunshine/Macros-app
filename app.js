// Macros — personal nutrition tracker
// Storage: localStorage (persists on this device, works offline)

const STORE = {
  FOODS: 'macros_foods',
  GOALS: 'macros_goals',
  logKey: (dateKey) => 'macros_log_' + dateKey,
};

const DEFAULT_GOALS = { cal: 1900, protein: 240, carbs: 150, fat: 70 };

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function round(n, d = 0) {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('Load failed for', key, e);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Save failed for', key, e);
    return false;
  }
}

// ---------- State ----------
const state = {
  foods: loadJSON(STORE.FOODS, []),
  goals: loadJSON(STORE.GOALS, DEFAULT_GOALS),
  currentDate: new Date(),
  log: [],
  showAddFood: false,
  showNewFood: false,
  showConverter: false,
  selectedFood: null,
  searchQuery: '',
  editingGoals: false,
  tempGoals: null,
  error: null,
};

function loadLogForCurrentDate() {
  state.log = loadJSON(STORE.logKey(todayKey(state.currentDate)), []);
}
loadLogForCurrentDate();

function persistFoods() { if (!saveJSON(STORE.FOODS, state.foods)) state.error = 'Could not save food. Try again.'; }
function persistGoals() { if (!saveJSON(STORE.GOALS, state.goals)) state.error = 'Could not save goals. Try again.'; }
function persistLog() { if (!saveJSON(STORE.logKey(todayKey(state.currentDate)), state.log)) state.error = 'Could not save log entry. Try again.'; }

function addFood(food) {
  const newFood = {
    id: 'f_' + Date.now(),
    name: food.name,
    servingLabel: food.servingLabel || '1 serving',
    cal: round(food.cal, 1),
    protein: round(food.protein, 1),
    carbs: round(food.carbs, 1),
    fat: round(food.fat, 1),
  };
  state.foods = [newFood, ...state.foods];
  persistFoods();
  return newFood;
}

function deleteFood(id) {
  state.foods = state.foods.filter(f => f.id !== id);
  persistFoods();
}

function logFood(food, multiplier) {
  const entry = {
    id: 'e_' + Date.now(),
    foodId: food.id,
    name: food.name,
    servingLabel: food.servingLabel,
    multiplier,
    cal: round(food.cal * multiplier, 1),
    protein: round(food.protein * multiplier, 1),
    carbs: round(food.carbs * multiplier, 1),
    fat: round(food.fat * multiplier, 1),
    loggedAt: Date.now(),
  };
  state.log = [...state.log, entry];
  persistLog();
}

function deleteLogEntry(id) {
  state.log = state.log.filter(e => e.id !== id);
  persistLog();
}

function getTotals() {
  return state.log.reduce((acc, e) => ({
    cal: acc.cal + e.cal,
    protein: acc.protein + e.protein,
    carbs: acc.carbs + e.carbs,
    fat: acc.fat + e.fat,
  }), { cal: 0, protein: 0, carbs: 0, fat: 0 });
}

function changeDate(delta) {
  const d = new Date(state.currentDate);
  d.setDate(d.getDate() + delta);
  state.currentDate = d;
  loadLogForCurrentDate();
  render();
}

// ---------- Icons (minimal inline SVG, no external deps) ----------
const ICONS = {
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="transform:rotate(-90deg)"><polyline points="6 9 12 15 18 9"/></svg>',
  flame: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0011 17a2.5 2.5 0 002.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7.5 7.5 0 1 1-15 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2 1.5z"/></svg>',
  edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  check: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
  beef: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 6.5c0 2-1 3.5-2.5 5l-7 7c-1 1-2.5 1-3.5 0-1-1-1-2.5 0-3.5l7-7c1.5-1.5 3-2.5 5-2.5z"/><circle cx="17" cy="7" r="3"/></svg>',
  wheat: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22v-9"/><path d="M9 11c0-3 1.5-5 3-7 1.5 2 3 4 3 7"/><path d="M7 15c0-2 1-3.5 2-5"/><path d="M17 15c0-2-1-3.5-2-5"/></svg>',
  droplet: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69s-5 5.5-5 9.5a5 5 0 0 0 10 0c0-4-5-9.5-5-9.5z"/></svg>',
  convert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
};

// ---------- Render ----------
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escapeHTML(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function macroBarHTML(label, value, goal, icon, color) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const over = value > goal;
  const displayVal = round(value, label === 'Calories' ? 0 : 1);
  const barColor = over ? '#C75D4D' : color;
  return `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:6px;color:${barColor};">
          ${icon}
          <span style="font-size:13px;color:#A8A29A;font-weight:500;">${label}</span>
        </div>
        <span class="mono" style="font-size:13px;color:${over ? '#C75D4D' : '#F0EDE6'};">
          ${displayVal}<span style="color:#6B655C;"> / ${goal}${label === 'Calories' ? '' : 'g'}</span>
        </span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${barColor};"></div></div>
    </div>`;
}

function render() {
  const app = document.getElementById('app');
  const dateKey = todayKey(state.currentDate);
  const isToday = todayKey() === dateKey;
  const totals = getTotals();

  let html = '';

  if (state.error) {
    html += `<div class="error-banner"><span>${state.error}</span><button class="iconbtn" id="dismiss-error">${ICONS.x}</button></div>`;
  }

  html += `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <button class="navbtn" id="prev-date">‹</button>
      <div style="text-align:center;">
        <div style="font-size:11px;color:#6B655C;letter-spacing:0.05em;text-transform:uppercase;">
          ${isToday ? 'Today' : state.currentDate.toLocaleDateString(undefined, { weekday: 'short' })}
        </div>
        <div style="font-size:15px;font-weight:600;color:#F0EDE6;">
          ${state.currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </div>
      </div>
      <button class="navbtn" id="next-date" ${isToday ? 'disabled' : ''}>›</button>
    </div>
  `;

  html += `<div class="card">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div class="mono" style="font-size:32px;font-weight:600;color:#F0EDE6;">
        ${round(totals.cal)}<span style="font-size:14px;color:#6B655C;font-weight:400;"> / ${state.goals.cal} cal</span>
      </div>
      <button class="iconbtn" id="toggle-edit-goals" style="color:${state.editingGoals ? '#E8A24B' : '#6B655C'};">
        ${state.editingGoals ? ICONS.check : ICONS.edit}
      </button>
    </div>`;

  if (state.editingGoals) {
    const g = state.tempGoals || state.goals;
    html += `<div style="display:flex;flex-direction:column;gap:10px;">`;
    ['cal', 'protein', 'carbs', 'fat'].forEach(key => {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:13px;color:#A8A29A;text-transform:capitalize;">${key === 'cal' ? 'Calories' : key}</span>
          <input type="number" class="field-input goal-input" data-key="${key}" value="${g[key]}" style="width:80px;">
        </div>`;
    });
    html += `</div>`;
  } else {
    html += macroBarHTML('Protein', totals.protein, state.goals.protein, ICONS.beef, '#E8A24B');
    html += macroBarHTML('Carbs', totals.carbs, state.goals.carbs, ICONS.wheat, '#6B8F71');
    html += macroBarHTML('Fat', totals.fat, state.goals.fat, ICONS.droplet, '#7FA8C9');
  }
  html += `</div>`;

  html += `<div style="margin-bottom:16px;">
      <div style="font-size:13px;color:#6B655C;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Logged</div>`;
  if (state.log.length === 0) {
    html += `<div class="empty-state">Nothing logged ${isToday ? 'today' : 'this day'} yet.</div>`;
  } else {
    state.log.slice().reverse().forEach(entry => {
      html += `<div class="logrow" data-entry-id="${entry.id}">
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;color:#F0EDE6;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(entry.name)}</div>
            <div style="font-size:12px;color:#6B655C;">${entry.multiplier !== 1 ? round(entry.multiplier, 2) + '× ' : ''}${escapeHTML(entry.servingLabel)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="text-align:right;">
              <div class="mono" style="font-size:14px;color:#E8A24B;">${round(entry.cal)} cal</div>
              <div style="font-size:11px;color:#6B655C;">P${round(entry.protein)} C${round(entry.carbs)} F${round(entry.fat)}</div>
            </div>
            <button class="iconbtn delete-entry-btn" data-id="${entry.id}">${ICONS.trash}</button>
          </div>
        </div>`;
    });
  }
  html += `</div>`;

  html += `<div style="display:flex;gap:10px;margin-top:auto;">
    <button class="addbtn" id="open-log-food" style="flex:1;">${ICONS.plus} Log food</button>
    <button class="addbtn" id="open-converter" style="flex:0 0 auto;padding:14px 16px;background:#2A2D2E;color:#E8A24B;border:1px solid #3A3D3E;">
      ${ICONS.convert} Convert
    </button>
  </div>`;

  app.innerHTML = html;
  attachMainListeners();
  renderModals();
}

function attachMainListeners() {
  document.getElementById('dismiss-error')?.addEventListener('click', () => { state.error = null; render(); });
  document.getElementById('prev-date')?.addEventListener('click', () => changeDate(-1));
  document.getElementById('next-date')?.addEventListener('click', () => changeDate(1));
  document.getElementById('open-log-food')?.addEventListener('click', () => { state.showAddFood = true; state.searchQuery = ''; render(); });
  document.getElementById('open-converter')?.addEventListener('click', () => { state.showConverter = true; render(); });

  document.getElementById('toggle-edit-goals')?.addEventListener('click', () => {
    if (state.editingGoals) {
      const inputs = document.querySelectorAll('.goal-input');
      const newGoals = { ...state.goals };
      inputs.forEach(inp => { newGoals[inp.dataset.key] = Number(inp.value) || 0; });
      state.goals = newGoals;
      persistGoals();
      state.editingGoals = false;
    } else {
      state.tempGoals = { ...state.goals };
      state.editingGoals = true;
    }
    render();
  });

  document.querySelectorAll('.delete-entry-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLogEntry(btn.dataset.id);
      render();
    });
  });
}

function renderModals() {
  const app = document.getElementById('app');

  if (state.showAddFood) {
    const filtered = state.foods.filter(f => f.name.toLowerCase().includes(state.searchQuery.toLowerCase()));
    const modal = el(`
      <div class="overlay" id="addfood-overlay">
        <div class="modal">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h2 style="font-size:17px;color:#F0EDE6;font-weight:600;">Log food</h2>
            <button class="iconbtn" id="close-addfood">${ICONS.x}</button>
          </div>
          <div style="position:relative;margin-bottom:12px;">
            <span style="position:absolute;left:12px;top:12px;color:#6B655C;">${ICONS.search}</span>
            <input id="food-search" class="field-input" placeholder="Search your foods..." style="padding-left:36px;height:40px;" value="${escapeHTML(state.searchQuery)}">
          </div>
          <button class="newfoodbtn" id="open-newfood">${ICONS.plus} Create new food</button>
          <div id="food-list"></div>
        </div>
      </div>
    `);
    app.appendChild(modal);

    const listEl = modal.querySelector('#food-list');
    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="empty-state">${state.foods.length === 0 ? 'No foods yet — create your first one.' : 'No matches. Try creating it.'}</div>`;
    } else {
      filtered.forEach(food => {
        const row = el(`
          <button class="foodrow" data-food-id="${food.id}">
            <div>
              <div style="font-size:14px;color:#F0EDE6;font-weight:500;">${escapeHTML(food.name)}</div>
              <div style="font-size:12px;color:#6B655C;">${escapeHTML(food.servingLabel)} · ${round(food.cal)} cal</div>
            </div>
            <span style="color:#6B655C;">${ICONS.chevron}</span>
          </button>
        `);
        row.addEventListener('click', () => {
          state.showAddFood = false;
          state.selectedFood = food;
          render();
        });
        listEl.appendChild(row);
      });
    }

    modal.querySelector('#close-addfood').addEventListener('click', () => { state.showAddFood = false; render(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) { state.showAddFood = false; render(); } });
    modal.querySelector('#open-newfood').addEventListener('click', () => { state.showAddFood = false; state.showNewFood = true; render(); });
    const searchInput = modal.querySelector('#food-search');
    searchInput.addEventListener('input', (e) => { state.searchQuery = e.target.value; render(); });
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
  }

  if (state.showConverter) {
    renderConverterModal();
  }

  if (state.showNewFood) {
    renderNewFoodModal();
  }

  if (state.selectedFood && !state.showNewFood) {
    renderLogQuantityModal();
  }
}

function renderNewFoodModal() {
  const app = document.getElementById('app');
  const pre = state._prefillFood || {};
  if (state._prefillFood) state._prefillFood = null;

  const modal = el(`
    <div class="overlay" id="newfood-overlay">
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="font-size:17px;color:#F0EDE6;font-weight:600;">Create food</h2>
          <button class="iconbtn" id="close-newfood">${ICONS.x}</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div><div class="label-sm">Food name</div><input id="nf-name" class="field-input" placeholder="e.g. Jennie-O turkey, cooked" value="${escapeHTML(pre.name || '')}"></div>
          <div><div class="label-sm">Serving size</div><input id="nf-serving" class="field-input" placeholder="e.g. 4oz cooked" value="${escapeHTML(pre.servingLabel || '')}"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div><div class="label-sm">Calories</div><input id="nf-cal" type="number" class="field-input" value="${pre.cal != null ? pre.cal : ''}"></div>
            <div><div class="label-sm">Protein (g)</div><input id="nf-protein" type="number" class="field-input" value="${pre.protein != null ? pre.protein : ''}"></div>
            <div><div class="label-sm">Carbs (g)</div><input id="nf-carbs" type="number" class="field-input" value="${pre.carbs != null ? pre.carbs : ''}"></div>
            <div><div class="label-sm">Fat (g)</div><input id="nf-fat" type="number" class="field-input" value="${pre.fat != null ? pre.fat : ''}"></div>
          </div>
          <div id="nf-error" style="font-size:12px;color:#C75D4D;display:none;">Fill in every field before saving.</div>
          <button class="primarybtn" id="nf-save">Save food</button>
        </div>
      </div>
    </div>
  `);
  app.appendChild(modal);

  const close = () => { state.showNewFood = false; render(); };
  modal.querySelector('#close-newfood').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  modal.querySelector('#nf-save').addEventListener('click', () => {
    const name = modal.querySelector('#nf-name').value.trim();
    const servingLabel = modal.querySelector('#nf-serving').value.trim();
    const cal = modal.querySelector('#nf-cal').value;
    const protein = modal.querySelector('#nf-protein').value;
    const carbs = modal.querySelector('#nf-carbs').value;
    const fat = modal.querySelector('#nf-fat').value;
    const valid = name && servingLabel && cal !== '' && protein !== '' && carbs !== '' && fat !== '';
    if (!valid) {
      modal.querySelector('#nf-error').style.display = 'block';
      return;
    }
    const newFood = addFood({ name, servingLabel, cal: Number(cal), protein: Number(protein), carbs: Number(carbs), fat: Number(fat) });
    state.showNewFood = false;
    state.selectedFood = newFood;
    render();
  });

  modal.querySelector('#nf-name').focus();
}

function renderLogQuantityModal() {
  const app = document.getElementById('app');
  const food = state.selectedFood;
  let multiplier = 1;

  function previewVals(m) {
    return {
      cal: round(food.cal * m),
      protein: round(food.protein * m, 1),
      carbs: round(food.carbs * m, 1),
      fat: round(food.fat * m, 1),
    };
  }

  const modal = el(`
    <div class="overlay" id="logqty-overlay">
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="font-size:17px;color:#F0EDE6;font-weight:600;">${escapeHTML(food.name)}</h2>
          <button class="iconbtn" id="close-logqty">${ICONS.x}</button>
        </div>
        <div style="font-size:13px;color:#6B655C;margin-bottom:16px;">
          Base: ${escapeHTML(food.servingLabel)} · ${round(food.cal)} cal, P${round(food.protein,1)} C${round(food.carbs,1)} F${round(food.fat,1)}
        </div>
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;color:#A8A29A;margin-bottom:8px;">How many servings?</div>
          <div style="display:flex;gap:8px;margin-bottom:10px;" id="mult-chips">
            ${[0.5, 1, 1.5, 2].map(m => `<button class="chip ${m === 1 ? 'active' : ''}" data-mult="${m}">${m}×</button>`).join('')}
          </div>
          <input id="mult-input" type="number" step="0.1" min="0.1" value="1" class="field-input">
        </div>
        <div style="background:#22262B;border-radius:10px;padding:14px;margin-bottom:16px;display:flex;justify-content:space-between;">
          <div class="mono" id="preview-cal" style="font-size:20px;color:#E8A24B;font-weight:600;">${round(food.cal)} cal</div>
          <div style="font-size:13px;color:#A8A29A;text-align:right;">
            <div id="preview-p">P ${round(food.protein,1)}g</div>
            <div id="preview-cf">C ${round(food.carbs,1)}g · F ${round(food.fat,1)}g</div>
          </div>
        </div>
        <button class="primarybtn" id="logqty-confirm">${ICONS.flame} Add to today's log</button>
        <div id="delete-zone" style="margin-top:10px;text-align:center;">
          <button id="delete-food-link" style="background:none;border:none;color:#C75D4D;font-size:12px;cursor:pointer;width:100%;">Delete this food</button>
        </div>
      </div>
    </div>
  `);
  app.appendChild(modal);

  const close = () => { state.selectedFood = null; render(); };
  modal.querySelector('#close-logqty').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  function updatePreview() {
    const p = previewVals(multiplier);
    modal.querySelector('#preview-cal').textContent = p.cal + ' cal';
    modal.querySelector('#preview-p').textContent = 'P ' + p.protein + 'g';
    modal.querySelector('#preview-cf').textContent = 'C ' + p.carbs + 'g · F ' + p.fat + 'g';
  }

  modal.querySelectorAll('[data-mult]').forEach(btn => {
    btn.addEventListener('click', () => {
      multiplier = Number(btn.dataset.mult);
      modal.querySelector('#mult-input').value = multiplier;
      modal.querySelectorAll('[data-mult]').forEach(b => b.classList.toggle('active', Number(b.dataset.mult) === multiplier));
      updatePreview();
    });
  });

  modal.querySelector('#mult-input').addEventListener('input', (e) => {
    multiplier = Math.max(0.1, Number(e.target.value) || 0);
    modal.querySelectorAll('[data-mult]').forEach(b => b.classList.toggle('active', Number(b.dataset.mult) === multiplier));
    updatePreview();
  });

  modal.querySelector('#logqty-confirm').addEventListener('click', () => {
    logFood(food, multiplier);
    state.selectedFood = null;
    render();
  });

  modal.querySelector('#delete-food-link').addEventListener('click', () => {
    const zone = modal.querySelector('#delete-zone');
    zone.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;justify-content:center;">
        <span style="font-size:12px;color:#A8A29A;">Delete permanently?</span>
        <button class="chip" id="confirm-delete-yes" style="background:#C75D4D;color:#1A1D1E;border-color:#C75D4D;">Yes, delete</button>
        <button class="chip" id="confirm-delete-no">Cancel</button>
      </div>`;
    zone.querySelector('#confirm-delete-yes').addEventListener('click', () => {
      deleteFood(food.id);
      state.selectedFood = null;
      render();
    });
    zone.querySelector('#confirm-delete-no').addEventListener('click', () => {
      state.selectedFood = null;
      render();
    });
  });
}

function renderConverterModal() {
  const app = document.getElementById('app');
  // Default loss ratio: 25% weight lost when cooking (raw → cooked multiplier = 1/0.75)
  const RATIO = 1 / 0.75;

  const modal = el(`
    <div class="overlay" id="converter-overlay">
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <h2 style="font-size:17px;color:#F0EDE6;font-weight:600;">Raw → Cooked</h2>
          <button class="iconbtn" id="close-converter">${ICONS.x}</button>
        </div>
        <div style="font-size:12px;color:#6B655C;margin-bottom:16px;">
          Enter the raw label numbers. Get cooked numbers back. Math handled — you're welcome.
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div><div class="label-sm">Raw serving size</div>
            <select id="cv-serving" class="field-input" style="width:100%;cursor:pointer;">
              <option value="112">4 oz (112g)</option>
              <option value="85">3 oz (85g)</option>
              <option value="100">100g</option>
              <option value="140">5 oz (140g)</option>
              <option value="custom">Custom (g)</option>
            </select>
          </div>
          <div id="cv-custom-wrap" style="display:none;">
            <div class="label-sm">Custom grams</div>
            <input id="cv-custom-g" type="number" class="field-input" style="width:100%;" placeholder="g">
          </div>
        </div>

        <div style="font-size:12px;color:#6B655C;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Raw label values (per serving above)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <div><div class="label-sm">Calories</div><input id="cv-cal" type="number" class="field-input" style="width:100%;" placeholder="e.g. 120"></div>
          <div><div class="label-sm">Protein (g)</div><input id="cv-protein" type="number" class="field-input" style="width:100%;" placeholder="e.g. 28"></div>
          <div><div class="label-sm">Carbs (g)</div><input id="cv-carbs" type="number" class="field-input" style="width:100%;" placeholder="e.g. 0"></div>
          <div><div class="label-sm">Fat (g)</div><input id="cv-fat" type="number" class="field-input" style="width:100%;" placeholder="e.g. 1"></div>
        </div>

        <button class="primarybtn" id="cv-calc" style="margin-bottom:14px;">${ICONS.convert} Convert</button>

        <div id="cv-result" style="display:none;">
          <div style="font-size:12px;color:#6B655C;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Cooked values (per 4oz cooked)</div>
          <div style="background:#22262B;border-radius:10px;padding:14px;margin-bottom:12px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div>
                <div style="font-size:11px;color:#6B655C;">Calories</div>
                <div class="mono" id="cv-out-cal" style="font-size:20px;color:#E8A24B;font-weight:600;"></div>
              </div>
              <div>
                <div style="font-size:11px;color:#6B655C;">Protein</div>
                <div class="mono" id="cv-out-protein" style="font-size:20px;color:#E8A24B;font-weight:600;"></div>
              </div>
              <div>
                <div style="font-size:11px;color:#6B655C;">Carbs</div>
                <div class="mono" id="cv-out-carbs" style="font-size:18px;color:#F0EDE6;font-weight:500;"></div>
              </div>
              <div>
                <div style="font-size:11px;color:#6B655C;">Fat</div>
                <div class="mono" id="cv-out-fat" style="font-size:18px;color:#F0EDE6;font-weight:500;"></div>
              </div>
            </div>
          </div>
          <button class="primarybtn" id="cv-use-these">Use these → Create food entry</button>
        </div>
      </div>
    </div>
  `);
  app.appendChild(modal);

  const close = () => { state.showConverter = false; render(); };
  modal.querySelector('#close-converter').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Show/hide custom gram input
  modal.querySelector('#cv-serving').addEventListener('change', (e) => {
    modal.querySelector('#cv-custom-wrap').style.display = e.target.value === 'custom' ? 'block' : 'none';
  });

  let cookedVals = null;

  modal.querySelector('#cv-calc').addEventListener('click', () => {
    const servingEl = modal.querySelector('#cv-serving');
    const rawG = servingEl.value === 'custom'
      ? Number(modal.querySelector('#cv-custom-g').value) || 112
      : Number(servingEl.value);

    const rawCal = Number(modal.querySelector('#cv-cal').value) || 0;
    const rawProtein = Number(modal.querySelector('#cv-protein').value) || 0;
    const rawCarbs = Number(modal.querySelector('#cv-carbs').value) || 0;
    const rawFat = Number(modal.querySelector('#cv-fat').value) || 0;

    // Nutrients stay the same; weight drops ~25%, so per same weight cooked = raw ÷ 0.75
    cookedVals = {
      cal: round(rawCal * RATIO),
      protein: round(rawProtein * RATIO, 1),
      carbs: round(rawCarbs * RATIO, 1),
      fat: round(rawFat * RATIO, 1),
      servingLabel: '4oz cooked',
    };

    modal.querySelector('#cv-out-cal').textContent = cookedVals.cal + ' cal';
    modal.querySelector('#cv-out-protein').textContent = cookedVals.protein + 'g';
    modal.querySelector('#cv-out-carbs').textContent = cookedVals.carbs + 'g';
    modal.querySelector('#cv-out-fat').textContent = cookedVals.fat + 'g';
    modal.querySelector('#cv-result').style.display = 'block';
  });

  modal.querySelector('#cv-use-these')?.addEventListener('click', () => {
    if (!cookedVals) return;
    state.showConverter = false;
    state.showNewFood = true;
    state._prefillFood = cookedVals;
    render();
  });
}

// Initial render
render();

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed', err));
  });
}
