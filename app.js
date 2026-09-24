// ==================== Хранилище ====================
const STORAGE_KEY = 'budget_pwa_v1';

let state = {
  incomes: [],
  expenses: [],
  incomeCategories: [],
  expenseCategories: [],
  nextId: 1
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state = Object.assign(state, parsed);
    } catch (e) { console.error('Ошибка загрузки:', e); }
  }
  if (!state.nextId || state.nextId < 1) state.nextId = 1;
  saveState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextId() {
  const id = state.nextId;
  state.nextId += 1;
  saveState();
  return id;
}

// ==================== Утилиты ====================
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function dateMinusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtMoney(n) {
  return n.toFixed(2).replace('.', ',') + ' ₽';
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ==================== Навигация ====================
let currentScreen = 'incomes';
let statsPeriod = 'month';
let categoryTab = 'income';

const titles = {
  incomes: 'Доходы',
  expenses: 'Расходы',
  categories: 'Категории',
  stats: 'Статистика'
};

function switchScreen(name) {
  currentScreen = name;
  document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.id === 'screen-' + name));
  document.getElementById('screen-title').textContent = titles[name];
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
  renderCurrent();
}

function renderCurrent() {
  if (currentScreen === 'incomes') renderIncomeScreen();
  else if (currentScreen === 'expenses') renderExpenseScreen();
  else if (currentScreen === 'categories') renderCategoryScreen();
  else if (currentScreen === 'stats') renderStatsScreen();
}

// ==================== Доходы ====================
function renderIncomeScreen() {
  const sel = document.getElementById('income-category');
  const prev = sel.value;
  if (state.incomeCategories.length === 0) {
    sel.innerHTML = '<option value="">— Нет категорий —</option>';
  } else {
    sel.innerHTML = '<option value="">— Без категории —</option>' +
      state.incomeCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  }
  if (prev) sel.value = prev;

  const list = document.getElementById('income-list');
  const items = [...state.incomes].sort((a, b) => {
    const c = b.date.localeCompare(a.date);
    return c !== 0 ? c : b.id - a.id;
  });
  if (items.length === 0) {
    list.innerHTML = '<p class="empty">Пока нет доходов</p>';
    return;
  }
  list.innerHTML = items.map(it => {
    const cat = state.incomeCategories.find(c => c.id === it.categoryId);
    const catName = cat ? cat.name : 'Без категории';
    return `
      <div class="item">
        <div class="item-main">
          <div class="item-amount income">+ ${fmtMoney(it.amount)}</div>
          <div class="item-meta">${fmtDate(it.date)} · ${escapeHtml(catName)}</div>
          ${it.note ? `<div class="item-note">${escapeHtml(it.note)}</div>` : ''}
        </div>
        <button class="delete-btn" data-id="${it.id}">✕</button>
      </div>`;
  }).join('');
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete('income', Number(btn.dataset.id)));
  });
}

// ==================== Расходы ====================
function renderExpenseScreen() {
  const sel = document.getElementById('expense-category');
  const prev = sel.value;
  if (state.expenseCategories.length === 0) {
    sel.innerHTML = '<option value="">— Нет категорий —</option>';
  } else {
    sel.innerHTML = '<option value="">— Без категории —</option>' +
      state.expenseCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  }
  if (prev) sel.value = prev;

  const list = document.getElementById('expense-list');
  const items = [...state.expenses].sort((a, b) => {
    const c = b.date.localeCompare(a.date);
    return c !== 0 ? c : b.id - a.id;
  });
  if (items.length === 0) {
    list.innerHTML = '<p class="empty">Пока нет расходов</p>';
    return;
  }
  list.innerHTML = items.map(it => {
    const cat = state.expenseCategories.find(c => c.id === it.categoryId);
    const catName = cat ? cat.name : 'Без категории';
    return `
      <div class="item">
        <div class="item-main">
          <div class="item-amount expense">− ${fmtMoney(it.amount)}</div>
          <div class="item-meta">${fmtDate(it.date)} · ${escapeHtml(catName)}</div>
          ${it.note ? `<div class="item-note">${escapeHtml(it.note)}</div>` : ''}
        </div>
        <button class="delete-btn" data-id="${it.id}">✕</button>
      </div>`;
  }).join('');
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete('expense', Number(btn.dataset.id)));
  });
}

