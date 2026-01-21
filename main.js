// === Инициализация данных ===
let stations = JSON.parse(localStorage.getItem('stations')) || [
  "Распил", "ЧПУ", "Покраска", "Фрезеровка",
  "Шпонировка", "Сборка", "Упаковка"
];

let orders = JSON.parse(localStorage.getItem('orders')) || [];
let currentStation = localStorage.getItem('currentStation') || stations[0];

// === Сохранение ===
function saveData() {
  localStorage.setItem('stations', JSON.stringify(stations));
  localStorage.setItem('orders', JSON.stringify(orders));
  localStorage.setItem('currentStation', currentStation);
}

// === DOM ===
const stationsList = document.getElementById('stations-list');
const ordersContainer = document.getElementById('orders-container');
const orderInput = document.getElementById('order-input');
const addOrderBtn = document.getElementById('add-order');
const searchInput = document.getElementById('search-input');
const adminBtn = document.getElementById('admin-btn');

// === Рендер участков ===
function renderStations() {
  stationsList.innerHTML = '';
  stations.forEach(station => {
    const li = document.createElement('li');
    li.textContent = station;
    li.classList.toggle('active', station === currentStation);
    li.addEventListener('click', () => {
      currentStation = station;
      saveData();
      renderStations();
      loadOrders();
    });
    stationsList.appendChild(li);
  });
}

// === Подсчёт задач на участке ===
function getStationCounts() {
  const counts = {};
  stations.forEach(s => counts[s] = 0);
  orders.filter(o => o.status !== 'Закрыт').forEach(o => {
    if (counts.hasOwnProperty(o.currentStation)) {
      counts[o.currentStation]++;
    }
  });
  return counts;
}

// === Загрузка заказов ===
function loadOrders(searchTerm = null) {
  ordersContainer.innerHTML = '';

  let filtered = orders.filter(order => {
    if (searchTerm) {
      return order.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    } else {
      return order.currentStation === currentStation && order.status !== 'Закрыт';
    }
  });

  if (filtered.length === 0) {
    ordersContainer.innerHTML = searchTerm ? '<p>Не найдено</p>' : '<p>Нет задач</p>';
    return;
  }

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  filtered.forEach((order, index) => {
    const card = document.createElement('div');
    card.className = 'order-card';

    // Кнопки управления
    let buttons = '';
    if (!searchTerm) {
      if (order.status !== 'Закрыт') {
        buttons += `<button onclick="moveOrder(${index})">Переместить</button> `;
        buttons += `<button onclick="closeOrder(${index})">Закрыть</button>`;
      }
    }

    card.innerHTML = `
      <div class="order-id">#${order.orderId} (${order.status})</div>
      <div class="status-buttons">${buttons}</div>
    `;
    ordersContainer.appendChild(card);
  });
}

// === Добавление заказа ===
addOrderBtn.addEventListener('click', () => {
  const orderId = orderInput.value.trim();
  if (!orderId) return alert('Введите номер заказа');
  if (orders.some(o => o.orderId === orderId)) return alert('Такой заказ уже есть');

  orders.push({
    orderId,
    currentStation: stations[0],
    status: 'Не начат',
    createdAt: new Date().toISOString()
  });

  saveData();
  orderInput.value = '';
  if (currentStation === stations[0]) loadOrders();
  renderStations(); // обновить счётчики
});

// === Поиск ===
searchInput.addEventListener('input', (e) => {
  loadOrders(e.target.value.trim());
});

// === Переместить заказ (выбор участка) ===
window.moveOrder = (index) => {
  const options = stations.map(s => `"${s}"`).join(', ');
  const newStation = prompt(`Выберите участок:\n${options}`, orders[index].currentStation);
  if (!newStation || !stations.includes(newStation)) return;

  orders[index].currentStation = newStation;
  orders[index].status = 'Не начат'; // сброс статуса при перемещении
  saveData();
  renderStations();
  loadOrders();
};

// === Закрыть заказ ===
window.closeOrder = (index) => {
  if (confirm(`Закрыть заказ #${orders[index].orderId}?`)) {
    orders[index].status = 'Закрыт';
    saveData();
    renderStations();
    loadOrders();
  }
};

// === Админка ===
adminBtn.addEventListener('click', () => {
  const pass = prompt('Админ-пароль:');
  if (pass !== 'admin123') { // ← замените на свой!
    alert('Неверный пароль');
    return;
  }

  // Создаём модальное окно админки
  const adminPanel = document.createElement('div');
  adminPanel.id = 'admin-panel';
  adminPanel.style = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); z-index: 1000; padding: 20px;
    display: flex; justify-content: center; align-items: center;
  `;

  let stationsHtml = stations.map(s => 
    `<div>${s} <button onclick="deleteStation('${s}')">✕</button></div>`
  ).join('');

  adminPanel.innerHTML = `
    <div style="background: white; padding: 20px; color: black; max-width: 500px; width: 90%;">
      <h3>Админ-панель</h3>
      
      <h4>Участки</h4>
      <div id="admin-stations">${stationsHtml}</div>
      <input type="text" id="new-station" placeholder="Новый участок" />
      <button onclick="addStation()">Добавить</button>

      <h4 style="margin-top: 20px;">Заказы</h4>
      <div id="admin-orders"></div>

      <button onclick="document.body.removeChild(document.getElementById('admin-panel'))" 
              style="margin-top: 20px;">Закрыть</button>
    </div>
  `;

  // Загрузка списка заказов для удаления
  const ordersHtml = orders.map((o, i) => 
    `<div>#${o.orderId} (${o.currentStation}) — ${o.status} 
       <button onclick="deleteOrder(${i})">Удалить</button>
     </div>`
  ).join('');
  adminPanel.querySelector('#admin-orders').innerHTML = ordersHtml || '<p>Нет заказов</p>';

  document.body.appendChild(adminPanel);
});

// === Функции админки (глобальные для onclick) ===
window.addStation = () => {
  const input = document.getElementById('new-station');
  const name = input.value.trim();
  if (!name) return;
  if (stations.includes(name)) return alert('Участок уже существует');
  stations.push(name);
  saveData();
  location.reload(); // проще перезагрузить
};

window.deleteStation = (name) => {
  if (stations.length <= 1) return alert('Нужен хотя бы один участок');
  if (!confirm(`Удалить участок "${name}"? Все заказы на нём останутся.`)) return;
  stations = stations.filter(s => s !== name);
  if (!stations.includes(currentStation)) currentStation = stations[0];
  saveData();
  location.reload();
};

window.deleteOrder = (index) => {
  if (confirm(`Удалить заказ #${orders[index].orderId}?`)) {
    orders.splice(index, 1);
    saveData();
    location.reload();
  }
};

// === Инициализация ===
renderStations();
loadOrders();
