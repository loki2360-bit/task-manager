// === Supabase config ===
// 🔑 ЗАМЕНИТЕ ЭТИ ЗНАЧЕНИЯ НА ВАШИ ИЗ SUPABASE!
const supabaseUrl = 'https://zitdekerfjocbulmfuyo.supabase.co';
const supabaseAnonKey = 'sb_publishable_41ROEqZ74QbA4B6_JASt4w_DeRDGXWR';

const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

// === Участки (можно вынести в БД позже) ===
const stations = [
  "Распил", "ЧПУ", "Покраска", "Фрезеровка",
  "Шпонировка", "Сборка", "Упаковка"
];

let currentUser = null;
let currentStation = stations[0];

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

// === Автоматический вход ===
async function checkAutoLogin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    showApp();
  } else {
    loginScreen.style.display = 'flex';
  }
}

// === Вход ===
loginBtn.addEventListener('click', async () => {
  const email = loginUsername.value.trim();
  const password = loginPassword.value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginError.textContent = 'Ошибка: ' + error.message;
    loginError.style.display = 'block';
  } else {
    currentUser = data.user;
    loginError.style.display = 'none';
    showApp();
  }
});

// === Выход ===
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentUser = null;
  app.style.display = 'none';
  loginScreen.style.display = 'flex';
  loginUsername.value = '';
  loginPassword.value = '';
});

// === Показать приложение ===
function showApp() {
  loginScreen.style.display = 'none';
  app.style.display = 'block';
  currentUserEl.textContent = `Привет, ${currentUser.email}`;
  renderStations();
  loadOrders();
}

// === Рендер участков с счётчиками ===
async function renderStations() {
  const counts = {};
  stations.forEach(s => counts[s] = 0);

  const { data } = await supabase.from('orders').select('station');
  if (data) {
    data.forEach(row => {
      if (counts.hasOwnProperty(row.station)) {
        counts[row.station]++;
      }
    });
  }

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
async function loadOrders(searchTerm = null) {
  let query = supabase.from('orders').select('*');

  if (searchTerm) {
    query = query.ilike('order_id', `%${searchTerm}%`);
  } else {
    query = query.eq('station', currentStation);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Ошибка загрузки:', error);
    document.getElementById('orders-container').innerHTML = '<p>Ошибка загрузки</p>';
    return;
  }

  renderOrders(data || []);
}

function renderOrders(ordersList) {
  const container = document.getElementById('orders-container');
  container.innerHTML = '';

  if (ordersList.length === 0) {
    container.innerHTML = '<p>Нет задач</p>';
    return;
  }

  ordersList.forEach(order => {
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
    idDiv.textContent = `#${order.order_id}`;

    card.appendChild(idDiv);
    card.appendChild(buttonsDiv);
    container.appendChild(card);
  });
}

// === Добавление заказа ===
document.getElementById('add-order').addEventListener('click', async () => {
  const orderId = document.getElementById('order-input').value.trim();
  if (!orderId) return alert('Введите номер заказа');

  const { error } = await supabase.from('orders').insert({
    order_id: orderId,
    station: stations[0]
  });

  if (error) {
    alert('Ошибка: ' + error.message);
  } else {
    document.getElementById('order-input').value = '';
    if (currentStation === stations[0]) loadOrders();
    renderStations();
  }
});

// === Поиск ===
document.getElementById('search-input').addEventListener('input', (e) => {
  loadOrders(e.target.value.trim());
});

// === Переместить заказ ===
function showMoveDialog(orderId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'move-modal';

  const select = document.createElement('select');
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
  const { error } = await supabase
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

  const { error } = await supabase
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

// === Админка (упрощённая — только для управления участниками через БД) ===
adminBtn.addEventListener('click', () => {
  alert('Админка пока не реализована. Управление участниками — в коде или через Supabase SQL.');
});

// === Запуск ===
checkAutoLogin();