// ==================== Категории ====================
function renderCategoryScreen() {
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.toggle('active', b.dataset.cat === categoryTab));
  document.getElementById('cat-input-label').textContent =
    categoryTab === 'income' ? 'Название категории дохода' : 'Название категории расхода';
  document.getElementById('cat-add-btn').textContent =
    categoryTab === 'income' ? 'Добавить категорию дохода' : 'Добавить категорию расхода';

  const cats = categoryTab === 'income' ? state.incomeCategories : state.expenseCategories;
  const list = document.getElementById('cat-list');
  if (cats.length === 0) {
    list.innerHTML = '<p class="empty">Категорий пока нет</p>';
    return;
  }
  list.innerHTML = cats.map(c => `
    <div class="item">
      <div class="item-main"><div class="item-name">${escapeHtml(c.name)}</div></div>
      <button class="delete-btn" data-id="${c.id}">✕</button>
    </div>
  `).join('');
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteCategory(categoryTab, Number(btn.dataset.id)));
  });
}

// ==================== Статистика ====================
function renderStatsScreen() {
  document.querySelectorAll('.period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === statsPeriod));

  let startDate = null;
  if (statsPeriod === 'month') startDate = dateMinusDays(29);
  else if (statsPeriod === 'year') startDate = dateMinusDays(364);

  const today = todayStr();
  const inRange = (iso) => !startDate || (iso >= startDate && iso <= today);

  const incomes = state.incomes.filter(i => inRange(i.date));
  const expenses = state.expenses.filter(e => inRange(e.date));

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;

  const incByCat = {};
  incomes.forEach(i => { const k = i.categoryId || 0; incByCat[k] = (incByCat[k] || 0) + i.amount; });
  const expByCat = {};
  expenses.forEach(e => { const k = e.categoryId || 0; expByCat[k] = (expByCat[k] || 0) + e.amount; });

  const catName = (type, id) => {
    if (!id) return 'Без категории';
    const cats = type === 'income' ? state.incomeCategories : state.expenseCategories;
    const c = cats.find(x => x.id === id);
    return c ? c.name : 'Без категории';
  };

  const summary = document.getElementById('stats-summary');
  const incRows = Object.entries(incByCat).sort((a, b) => b[1] - a[1])
    .map(([id, amt]) => `<div class="row"><span>${escapeHtml(catName('income', Number(id)))}</span><span class="income">${fmtMoney(amt)}</span></div>`).join('');
  const expRows = Object.entries(expByCat).sort((a, b) => b[1] - a[1])
    .map(([id, amt]) => `<div class="row"><span>${escapeHtml(catName('expense', Number(id)))}</span><span class="expense">${fmtMoney(amt)}</span></div>`).join('');

  summary.innerHTML = `
    <div class="row total"><span>Доходы</span><span class="income">${fmtMoney(totalIncome)}</span></div>
    <div class="row total"><span>Расходы</span><span class="expense">${fmtMoney(totalExpense)}</span></div>
    <div class="row total"><span>Баланс</span><span class="${balance >= 0 ? 'income' : 'expense'}">${fmtMoney(balance)}</span></div>
    ${incRows ? `<div class="sep"></div><div class="label">Доходы по категориям</div>${incRows}` : ''}
    ${expRows ? `<div class="sep"></div><div class="label">Расходы по категориям</div>${expRows}` : ''}
  `;

  const byDay = {};
  incomes.forEach(i => { byDay[i.date] = byDay[i.date] || { inc: [], exp: [] }; byDay[i.date].inc.push(i); });
  expenses.forEach(e => { byDay[e.date] = byDay[e.date] || { inc: [], exp: [] }; byDay[e.date].exp.push(e); });

  const days = Object.keys(byDay).sort().reverse();
  const dayList = document.getElementById('stats-days');
  if (days.length === 0) {
    dayList.innerHTML = '<p class="empty">Нет данных за выбранный период</p>';
    return;
  }
  dayList.innerHTML = days.map(date => {
    const d = byDay[date];
    const dayInc = d.inc.reduce((s, i) => s + i.amount, 0);
    const dayExp = d.exp.reduce((s, e) => s + e.amount, 0);
    const dayBal = dayInc - dayExp;
    const incLines = d.inc.map(i => `<div class="row"><span>${escapeHtml(catName('income', i.categoryId))}${i.note ? ' · ' + escapeHtml(i.note) : ''}</span><span class="income">+${fmtMoney(i.amount)}</span></div>`).join('');
    const expLines = d.exp.map(e => `<div class="row"><span>${escapeHtml(catName('expense', e.categoryId))}${e.note ? ' · ' + escapeHtml(e.note) : ''}</span><span class="expense">−${fmtMoney(e.amount)}</span></div>`).join('');
    return `
      <div class="day-card">
        <div class="day-title">${fmtDate(date)}</div>
        ${incLines}
        ${expLines}
        <div class="sep"></div>
        <div class="row total"><span>Итого за день</span><span class="${dayBal >= 0 ? 'income' : 'expense'}">${fmtMoney(dayBal)}</span></div>
      </div>`;
  }).join('');
}

// ==================== Удаление ====================
function confirmDelete(type, id) {
  const arr = type === 'income' ? state.incomes : state.expenses;
  const item = arr.find(x => x.id === id);
  if (!item) return;
  if (!confirm(`Удалить запись на ${fmtMoney(item.amount)} от ${fmtDate(item.date)}?`)) return;
  if (type === 'income') state.incomes = state.incomes.filter(x => x.id !== id);
  else state.expenses = state.expenses.filter(x => x.id !== id);
  saveState();
  renderCurrent();
}

function confirmDeleteCategory(type, id) {
  const cats = type === 'income' ? state.incomeCategories : state.expenseCategories;
  const cat = cats.find(c => c.id === id);
  if (!cat) return;
  if (!confirm(`Удалить категорию «${cat.name}»? Записи останутся, но будут показаны как «Без категории».`)) return;
  if (type === 'income') state.incomeCategories = state.incomeCategories.filter(c => c.id !== id);
  else state.expenseCategories = state.expenseCategories.filter(c => c.id !== id);
  saveState();
  renderCurrent();
}

// ==================== Экспорт / Импорт ====================
function exportData() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.incomes || !data.expenses) throw new Error('Неверный формат файла');
      if (!confirm('Импорт ЗАМЕНИТ все текущие данные. Продолжить?')) return;
      state = Object.assign({
        incomes: [], expenses: [], incomeCategories: [], expenseCategories: [], nextId: 1
      }, data);
      saveState();
      renderCurrent();
      alert('Импорт выполнен');
    } catch (err) {
      alert('Ошибка импорта: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ==================== Инициализация ====================
document.addEventListener('DOMContentLoaded', () => {
  loadState();

  document.getElementById('income-date').value = todayStr();
  document.getElementById('expense-date').value = todayStr();

  document.querySelectorAll('.tabbar button').forEach(b => {
    b.addEventListener('click', () => switchScreen(b.dataset.screen));
  });

  document.getElementById('income-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('income-amount').value.replace(',', '.'));
    const categoryId = Number(document.getElementById('income-category').value) || null;
    const date = document.getElementById('income-date').value || todayStr();
    const note = document.getElementById('income-note').value.trim();
    if (!amount || amount <= 0) { alert('Введите сумму больше 0'); return; }
    state.incomes.push({ id: nextId(), amount, date, categoryId, note });
    saveState();
    document.getElementById('income-amount').value = '';
    document.getElementById('income-note').value = '';
    renderCurrent();
  });

  document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('expense-amount').value.replace(',', '.'));
    const categoryId = Number(document.getElementById('expense-category').value) || null;
    const date = document.getElementById('expense-date').value || todayStr();
    const note = document.getElementById('expense-note').value.trim();
    if (!amount || amount <= 0) { alert('Введите сумму больше 0'); return; }
    state.expenses.push({ id: nextId(), amount, date, categoryId, note });
    saveState();
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-note').value = '';
    renderCurrent();
  });

  document.querySelectorAll('.cat-tab').forEach(b => {
    b.addEventListener('click', () => { categoryTab = b.dataset.cat; renderCategoryScreen(); });
  });

  document.getElementById('cat-add-btn').addEventListener('click', () => {
    const input = document.getElementById('cat-input');
    const name = input.value.trim();
    if (!name) return;
    if (categoryTab === 'income') state.incomeCategories.push({ id: nextId(), name });
    else state.expenseCategories.push({ id: nextId(), name });
    input.value = '';
    saveState();
    renderCategoryScreen();
  });

  document.getElementById('cat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('cat-add-btn').click();
  });

  document.querySelectorAll('.period-btn').forEach(b => {
    b.addEventListener('click', () => { statsPeriod = b.dataset.period; renderStatsScreen(); });
  });

  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) { importData(e.target.files[0]); e.target.value = ''; }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  }

  switchScreen('incomes');
});