// === Хранилище данных ===
let stations = JSON.parse(localStorage.getItem('stations')) || [
  "Распил", "ЧПУ", "Покраска", "Фрезеровка",
  "Шпонировка", "Сборка", "Упаковка"
];

let orders = JSON.parse(localStorage.getItem('orders')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];

if (users.length === 0) {
  users.push({ username: 'оператор', password: '12345' });
  localStorage.setItem('users', JSON.stringify(users));
}

let currentUser = null;
let currentStation = stations[0];

function saveData() {
  localStorage.setItem('stations', JSON.stringify(stations));
  localStorage.setItem('orders', JSON.stringify(orders));
  localStorage.setItem('users', JSON.stringify(users));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// === DOM элементы ===
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const adminBtn = document.getElementById('admin-btn');
const currentUserEl = document.getElementById('current-user');

// === Проверка автоматического входа ===
function checkAutoLogin() {
  try {
    const saved = localStorage.getItem('currentUser');
    if (!saved) {
      loginScreen.style.display = 'flex';
      return;
    }

    const savedUser = JSON.parse(saved);
    const found = users.find(u =>
      u.username === savedUser.username &&
      u.password === savedUser.password
    );

    if (found) {
      currentUser = found;
      showApp();
    } else {
      localStorage.removeItem('currentUser');
      loginScreen.style.display = 'flex';
    }
  } catch (e) {
    console.error('Ошибка входа:', e);
    loginScreen.style.display = 'flex';
  }
}

// === Вход ===
loginBtn.addEventListener('click', () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    loginError.style.display = 'none';
    showApp();
  } else {
    loginError.textContent = 'Неверное имя или пароль';
    loginError.style.display = 'block';
  }
});

// === Выход ===
logoutBtn.addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem('currentUser');
  app.style.display = 'none';
  loginScreen.style.display = 'flex';
  loginUsername.value = '';
  loginPassword.value = '';
});

// === Показать основное приложение ===
function showApp() {
  loginScreen.style.display = 'none';
  app.style.display = 'block';
  currentUserEl.textContent = `Привет, ${currentUser.username}`;
  renderStations();
  loadOrders();
}

// === Рендер участков ===
function renderStations() {
  const counts = {};
  stations.forEach(s => counts[s] = 0);
  orders.forEach(o => {
    if (counts.hasOwnProperty(o.station)) counts[o.station]++;
  });

  const list = document.getElementById('stations-list');
  list.innerHTML = '';
  stations.forEach(station => {
    const li = document.createElement('li');
    li.textContent = `${station} (${counts[station]})`;
    li.classList.toggle('active', station === currentStation);
    li.addEventListener('click', () => {
      currentStation = station;
      renderStations();
      loadOrders();
    });
    list.appendChild(li);
  });
}

// === Загрузка заказов ===
function loadOrders(searchTerm = null) {
  const container = document.getElementById('orders-container');
  container.innerHTML = '';

  let filtered = orders.filter(order => {
    if (searchTerm) {
      return order.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    } else {
      return order.station === currentStation;
    }
  });

  if (filtered.length === 0) {
    container.innerHTML = searchTerm ? '<p>Не найдено</p>' : '<p>Нет задач</p>';
    return;
  }

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  filtered.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';

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

    const idDiv = document.createElement('div');
    idDiv.className = 'order-id';
    idDiv.textContent = `#${order.orderId}`;

    card.appendChild(idDiv);
    card.appendChild(buttonsDiv);
    container.appendChild(card);
  });
}

// === Добавление заказа ===
document.getElementById('add-order').addEventListener('click', () => {
  const orderId = document.getElementById('order-input').value.trim();
  if (!orderId) return alert('Введите номер заказа');
  if (orders.some(o => o.orderId === orderId)) return alert('Такой заказ уже есть');

  orders.push({
    id: generateId(),
    orderId,
    station: stations[0],
    createdAt: new Date().toISOString()
  });

  saveData();
  document.getElementById('order-input').value = '';
  if (currentStation === stations[0]) loadOrders();
  renderStations();
});

// === Поиск ===
document.getElementById('search-input').addEventListener('input', (e) => {
  loadOrders(e.target.value.trim());
});

// === Переместить заказ ===
function showMoveDialog(orderId) {
  const id = String(orderId);
  const order = orders.find(o => o.id === id);
  if (!order) return alert('Заказ не найден');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'move-modal';

  const select = document.createElement('select');
  select.id = 'move-select';
  stations.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    if (s === order.station) opt.selected = true;
    select.appendChild(opt);
  });

  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.addEventListener('click', () => confirmMove(id));

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Отмена';
  cancelBtn.addEventListener('click', closeMoveDialog);

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.innerHTML = `<h4>Переместить #${order.orderId}</h4>`;
  content.appendChild(select);
  content.appendChild(okBtn);
  content.appendChild(cancelBtn);

  modal.appendChild(content);
  document.body.appendChild(modal);
}

