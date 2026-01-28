// === ПРОВЕРКА ЗАГРУЗКИ SUPABASE ===
if (typeof createClient !== 'function') {
  console.error('❌ Supabase SDK не загружен!');
  alert('Ошибка: Supabase не подключён. Проверьте index.html.');
  throw new Error('Supabase not loaded');
}

// === НАСТРОЙКИ ===
const SUPABASE_URL = 'https://ваш-проект.supabase.co';
const SUPABASE_ANON_KEY = 'ваш-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === ОСНОВНАЯ ЛОГИКА ===
document.addEventListener('DOMContentLoaded', async () => {
  const itemsList = document.getElementById('items-list');
  if (!itemsList) return;

  try {
    const { data, error } = await supabase.from('items').select('*');
    if (error) throw error;

    itemsList.innerHTML = data.length
      ? data.map(item => `<div>${item.order_number} — ${item.item_type} → ${item.current_workstation}</div>`).join('')
      : '<p>Нет записей</p>';
  } catch (err) {
    console.error('Ошибка:', err);
    itemsList.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
});
