document.addEventListener('DOMContentLoaded', () => {
  // --- ПРОВЕРКА ЗАГРУЗКИ ---
  if (typeof createClient !== 'function') {
    console.error('❌ Supabase SDK не загружен! Проверьте index.html.');
    alert('Ошибка: Supabase не подключён. Обратитесь к разработчику.');
    return;
  }

  // ⚠️ ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ!
  const SUPABASE_URL = 'https://zitdekerfjocbulmfuyo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_41ROEqZ74QbA4B6_JASt4w_DeRDGXWR';

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const createBtn = document.getElementById('create-btn');
  const itemsList = document.getElementById('items-list');
  const orderInput = document.getElementById('order-number');
  const typeSelect = document.getElementById('item-type');
  const wsSelect = document.getElementById('workstation');

  async function loadItems() {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('order_number', { ascending: true })
        .order('item_type', { ascending: true });

      if (error) throw error;

      itemsList.innerHTML = data.length
        ? data.map(item => `
            <div class="item-row">
              <div><strong>${item.order_number}</strong> • ${item.item_type}</div>
              <select onchange="moveItem('${item.id}', this.value)">
                ${['распил','чпу','фанеровка','шлифовка','сборка','покраска','пвх','упаковка']
                  .map(ws => `<option value="${ws}" ${ws === item.current_workstation ? 'selected' : ''}>${ws}</option>`)
                  .join('')}
              </select>
            </div>
          `).join('')
        : '<p>Нет записей</p>';
    } catch (err) {
      console.error('Загрузка:', err);
      itemsList.innerHTML = `<p style="color:red;">Ошибка: ${err.message}</p>`;
    }
  }

  window.moveItem = async (id, ws) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ current_workstation: ws })
        .eq('id', id);
      if (!error) loadItems();
    } catch (err) {
      console.error('Перемещение:', err);
    }
  };

  createBtn.addEventListener('click', async () => {
    const order = (orderInput.value || '').trim();
    const type = typeSelect.value;
    const ws = wsSelect.value;

    if (!order) {
      alert('Введите номер заказа');
      return;
    }

    try {
      const { error } = await supabase.from('items').insert({
        order_number: order,
        item_type: type,
        current_workstation: ws
      });
      if (!error) {
        typeSelect.value = 'наружняя панель';
        wsSelect.value = 'распил';
        loadItems();
      }
    } catch (err) {
      console.error('Создание:', err);
      alert('Ошибка создания');
    }
  });

  loadItems();
});
