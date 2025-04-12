/**
 * Форматирует дату ISO в читаемый формат
 * @param {string} isoString - ISO строка даты
 * @param {boolean} includeTime - Включать ли время в результат
 * @returns {string} - Отформатированная строка даты
 */
export const formatDate = (isoString, includeTime = false) => {
    if (!isoString) return '—';
    
    try {
      const date = new Date(isoString);
      
      const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...(includeTime && {
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      
      return date.toLocaleString('ru-RU', options);
    } catch (e) {
      console.error('Ошибка форматирования даты:', e);
      return '—';
    }
  };