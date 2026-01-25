// === Supabase config ===
const SUPABASE_URL = 'https://zitdekerfjocbulmfuyo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_41ROEqZ74QbA4B6_JASt4w_DeRDGXWR';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Пароли для ролей ===
const PASSWORDS = {
  operator: '12345',
  premium: 'premium456',
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
const logoutBtn = document.getElementById('logout-btn');
const stationsList = document.getElementById('stations-list');
const ordersContainer = document.getElementById('orders-container');
const orderInput = document.getElementById('order-input');
const addOrderBtn = document.getElementById('add-order');
const searchInput = document.getElementById('search-input');
const adminControls = document.getElementById('admin-controls');
const newStationInput = document.getElementById('new-station');
const addStationBtn = document.getElementById('add-station');
const emojiSelector = document.getElementById('emoji-selector');
const emojiOptions = document.querySelectorAll('.emoji-options span');

// === Кэш участков ===
let cachedStations = null;

// === Выход из системы ===
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmoji');
  currentUserRole = null;
  app.style.display = 'none';
  loginScreen.style.display = 'flex';
  loginPassword.value = '';
});

// === Обновление отображения роли ===
function updateUserRoleDisplay() {
  let roleText = '';
  userRoleEl.className = 'user-role'; // Сбрасываем классы
  
  switch(currentUserRole) {
    case 'admin':
      roleText = 'Администратор';
      userRoleEl.classList.add('admin');
      break;
    case 'premium':
      roleText = 'Оператор';
      userRoleEl.classList.add('premium');
      // Показываем выбор эмодзи для премиум-оператора
      emojiSelector.style.display = 'block';
      // Загружаем сохранённый эмодзи
      const savedEmoji = localStorage.getItem('userEmoji');
      if (savedEmoji) {
        userRoleEl.innerHTML = `${savedEmoji} ${roleText}`;
      }
      break;
    case 'operator':
    default:
      roleText = 'Оператор';
      userRoleEl.classList.add('operator');
      emojiSelector.style.display = 'none';
      break;
  }
  
  if (currentUserRole !== 'premium') {
    userRoleEl.textContent = roleText;
  }
  
  adminControls.style.display = currentUserRole === 'admin' ? 'block' : 'none';
}

// === Выбор эмодзи ===
emojiOptions.forEach(span => {
  span.addEventListener('click', () => {
    const emoji = span.getAttribute('data-emoji');
    localStorage.setItem('userEmoji', emoji);
    const roleText = 'Оператор';
    userRoleEl.innerHTML = `${emoji} ${roleText}`;
    // Скрываем панель выбора после выбора
    emojiSelector.style.display = 'none';
  });
});

// === Вход по паролю ===
function handleLogin() {
  const password = loginPassword.value.trim();
  
  if (password === PASSWORDS.admin) {
    currentUserRole = 'admin';
    localStorage.setItem('userRole', 'admin');
  } else if (password === PASSWORDS.premium) {
    currentUserRole = 'premium';
    localStorage.setItem('userRole', 'premium');
  } else if (password === PASSWORDS.operator) {
    currentUserRole = 'operator';
    localStorage.setItem('userRole', 'operator');
  } else {
    loginError.textContent = 'Неверный пароль';
    loginError.style.display = 'block';
    return;
  }
  
  updateUserRoleDisplay();
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
    alert('Ошибка при загрузке данных.');
  }
}

// === Загрузка участков из базы ===
async function loadStations() {
  if (cachedStations !== null) {
    return cachedStations;
  }
  
  const { data, error } = await supabaseClient.from('stations').select('name').order('name', { ascending: true });
  if (error) throw error;
  
  cachedStations = data ? data.map(s => s.name) : [];
  return cachedStations;
}

