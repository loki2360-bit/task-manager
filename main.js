const SUPABASE_URL = 'https://zitdekerfjocbulmfuyo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_41ROEqZ74QbA4B6_JASt4w_DeRDGXWR';

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

// === Проверка автоматического входа ===
function checkAutoLogin() {
  const savedRole = localStorage.getItem('userRole');
  const savedPassword = localStorage.getItem('userPassword');
  
  if (savedRole && savedPassword) {
    if (savedPassword === PASSWORDS[savedRole]) {
      currentUserRole = savedRole;
      userRoleEl.textContent = savedRole === 'admin' ? 'Администратор' : 'Оператор';
      adminControls.style.display = savedRole === 'admin' ? 'block' : 'none';
      
      loginScreen.style.display = 'none';
      app.style.display = 'block';
      
      initApp();
      return true;
    }
  }
  return false;
}

// === Вход по паролю ===
function handleLogin() {
  const password = loginPassword.value.trim();
  
  if (password === PASSWORDS.admin) {
    currentUserRole = 'admin';
    userRoleEl.textContent = 'Администратор';
    adminControls.style.display = 'block';
    
    // Сохраняем в localStorage
    localStorage.setItem('userRole', 'admin');
    localStorage.setItem('userPassword', password);
    
  } else if (password === PASSWORDS.operator) {
    currentUserRole = 'operator';
    userRoleEl.textContent = 'Оператор';
    adminControls.style.display = 'none';
    
    // Сохраняем в localStorage
    localStorage.setItem('userRole', 'operator');
    localStorage.setItem('userPassword', password);
    
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
  try {
    const stations = await loadStations();
    if (stations.length > 0) {
      currentStation = stations[0];
    }
    renderStations();
    loadOrders();
  } catch (error) {
    console.error('Ошибка инициализации:', error);
    alert('Ошибка при загрузке данных. Проверьте подключение к интернету.');
  }
}

// === Загрузка участков из базы ===
async function loadStations() {
  const { data, error } = await supabaseClient.from('stations').select('name').order('name', { ascending: true });
  if (error) throw error;
  return data ? data.map(s => s.name) : [];
}

// === Рендер участков ===
async function renderStations() {
  try {
    const stations = await loadStations();
    const counts = {};
    stations.forEach(s => counts[s] = 0);

    const { data, error } = await supabaseClient.from('orders').select('station');
    if (error) throw error;
    
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
  } catch (error) {
    console.error('Ошибка загрузки участков:', error);
    stationsList.innerHTML = '<li style="color: #dc3545;">Ошибка загрузки</li>';
  }
}

// === Загрузка заказов ===
async function loadOrders(searchTerm = null) {
  try {
    let query = supabaseClient.from('orders').select('*');

    if (searchTerm) {
      query = query.ilike('order_id', `%${searchTerm}%`);
    } else {
      query = query.eq('station', currentStation);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    renderOrders(data || []);
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    ordersContainer.innerHTML = '<p style="text-align:center; color:#dc3545;">Ошибка загрузки</p>';
  }
}

function renderOrders(ordersList) {
  ordersContainer.innerHTML = '';

  if (ordersList.length === 0) {
    ordersContainer.innerHTML = '<p style="text-align:center; color:#6c757d;">Нет задач</p>';
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
  
  try {
    const stations = await loadStations();
    if (stations.length === 0) return alert('Нет участков');

    const { error } = await supabaseClient.from('orders').insert({
      order_id: orderId,
      station: stations[0],
      tag: tag || null
    });

    if (error) throw error;

    orderInput.value = '';
    tagSelect.value = '';
    if (currentStation === stations[0]) loadOrders();
    renderStations();
  } catch (error) {
    console.error('Ошибка добавления заказа:', error);
    alert('Ошибка при добавлении заказа.');
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
  try {
    const stations = await loadStations();
    stations.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Ошибка загрузки участков для перемещения:', error);
    select.innerHTML = '<option>Ошибка загрузки</option>';
  }

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
  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({ station: newStation })
      .eq('id', orderId);

    if (error) throw error;

    document.getElementById('move-modal')?.remove();
    loadOrders();
    renderStations();
  } catch (error) {
    console.error('Ошибка перемещения заказа:', error);
    alert('Ошибка при перемещении заказа.');
  }
}

// === Закрыть заказ ===
async function closeOrder(orderId) {
  if (!confirm('Закрыть заказ?')) return;

  try {
    const { error } = await supabaseClient
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;

    loadOrders();
    renderStations();
  } catch (error) {
    console.error('Ошибка закрытия заказа:', error);
    alert('Ошибка при закрытии заказа.');
  }
}

// === Управление участками (только для админа) ===
addStationBtn.addEventListener('click', async () => {
  if (currentUserRole !== 'admin') return;
  
  const name = newStationInput.value.trim();
  if (!name) return;
  
  try {
    const stations = await loadStations();
    if (stations.includes(name)) return alert('Участок уже существует');
    
    const { error } = await supabaseClient.from('stations').insert({ name });
    if (error) throw error;
    
    newStationInput.value = '';
    renderStations();
  } catch (error) {
    console.error('Ошибка добавления участка:', error);
    alert('Ошибка при добавлении участка.');
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
    try {
      const { error } = await supabaseClient
        .from('stations')
        .delete()
        .eq('name', stationName);
      
      if (error) throw error;
      
      renderStations();
    } catch (error) {
      console.error('Ошибка удаления участка:', error);
      alert('Ошибка при удалении участка.');
    }
  }
});

// === Запуск приложения ===
if (!checkAutoLogin()) {
  loginScreen.style.display = 'flex';
}
