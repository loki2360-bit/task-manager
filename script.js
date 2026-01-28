// === Настройки Supabase ===
// ⚠️ ЗАМЕНИТЕ НА ВАШИ КЛЮЧИ ИЗ SUPABASE
const SUPABASE_URL = 'https://ваш-проект.supabase.co';
const SUPABASE_ANON_KEY = 'ваш-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === DOM-элементы ===
const searchInput = document.getElementById('search-input');
const orderNumberInput = document.getElementById('order-number');
const itemTypeSelect = document.getElementById('item-type');
const workstationSelect = document.getElementById('workstation');
const createBtn = document.getElementById('create-btn');
const itemsList = document.getElementById('items-list');

// === Загрузка данных из Supabase ===
async function loadItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('order_number', { ascending: true })
    .order('item_type', { ascending: true });

  if (error) {
    console.error('Ошибка загрузки данных:', error);
    itemsList.innerHTML = '<p style="color:red;">Ошибка подключения к базе</p>';
    return;
  }

  renderItems(data || []);
}

// === Отображение списка позиций ===
function renderItems(items) {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const filtered = items.filter(item =>
    item.order_number.toLowerCase().includes(searchTerm)
  );

  if (filtered.length === 0) {
    itemsList.innerHTML = '<p>Нет записей</p>';
    return;
  }

  itemsList.innerHTML = filtered.map(item => `
    <div class="item-row" data-id="${item.id}">
      <div>
        <strong>${escapeHtml(item.order_number)}</strong>
        <div class="item-type">${escapeHtml(item.item_type)}</div>
      </div>
      <select onchange="moveItem('${item.id}', this.value)">
        ${['распил', 'чпу', 'фанеровка', 'шлифовка', 'сборка', 'покраска', 'пвх', 'упаковка']
          .map(ws => `<option value="${ws}" ${ws === item.current_workstation ? 'selected' : ''}>${ws}</option>`)
          .join('')}
      </select>
    </div>
  `).join('');
}

// === Защита от XSS ===
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === Создание новой записи ===
createBtn.addEventListener('click', async () => {
  const order = orderNumberInput.value.trim();
  const type = itemTypeSelect.value;
  const ws = workstationSelect.value;

  if (!order) {
    alert('Введите номер заказа');
    return;
  }

  const { error } = await supabase.from('items').insert({
    order_number: order,
    item_type: type,
    current_workstation: ws
  });

  if (error) {
    console.error('Ошибка создания:', error);
    alert('Не удалось создать запись');
  } else {
    // Оставляем номер для быстрого добавления следующей позиции
    itemTypeSelect.value = 'наружняя панель';
    workstationSelect.value = 'распил';
    loadItems();
  }
});

// === Перемещение позиции ===
window.moveItem = async (id, newWs) => {
  const { error } = await supabase
    .from('items')
    .update({ current_workstation: newWs })
    .eq('id', id);

  if (error) {
    console.error('Ошибка перемещения:', error);
    alert('Не удалось переместить');
  } else {
    loadItems();
  }
};

// === Поиск в реальном времени ===
searchInput.addEventListener('input', loadItems);

// === Инициализация приложения ===
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
});
