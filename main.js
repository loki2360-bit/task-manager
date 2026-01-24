// === Supabase config ===
const SUPABASE_URL = 'https://zitdekerfjocbulmfuyo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_41ROEqZ74QbA4B6_JASt4w_DeRDGXWR';

// Создаём клиент Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Пароли ===
const PASSWORDS = {
  operator: '12345',
  admin: 'admin123'
};

let currentUserRole = null;
let currentStation = '';

// === DOM элементы ===
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const userRoleEl = document.getElementById('user-role');
const stationsList = document.getElementById('stations-list');
const ordersContainer = document.getElementById('orders-container');
const orderInput = document.getElementById('order-input');
const tagSelect = document.getElementById('tag-select');
const addOrderBtn = document.getElementById('add-order');
const searchInput = document.getElementById('search-input');
const adminControls = document.getElementById('admin-controls');
const newStationInput = document.getElementById('new-station');
const addStationBtn = document.getElementById('add-station');

// === Вход по паролю ===
function handleLogin() {
  const password = loginPassword.value.trim();
  
  if (password === PASSWORDS.admin) {
    currentUserRole = 'admin';
    userRoleEl.textContent = 'Администратор';
    adminControls.style.display = 'block';
  } else if (password === PASSWORDS.operator) {
    currentUserRole = 'operator';
    userRoleEl.textContent = 'Оператор';
    adminControls.style.display = 'none';
  } else {
    loginError.textContent = 'Неверный пароль';
    loginError.style.display = 'block';
    return;
  }
  
  loginError.style.display = 'none';
  loginScreen.style.display = 'none';
  app.style.display = 'block';
  
  initApp();
}

loginBtn.addEventListener('click', handleLogin);
loginPassword.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleLogin();
  }
});

// === Инициализация приложения ===
async function initApp() {
  const stations = await loadStations();
  if (stations.length > 0) {
    currentStation = stations[0];
  }
  renderStations();
  loadOrders();
}

// === Загрузка участков из базы ===
async function loadStations() {
  const { data } = await supabaseClient.from('stations').select('name').order('name', { ascending: true });
  return data ? data.map(s => s.name) : [];
}

// === Рендер участков ===
async function renderStations() {
  const stations = await loadStations();
  const counts = {};
  stations.forEach(s => counts[s] = 0);

  const { data } = await supabaseClient.from('orders').select('station');
  if (data) {
    data.forEach(row => {
      if (counts.hasOwnProperty(row.station)) {
        counts[row.station]++;
      }
    });
  }

  stationsList.innerHTML = '';
  stations.forEach(station => {
    const li = document.createElement('li');
    li.textContent = `${station} (${counts[station]})`;
    li.classList.toggle('active', station === currentStation);
    li.addEventListener('click', () => {
      currentStation = station;
      renderStations();
      loadOrders();
    });
    stationsList.appendChild(li);
  });
}

// === Загрузка заказов ===
async function loadOrders(searchTerm = null) {
  let query = supabaseClient.from('orders').select('*');

  if (searchTerm) {
    query = query.ilike('order_id', `%${searchTerm}%`);
  } else {
    query = query.eq('station', currentStation);
  }

  const { data } = await query.order('created_at', { ascending: false });
  renderOrders(data || []);
}

function renderOrders(ordersList) {
  ordersContainer.innerHTML = '';

  if (ordersList.length === 0) {
    ordersContainer.innerHTML = '<p style="text-align:center; color:#666;">Нет задач</p>';
    return;
  }

  ordersList.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'order-info';

    const idDiv = document.createElement('div');
    idDiv.className = 'order-id';
    idDiv.textContent = `#${order.order_id}`;

    const tagDiv = document.createElement('div');
    tagDiv.className = 'order-tag';
    tagDiv.textContent = order.tag || 'Без тега';

    infoDiv.appendChild(idDiv);
    infoDiv.appendChild(tagDiv);

    const moveBtn = document.createElement('button');
    moveBtn.textContent = 'Переместить';
    moveBtn.addEventListener('click', () => showMoveDialog(order.id));

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Закрыть';
    closeBtn.addEventListener('click', () => closeOrder(order.id));

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'status-buttons';
    buttonsDiv.appendChild(moveBtn);
    buttonsDiv.appendChild(closeBtn);

    card.appendChild(infoDiv);
    card.appendChild(buttonsDiv);
    ordersContainer.appendChild(card);
  });
}

// === Добавление заказа ===
addOrderBtn.addEventListener('click', async () => {
  const orderId = orderInput.value.trim();
  const tag = tagSelect.value;
  
  if (!orderId) return alert('Введите номер заказа');
  
  const stations = await loadStations();
  if (stations.length === 0) return alert('Нет участков');

  const { error } = await supabaseClient.from('orders').insert({
    order_id: orderId,
    station: stations[0],
    tag: tag || null
  });

  if (error) {
    alert('Ошибка: ' + error.message);
  } else {
    orderInput.value = '';
    tagSelect.value = '';
    if (currentStation === stations[0]) loadOrders();
    renderStations();
  }
});

// === Поиск ===
searchInput.addEventListener('input', (e) => {
  loadOrders(e.target.value.trim());
});

// === Переместить заказ ===
async function showMoveDialog(orderId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'move-modal';

  const select = document.createElement('select');
  const stations = await loadStations();
  stations.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });

  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.addEventListener('click', () => confirmMove(orderId, select.value));

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Отмена';
  cancelBtn.addEventListener('click', () => {
    document.getElementById('move-modal')?.remove();
  });

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.innerHTML = '<h4>Переместить заказ</h4>';
  content.appendChild(select);
  content.appendChild(okBtn);
  content.appendChild(cancelBtn);

  modal.appendChild(content);
  document.body.appendChild(modal);
}

async function confirmMove(orderId, newStation) {
  const { error } = await supabaseClient
    .from('orders')
    .update({ station: newStation })
    .eq('id', orderId);

  if (error) {
    alert('Ошибка: ' + error.message);
  } else {
    document.getElementById('move-modal')?.remove();
    loadOrders();
    renderStations();
  }
}

// === Закрыть заказ ===
async function closeOrder(orderId) {
  if (!confirm('Закрыть заказ?')) return;

  const { error } = await supabaseClient
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (error) {
    alert('Ошибка: ' + error.message);
  } else {
    loadOrders();
    renderStations();
  }
}

// === Управление участками (только для админа) ===
addStationBtn.addEventListener('click', async () => {
  if (currentUserRole !== 'admin') return;
  
  const name = newStationInput.value.trim();
  if (!name) return;
  
  const stations = await loadStations();
  if (stations.includes(name)) return alert('Участок уже существует');
  
  const { error } = await supabaseClient.from('stations').insert({ name });
  if (error) {
    alert('Ошибка: ' + error.message);
  } else {
    newStationInput.value = '';
    renderStations();
  }
});

// === Удаление участка (через долгое нажатие) ===
stationsList.addEventListener('contextmenu', async (e) => {
  if (currentUserRole !== 'admin') return;
  
  const li = e.target.closest('li');
  if (!li) return;
  
  e.preventDefault();
  const stationName = li.textContent.split(' ')[0];
  
  if (confirm(`Удалить участок "${stationName}"?`)) {
    const { error } = await supabaseClient
      .from('stations')
      .delete()
      .eq('name', stationName);
    
    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      renderStations();
    }
  }
});