function confirmMove(orderId) {
  const select = document.getElementById('move-select');
  const id = String(orderId);
  const order = orders.find(o => o.id === id);
  if (order) {
    order.station = select.value;
    saveData();
  }
  closeMoveDialog();
  renderStations();
  loadOrders();
}

function closeMoveDialog() {
  const el = document.getElementById('move-modal');
  if (el) el.remove();
}

// === Закрыть заказ ===
function closeOrder(orderId) {
  const id = String(orderId);
  const order = orders.find(o => o.id === id);
  if (!order) return;

  if (confirm(`Закрыть заказ #${order.orderId}?`)) {
    orders = orders.filter(o => o.id !== id);
    saveData();
    renderStations();
    loadOrders();
  }
}

// === Админка ===
adminBtn.addEventListener('click', () => {
  const pass = prompt('Админ-пароль:');
  if (pass !== 'admin123') {
    alert('Неверный пароль');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'admin-panel';

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.innerHTML = '<h3>Админ-панель</h3>';

  // Участки
  const stationsSection = document.createElement('div');
  stationsSection.innerHTML = '<h4>Участки</h4>';
  const stationsList = document.createElement('div');
  stationsList.id = 'admin-stations';
  stations.forEach(s => {
    const div = document.createElement('div');
    div.textContent = s;
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.addEventListener('click', () => deleteStation(s));
    div.appendChild(btn);
    stationsList.appendChild(div);
  });
  stationsSection.appendChild(stationsList);

  const newStationInput = document.createElement('input');
  newStationInput.type = 'text';
  newStationInput.id = 'new-station';
  newStationInput.placeholder = 'Новый участок';

  const addStationBtn = document.createElement('button');
  addStationBtn.textContent = 'Добавить';
  addStationBtn.addEventListener('click', addStation);

  stationsSection.appendChild(newStationInput);
  stationsSection.appendChild(addStationBtn);
  content.appendChild(stationsSection);

  // Заказы
  const ordersSection = document.createElement('div');
  ordersSection.innerHTML = '<h4>Заказы</h4>';
  const ordersList = document.createElement('div');
  if (orders.length === 0) {
    ordersList.innerHTML = '<p>Нет заказов</p>';
  } else {
    orders.forEach(o => {
      const div = document.createElement('div');
      div.textContent = `#${o.orderId} (${o.station})`;
      const btn = document.createElement('button');
      btn.textContent = 'Удалить';
      btn.addEventListener('click', () => deleteOrder(o.id));
      div.appendChild(btn);
      ordersList.appendChild(div);
    });
  }
  ordersSection.appendChild(ordersList);
  content.appendChild(ordersSection);

  // Пользователи
  const usersSection = document.createElement('div');
  usersSection.innerHTML = '<h4>Пользователи</h4>';
  const usersList = document.createElement('div');
  if (users.length === 0) {
    usersList.innerHTML = '<p>Нет пользователей</p>';
  } else {
    users.forEach(u => {
      const div = document.createElement('div');
      div.textContent = u.username;
      const btn = document.createElement('button');
      btn.textContent = '✕';
      btn.addEventListener('click', () => deleteUser(u.username));
      div.appendChild(btn);
      usersList.appendChild(div);
    });
  }
  usersSection.appendChild(usersList);
  content.appendChild(usersSection);

  // Кнопка закрытия
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Закрыть';
  closeBtn.style.marginTop = '12px';
  closeBtn.addEventListener('click', closeAdminPanel);
  content.appendChild(closeBtn);

  modal.appendChild(content);
  document.body.appendChild(modal);
});

function closeAdminPanel() {
  const el = document.getElementById('admin-panel');
  if (el) el.remove();
}

function addStation() {
  const input = document.getElementById('new-station');
  const name = input.value.trim();
  if (!name) return;
  if (stations.includes(name)) return alert('Участок уже существует');
  stations.push(name);
  saveData();
  location.reload();
}

function deleteStation(name) {
  if (stations.length <= 1) return alert('Нужен хотя бы один участок');
  if (!confirm(`Удалить участок "${name}"?`)) return;
  stations = stations.filter(s => s !== name);
  if (!stations.includes(currentStation)) currentStation = stations[0];
  saveData();
  location.reload();
}

function deleteOrder(orderId) {
  const id = String(orderId);
  const order = orders.find(o => o.id === id);
  if (!order) return alert('Заказ не найден');
  if (confirm(`Удалить заказ #${order.orderId}?`)) {
    orders = orders.filter(o => o.id !== id);
    saveData();
    location.reload();
  }
}

function deleteUser(username) {
  if (users.length <= 1) return alert('Нужен хотя бы один пользователь');
  if (!confirm(`Удалить пользователя "${username}"?`)) return;
  users = users.filter(u => u.username !== username);
  saveData();
  location.reload();
}

// === Запуск ===
checkAutoLogin();
