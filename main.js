// === КОНФИГУРАЦИЯ ===
const ADMIN_PASSWORD = '12345'; // ← замените на ваш пароль
const SUPABASE_URL = 'https://zitdekerfjocbulmfuyo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_41ROEqZ74QbA4B6_JASt4w_DeRDGXWR';

let supabase;
let currentUser = null;

const ITEM_TYPES = [
  'наружняя панель', 'внутренняя панель', 'откосы', 'наличники',
  'внутренние наличники', 'импасы', 'фрумуги', 'упаковка'
];

const WORKSTATIONS = [
  'распил', 'чпу', 'фанеровка', 'шлифовка',
  'сборка', 'покраска', 'пвх', 'упаковка'
];

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof createClient !== 'function') {
    alert('❌ Supabase не загружен. Проверьте index.html.');
    return;
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const saved = localStorage.getItem('user');
  if (saved) {
    currentUser = JSON.parse(saved);
    showApp();
  } else {
    showLogin();
  }

  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('add-order').addEventListener('click', addOrder);
  document.getElementById('search-input').addEventListener('input', renderOrders);
});

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('user-role').textContent = currentUser.role;
  
  renderStations();
  renderOrders();
}

async function login() {
  const pwd = document.getElementById('login-password').value.trim();
  const err = document.getElementById('login-error');
  
  if (!pwd) {
    err.style.display = 'block';
    err.textContent = 'Введите пароль';
    return;
  }

  currentUser = { role: pwd === ADMIN_PASSWORD ? 'admin' : 'operator' };
  localStorage.setItem('user', JSON.stringify(currentUser));
  showApp();
}

function logout() {
  localStorage.removeItem('user');
  currentUser = null;
  showLogin();
}

function renderStations() {
  const list = document.getElementById('stations-list');
  list.innerHTML = WORKSTATIONS.map(ws => `<li>${ws}</li>`).join('');
}

function addOrder() {
  const orderNum = document.getElementById('order-input').value.trim();
  if (!orderNum) return alert('Введите номер заказа');

  const type = prompt(
    'Выберите тип позиции:\n' + ITEM_TYPES.join('\n'),
    ITEM_TYPES[0]
  );

  if (!type || !ITEM_TYPES.includes(type)) return;

  createItem(orderNum, type);
}

async function createItem(orderNumber, itemType) {
  try {
    const { error } = await supabase.from('items').insert({
      order_number: orderNumber,
      item_type: itemType,
      current_workstation: 'распил'
    });

    if (error) throw error;

    document.getElementById('order-input').value = '';
    renderOrders();
  } catch (err) {
    console.error('Ошибка:', err);
    alert('Не удалось создать запись');
  }
}

async function renderOrders() {
  try {
    const term = document.getElementById('search-input').value.toLowerCase().trim();

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('order_number', { ascending: true })
      .order('item_type', { ascending: true });

    if (error) throw error;

    const filtered = data.filter(item =>
      item.order_number.toLowerCase().includes(term)
    );

    const groups = {};
    filtered.forEach(item => {
      if (!groups[item.order_number]) groups[item.order_number] = [];
      groups[item.order_number].push(item);
    });

    const container = document.getElementById('orders-container');
    container.innerHTML = '';

    for (const [orderNum, items] of Object.entries(groups)) {
      const groupEl = document.createElement('div');
      groupEl.className = 'order-group';
      groupEl.innerHTML = `<h3>${orderNum}</h3>`;

      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'order-item';
        itemEl.innerHTML = `
          <div>${item.item_type} → ${item.current_workstation}</div>
          <select class="workstation-select" data-id="${item.id}">
            ${WORKSTATIONS.map(ws => 
              `<option value="${ws}" ${ws === item.current_workstation ? 'selected' : ''}>${ws}</option>`
            ).join('')}
          </select>
        `;
        groupEl.appendChild(itemEl);
      });

      container.appendChild(groupEl);
    }

    document.querySelectorAll('.workstation-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const ws = e.target.value;
        await supabase
          .from('items')
          .update({ current_workstation: ws })
          .eq('id', id);
        renderOrders();
      });
    });
  } catch (err) {
    console.error('Рендер:', err);
  }
}
