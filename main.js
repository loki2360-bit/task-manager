// === Supabase config ===
// 🔑 ЗАМЕНИТЕ ЭТИ ЗНАЧЕНИЯ НА ВАШИ ИЗ SUPABASE!
const supabaseUrl = 'https://zitdekerfjocbulmfuyo.supabase.co';
const supabaseAnonKey = 'sb_publishable_41ROEqZ74QbA4B6_JASt4w_DeRDGXWR';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const stations = [
  "Распил", "ЧПУ", "Покраска", "Фрезеровка",
  "Шпонировка", "Сборка", "Упаковка"
];

let currentStation = stations[0];

// === Загрузка при старте ===
document.addEventListener('DOMContentLoaded', () => {
  renderStations();
  loadOrders();
});

// === Рендер участков ===
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

  const { data } = await query.order('created_at', { ascending: false });
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

// === Админка ===
document.getElementById('admin-btn').addEventListener('click', () => {
  const pass = prompt('Админ-пароль:');
  if (pass !== 'admin123') {
    alert('Неверный пароль');
    return;
  }
  alert('Админка пока не реализована. Управление участниками — в коде или через Supabase SQL.');
});