// === Рендер участков ===
async function renderStations() {
  try {
    const stations = await loadStations();
    const counts = {};
    stations.forEach(s => counts[s] = 0);

    const { data, error } = await supabaseClient.from('orders').select('station');
    if (!error && data) {
      data.forEach(row => {
        if (counts.hasOwnProperty(row.station)) {
          counts[row.station]++;
        }
      });
    }

    stationsList.innerHTML = '';
    stations.forEach(station => {
      const li = document.createElement('li');
      li.textContent = `${station} (${counts[station] || 0})`;
      li.classList.toggle('active', station === currentStation);
      li.addEventListener('click', () => {
        currentStation = station;
        renderStations();
        loadOrders();
      });
      stationsList.appendChild(li);
    });
  } catch (error) {
    console.error('Ошибка рендера участков:', error);
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

// === Отображение заказов ===
async function renderOrders(ordersList) {
  ordersContainer.innerHTML = '';

  if (ordersList.length === 0) {
    ordersContainer.innerHTML = '<p style="text-align:center; color:#6c757d;">Нет задач</p>';
    return;
  }

  const stations = await loadStations();

  ordersList.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';

    // Контейнер для ID и возможного комментария
    const idContainer = document.createElement('div');
    idContainer.style.position = 'relative';
    idContainer.style.cursor = 'pointer';
    idContainer.title = order.comment ? 'Просмотреть комментарий' : 'Добавить комментарий';

    const idDiv = document.createElement('div');
    idDiv.className = 'order-id';
    idDiv.textContent = `#${order.order_id}`;
    
    // Обработчик клика по номеру заказа
    idContainer.addEventListener('click', () => {
      if (order.comment) {
        // Показать существующий комментарий
        showCommentView(order.comment);
      } else {
        // Добавить новый комментарий
        showCommentDialog(order.id);
      }
    });

    idContainer.appendChild(idDiv);

    // Выпадающий список для перемещения
    const moveSelect = document.createElement('select');
    moveSelect.className = 'move-select';
    
    stations.forEach(station => {
      const opt = document.createElement('option');
      opt.value = station;
      opt.textContent = station;
      if (station === order.station) {
        opt.selected = true;
      }
      moveSelect.appendChild(opt);
    });

    moveSelect.addEventListener('change', async () => {
      const newStation = moveSelect.value;
      try {
        const { error } = await supabaseClient
          .from('orders')
          .update({ station: newStation })
          .eq('id', order.id);

        if (error) throw error;

        loadOrders();
        renderStations();
      } catch (error) {
        console.error('Ошибка перемещения:', error);
        alert('Ошибка при перемещении заказа.');
        moveSelect.value = order.station;
      }
    });

    // Кнопка "Принять"
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'accept-btn';
    acceptBtn.textContent = 'Принять';

    // Надпись "принято" (изначально скрыта)
    const acceptedStatus = document.createElement('span');
    acceptedStatus.className = 'accepted-status';
    acceptedStatus.textContent = 'принято';
    acceptedStatus.style.display = 'none'; // Скрыта по умолчанию

    // Проверяем, был ли заказ принят
    if (order.accepted) {
      acceptBtn.classList.add('active');
      acceptBtn.textContent = '';
      acceptedStatus.style.display = 'inline';
      acceptBtn.disabled = true;
      acceptBtn.style.cursor = 'default';
    }

    // Обработчик клика по кнопке "Принять"
    acceptBtn.addEventListener('click', async () => {
      try {
        const { error } = await supabaseClient
          .from('orders')
          .update({ accepted: true })
          .eq('id', order.id);

        if (error) throw error;

        // Меняем состояние кнопки
        acceptBtn.classList.add('active');
        acceptBtn.textContent = '';
        acceptedStatus.style.display = 'inline';
        acceptBtn.disabled = true;
        acceptBtn.style.cursor = 'default';

      } catch (error) {
        console.error('Ошибка принятия заказа:', error);
        alert('Ошибка при принятии заказа.');
      }
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Закрыть';
    closeBtn.addEventListener('click', () => closeOrder(order.id));

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'status-buttons';
    buttonsDiv.appendChild(moveSelect);
    buttonsDiv.appendChild(acceptBtn);
    buttonsDiv.appendChild(acceptedStatus);
    buttonsDiv.appendChild(closeBtn);

    card.appendChild(idContainer);
    card.appendChild(buttonsDiv);
    ordersContainer.appendChild(card);
  });
}

// === Диалог добавления комментария ===
function showCommentDialog(orderId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'comment-modal';

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Введите комментарий к заказу...';
  textarea.rows = 4;

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Сохранить';
  saveBtn.addEventListener('click', async () => {
    const comment = textarea.value.trim();
    if (!comment) {
      alert('Комментарий не может быть пустым');
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('orders')
        .update({ comment: comment })
        .eq('id', orderId);

      if (error) throw error;

      document.getElementById('comment-modal')?.remove();
      loadOrders();
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
      alert('Ошибка при добавлении комментария.');
    }
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Отмена';
  cancelBtn.addEventListener('click', () => {
    document.getElementById('comment-modal')?.remove();
  });

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.innerHTML = '<h4>Добавить комментарий</h4>';
  content.appendChild(textarea);
  content.appendChild(saveBtn);
  content.appendChild(cancelBtn);

  modal.appendChild(content);
  document.body.appendChild(modal);
}

// === Просмотр комментария ===
function showCommentView(comment) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'comment-view-modal';

  const content = document.createElement('div');
  content.className = 'modal-content';
  
  const title = document.createElement('h4');
  title.textContent = 'Комментарий к заказу';
  title.style.textAlign = 'center';
  title.style.marginBottom = '12px';

  const commentText = document.createElement('div');
  
  // Проверяем роль пользователя
  if (currentUserRole === 'admin' || currentUserRole === 'premium') {
    // Полный доступ
    commentText.textContent = comment;
    commentText.style.fontSize = '14px';
    commentText.style.lineHeight = '1.5';
    commentText.style.padding = '12px';
    commentText.style.backgroundColor = '#f8f9fa';
    commentText.style.borderRadius = '8px';
    commentText.style.border = '1px solid #e9ecef';
  } else {
    // Ограниченный доступ для обычного оператора
    commentText.innerHTML = `
      <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
        <div style="font-size: 16px; font-weight: bold; color: #dc3545; margin-bottom: 10px;">🔒 Доступ ограничен</div>
        <div style="font-size: 14px; color: #6c757d;">Только для админа или премиум-пользователя</div>
      </div>
    `;
  }

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Закрыть';
  closeBtn.addEventListener('click', () => {
    document.getElementById('comment-view-modal')?.remove();
  });

  content.appendChild(title);
  content.appendChild(commentText);
  content.appendChild(closeBtn);

  modal.appendChild(content);
  document.body.appendChild(modal);
}

// === Добавление заказа ===
addOrderBtn.addEventListener('click', async () => {
  const orderId = orderInput.value.trim();
  
  if (!orderId) return alert('Введите номер заказа');
  
  try {
    const stations = await loadStations();
    if (stations.length === 0) return alert('Нет участков');

    const { error } = await supabaseClient.from('orders').insert({
      order_id: orderId,
      station: stations[0]
    });

    if (error) {
      console.error('Ошибка добавления:', error);
      alert(`Ошибка: ${error.message}`);
      return;
    }

    orderInput.value = '';
    if (currentStation === stations[0]) loadOrders();
    renderStations();
  } catch (error) {
    console.error('Неизвестная ошибка:', error);
    alert('Неизвестная ошибка. Проверьте консоль.');
  }
});

// === Поиск ===
searchInput.addEventListener('input', (e) => {
  loadOrders(e.target.value.trim());
});

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
    cachedStations = null; // Сбрасываем кэш
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
      
      cachedStations = null; // Сбрасываем кэш
      renderStations();
    } catch (error) {
      console.error('Ошибка удаления участка:', error);
      alert('Ошибка при удалении участка.');
    }
  }
});

// === Проверка автоматического входа ===
function checkAutoLogin() {
  const savedRole = localStorage.getItem('userRole');
  
  if (savedRole && (savedRole === 'operator' || savedRole === 'premium' || savedRole === 'admin')) {
    currentUserRole = savedRole;
    updateUserRoleDisplay();
    
    // Для премиум-оператора загружаем эмодзи
    if (savedRole === 'premium') {
      const savedEmoji = localStorage.getItem('userEmoji');
      if (savedEmoji) {
        const roleText = 'Оператор';
        userRoleEl.innerHTML = `${savedEmoji} ${roleText}`;
      }
    }
    
    loginScreen.style.display = 'none';
    app.style.display = 'block';
    
    initApp();
    return true;
  }
  return false;
}

// === Запуск приложения ===
if (!checkAutoLogin()) {
  loginScreen.style.display = 'flex';
}
