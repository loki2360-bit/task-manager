// === Supabase config ===
const SUPABASE_URL = 'https://zitdekerfjocbulmfuyo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_41ROEqZ74QbA4B6_JASt4w_DeRDGXWR';

// Создаем клиент Supabase — только один раз!
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Участки ===
const stations = ["Распил", "ЧПУ", "Покраска", "Фрезеровка", "Шпонировка", "Сборка", "Упаковка"];

let currentStation = stations[0];

// === DOM элементы ===
const stationsList = document.getElementById('stations-list');
const ordersContainer = document.getElementById('orders-container');
const orderInput = document.getElementById('order-input');
const addOrderBtn = document.getElementById('add-order');
const searchInput = document.getElementById('search-input');
const adminBtn = document.getElementById('admin-btn');

// === Загрузка при старте ===
document.addEventListener('DOMContentLoaded', () => {
  renderStations();
  loadOrders();
});

// === Рендер участков с счётчиками ===
async function renderStations() {
  const counts = {};
  stations.forEach(s => counts[s] = 0);

  try {
    const { data } = await supabase.from('orders').select('station');
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
      
      // Выделяем активную станцию другим стилем
      if (station === currentStation) {
        li.classList.add('active');
      }
      
      li.addEventListener('click', () => {
        currentStation = station;
        renderStations(); // Перерисуем станции заново
        loadOrders(); // Обновляем заказы
      });
      stationsList.appendChild(li);
    });
  } catch (err) {
    console.error("Ошибка загрузки данных:", err);
    alert("Ошибка при загрузке данных.");
  }
}

// === Загрузка заказов ===
async function loadOrders(searchTerm = null) {
  let query = supabase.from('orders').select('*');

  if (searchTerm) {
    query = query.ilike('order_id', `%${searchTerm}%`);
  } else {
    query = query.eq('station', currentStation);
  }

  try {
    const { data } = await query.order('created_at', { ascending: false });
    renderOrders(data || []);
  } catch (err) {
    console.error("Ошибка загрузки заказов:", err);
    alert("Ошибка при загрузке заказов.");
  }
}

// === Отображение заказов ===
function renderOrders(ordersList) {
  const container = document.getElementById('orders-container');
  container.innerHTML = '';

  if (ordersList.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#666;">Нет задач</p>';
    return;
  }

  // Создаем прокручиваемый контейнер
  const scrollable = document.createElement('div');
  scrollable.className = 'orders-list';

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
    scrollable.appendChild(card);
  });

  container.appendChild(scrollable);
}

// === Добавление заказа ===
addOrderBtn.addEventListener('click', async () => {
  const orderId = orderInput.value.trim();

  // Проверяем корректность ввода
  if (!/^\d+$/.test(orderId)) {
    alert('Номер заказа должен быть целым положительным числом!');
    return;
  }

  try {
    const { error } = await supabase.from('orders').insert({
      order_id: orderId,
      station: stations[0]
    });

    if (error) throw error;

    orderInput.value = ''; // очищаем поле ввода
    if (currentStation === stations[0]) loadOrders();
    renderStations();
  } catch (err) {
    console.error("Ошибка добавления заказа:", err);
    alert("Ошибка при добавлении заказа.");
  }
});

// === Поиск ===
searchInput.addEventListener('input', (e) => {
  loadOrders(e.target.value.trim());
});

// === Диалог перемещения заказа ===
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

// === Подтверждение переноса заказа ===
async function confirmMove(orderId, newStation) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ station: newStation })
      .eq('id', orderId);

    if (error) throw error;

    document.getElementById('move-modal')?.remove();
    loadOrders();
    renderStations();
  } catch (err) {
    console.error("Ошибка перемещения заказа:", err);
    alert("Ошибка при перемещении заказа.");
  }
}

// === Закрытие заказа ===
async function closeOrder(orderId) {
  if (!confirm('Вы уверены, что хотите закрыть заказ?')) return;

  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;

    loadOrders();
    renderStations();
  } catch (err) {
    console.error("Ошибка закрытия заказа:", err);
    alert("Ошибка при закрытии заказа.");
  }
}

// === Авторизация администратора (безопасность)
adminBtn.addEventListener('click', () => {
  const pass = prompt('Пароль администратора:');
  if (!pass) return alert('Необходимо ввести пароль.');

  // Здесь должно происходить обращение к API или другому способу проверки пароля.
  // В данном примере оставляю проверку локально, но настоятельно рекомендую убрать её отсюда.
  if (pass !== 'admin123') {
    alert('Неверный пароль');
    return;
  }

  alert('Доступ разрешен. Сейчас управление через API.');
});
